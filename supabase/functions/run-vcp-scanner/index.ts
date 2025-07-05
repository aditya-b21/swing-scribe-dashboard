
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VCP Scanner Algorithm Implementation
interface StockData {
  symbol: string;
  exchange: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface VCPResult {
  symbol: string;
  exchange: string;
  close_price: number;
  volume: number;
  percent_from_52w_high: number | null;
  atr_14: number | null;
  ema_50: number | null;
  ema_150: number | null;
  ema_200: number | null;
  volume_avg_20: number | null;
  breakout_signal: boolean;
  volatility_contraction: number | null;
  scan_date: string;
}

// Calculate Simple Moving Average
function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const sum = values.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Calculate Exponential Moving Average
function calculateEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  
  const k = 2 / (period + 1);
  let ema = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  
  return ema;
}

// Calculate Average True Range
function calculateATR(data: StockData[], period: number): number | null {
  if (data.length < period + 1) return null;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return calculateSMA(trueRanges, period);
}

// VCP Filtering Algorithm
function applyVCPFilters(stockHistory: StockData[]): VCPResult | null {
  if (stockHistory.length < 252) return null; // Need at least 1 year of data
  
  const latest = stockHistory[stockHistory.length - 1];
  const closes = stockHistory.map(d => d.close);
  const volumes = stockHistory.map(d => d.volume);
  const highs = stockHistory.map(d => d.high);
  const lows = stockHistory.map(d => d.low);
  
  // 1. Daily ATR(14) < 10 days ago Daily ATR(14)
  const currentATR = calculateATR(stockHistory.slice(-15), 14);
  const atr10DaysAgo = calculateATR(stockHistory.slice(-25, -10), 14);
  
  if (!currentATR || !atr10DaysAgo || currentATR >= atr10DaysAgo) return null;
  
  // 2. Daily ATR(14) / Daily Close < 0.08
  if (currentATR / latest.close >= 0.08) return null;
  
  // 3. Daily Close > (Weekly Max(52, Weekly Close) * 0.75)
  const max52WeekClose = Math.max(...closes.slice(-252));
  if (latest.close <= max52WeekClose * 0.75) return null;
  
  // 4. EMA(Close, 50) > EMA(Close, 150)
  const ema50 = calculateEMA(closes, 50);
  const ema150 = calculateEMA(closes, 150);
  const ema200 = calculateEMA(closes, 200);
  
  if (!ema50 || !ema150 || !ema200 || ema50 <= ema150) return null;
  
  // 5. EMA(Close, 150) > EMA(Close, 200)
  if (ema150 <= ema200) return null;
  
  // 6. Close > EMA(Close, 50)
  if (latest.close <= ema50) return null;
  
  // 7. Close > 10
  if (latest.close <= 10) return null;
  
  // 8. Close * Volume > 100000000 (1 Cr)
  if (latest.close * latest.volume <= 100000000) return null;
  
  // 9. Volume < SMA(Volume, 20)
  const volumeAvg20 = calculateSMA(volumes, 20);
  if (!volumeAvg20 || latest.volume >= volumeAvg20) return null;
  
  // 10. (Max(5 days High) - Min(5 days Low)) / Close < 0.08
  const recent5Highs = highs.slice(-5);
  const recent5Lows = lows.slice(-5);
  const maxRecent5High = Math.max(...recent5Highs);
  const minRecent5Low = Math.min(...recent5Lows);
  const volatilityContraction = (maxRecent5High - minRecent5Low) / latest.close;
  
  if (volatilityContraction >= 0.08) return null;
  
  // 11. Close crosses above Max(20, High) - Breakout Signal
  const max20High = Math.max(...highs.slice(-21, -1)); // Previous 20 days
  const breakoutSignal = latest.close > max20High;
  
  // 12. Volume > 1.5 * SMA(Volume, 20) - Enhanced breakout confirmation
  const enhancedBreakout = breakoutSignal && latest.volume > 1.5 * volumeAvg20;
  
  const percentFrom52WHigh = ((latest.close - max52WeekClose) / max52WeekClose) * 100;
  
  return {
    symbol: latest.symbol,
    exchange: latest.exchange,
    close_price: latest.close,
    volume: latest.volume,
    percent_from_52w_high: percentFrom52WHigh,
    atr_14: currentATR,
    ema_50: ema50,
    ema_150: ema150,
    ema_200: ema200,
    volume_avg_20: Math.round(volumeAvg20),
    breakout_signal: enhancedBreakout,
    volatility_contraction: volatilityContraction,
    scan_date: latest.date
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { scan_date } = await req.json();
    const scanStartTime = Date.now();
    
    console.log(`Starting VCP Scanner for date: ${scan_date}`);

    // For demo purposes, we'll create some mock data
    // In production, you would fetch real data from NSE/BSE APIs
    const mockStockSymbols = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR',
      'ICICIBANK', 'KOTAKBANK', 'BHARTIARTL', 'LT', 'ASIANPAINT',
      'MARUTI', 'NESTLEIND', 'AXISBANK', 'ULTRACEMCO', 'TITAN',
      'WIPRO', 'TECHM', 'HCLTECH', 'POWERGRID', 'SUNPHARMA'
    ];

    const allResults: VCPResult[] = [];
    let totalScanned = 0;

    // Generate mock historical data and apply VCP filters
    for (const symbol of mockStockSymbols) {
      totalScanned++;
      
      // Generate mock historical data (252 days)
      const mockHistory: StockData[] = [];
      let basePrice = Math.random() * 2000 + 100; // Random price between 100-2100
      
      for (let i = 0; i < 252; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (252 - i));
        
        const volatility = Math.random() * 0.05; // 5% volatility
        const change = (Math.random() - 0.5) * volatility;
        basePrice = basePrice * (1 + change);
        
        const open = basePrice;
        const high = open * (1 + Math.random() * 0.03);
        const low = open * (1 - Math.random() * 0.03);
        const close = low + Math.random() * (high - low);
        const volume = Math.floor(Math.random() * 10000000) + 100000;
        
        mockHistory.push({
          symbol,
          exchange: Math.random() > 0.5 ? 'NSE' : 'BSE',
          date: date.toISOString().split('T')[0],
          open,
          high,
          low,
          close,
          volume
        });
      }
      
      // Apply VCP filters
      const vcpResult = applyVCPFilters(mockHistory);
      if (vcpResult) {
        allResults.push(vcpResult);
      }
    }

    const scanDuration = Math.floor((Date.now() - scanStartTime) / 1000);
    
    console.log(`Scan completed: ${allResults.length} results from ${totalScanned} stocks in ${scanDuration}s`);

    // Save scan metadata
    const { error: metadataError } = await supabase
      .from('scan_metadata')
      .insert({
        scan_date,
        scan_type: 'VCP',
        total_stocks_scanned: totalScanned,
        filtered_results_count: allResults.length,
        scan_duration_seconds: scanDuration,
        status: 'completed'
      });

    if (metadataError) {
      console.error('Error saving metadata:', metadataError);
    }

    // Clear previous results for the same date
    await supabase
      .from('vcp_scan_results')
      .delete()
      .eq('scan_date', scan_date);

    // Save new results
    if (allResults.length > 0) {
      const { error: resultsError } = await supabase
        .from('vcp_scan_results')
        .insert(allResults);

      if (resultsError) {
        console.error('Error saving results:', resultsError);
        throw resultsError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results_count: allResults.length,
        total_scanned: totalScanned,
        scan_duration: scanDuration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('VCP Scanner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
