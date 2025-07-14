
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  pattern_stage?: string;
  breakout_zone?: number;
  risk_area?: number;
  volume_drop_percent?: number;
  remarks?: string;
}

// Enhanced stock universes
const NSE_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'KOTAKBANK', 'BHARTIARTL',
  'LT', 'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'AXISBANK', 'ULTRACEMCO', 'TITAN', 'WIPRO',
  'TECHM', 'HCLTECH', 'POWERGRID', 'SUNPHARMA', 'BAJFINANCE', 'SBIN', 'HDFCLIFE', 'ADANIPORTS',
  'COALINDIA', 'DRREDDY', 'BAJAJFINSV', 'NTPC', 'ONGC', 'ITC', 'INDUSINDBK', 'CIPLA',
  'GRASIM', 'JSWSTEEL', 'TATASTEEL', 'BRITANNIA', 'APOLLOHOSP', 'DIVISLAB', 'EICHERMOT',
  'HEROMOTOCO', 'TATAMOTORS', 'BAJAJ-AUTO', 'HINDALCO', 'BPCL', 'TATACONSUM', 'SHREECEM',
  'ADANIENT', 'ADANIGREEN', 'NAUKRI', 'VEDL', 'GODREJCP', 'SIEMENS', 'DMART', 'PIDILITIND',
  'COLPAL', 'MARICO', 'BERGEPAINT', 'DABUR', 'LUPIN', 'GLAND', 'INDIGO', 'MCDOWELL-N',
  'TORNTPHARM', 'BIOCON', 'MOTHERSUMI', 'BOSCHLTD', 'HAVELLS', 'PAGEIND', 'AMBUJACEM',
  'ACC', 'MPHASIS', 'BANKBARODA', 'PEL', 'INDIAMART', 'CONCOR', 'NMDC', 'SAIL',
  'NATIONALUM', 'HINDZINC', 'JINDALSTEL', 'TATAPOWER', 'PFC', 'RECLTD', 'IRCTC', 'VOLTAS'
];

const BSE_STOCKS = [
  'KAJARIACER', 'ORIENTCEM', 'PRISMJOHNS', 'SKFINDIA', 'TIMKEN', 'GRINDWELL', 'CARBORUNIV',
  'FINEORG', 'EIDPARRY', 'BALRAMCHIN', 'DALBHARAT', 'SHREERENUKA', 'BAJAJCON', 'IPCALAB',
  'GLENMARK', 'NATCOPHARM', 'STRIDES', 'APLLTD', 'MANEINDUS', 'PRISMCEM', 'SOMANYCER'
];

// Enhanced SSL-safe fetch with multiple retry strategies
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  const defaultOptions: RequestInit = {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      ...options.headers
    },
    signal: AbortSignal.timeout(25000),
    ...options
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, defaultOptions);
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All retry attempts failed');
}

// Enhanced data fetching with multiple APIs
async function fetchStockData(symbol: string, exchange: string): Promise<StockData[]> {
  console.log(`🔍 Fetching data for ${symbol} (${exchange})`);
  
  // Try Yahoo Finance first (no API key needed)
  try {
    const yahooData = await fetchFromYahooFinance(symbol, exchange);
    if (yahooData && yahooData.length >= 200) {
      console.log(`✅ Yahoo Finance SUCCESS: ${yahooData.length} records for ${symbol}`);
      return yahooData;
    }
  } catch (error) {
    console.warn(`⚠️ Yahoo Finance failed for ${symbol}: ${error.message}`);
  }
  
  // Try Alpha Vantage if API key is available
  const alphaKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  if (alphaKey) {
    try {
      const alphaData = await fetchFromAlphaVantage(symbol, exchange, alphaKey);
      if (alphaData && alphaData.length >= 200) {
        console.log(`✅ Alpha Vantage SUCCESS: ${alphaData.length} records for ${symbol}`);
        return alphaData;
      }
    } catch (error) {
      console.warn(`⚠️ Alpha Vantage failed for ${symbol}: ${error.message}`);
    }
  }
  
  // Try Twelve Data if API key is available
  const twelveKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (twelveKey) {
    try {
      const twelveData = await fetchFromTwelveData(symbol, exchange, twelveKey);
      if (twelveData && twelveData.length >= 200) {
        console.log(`✅ Twelve Data SUCCESS: ${twelveData.length} records for ${symbol}`);
        return twelveData;
      }
    } catch (error) {
      console.warn(`⚠️ Twelve Data failed for ${symbol}: ${error.message}`);
    }
  }
  
  throw new Error(`❌ All APIs failed for ${symbol}`);
}

async function fetchFromYahooFinance(symbol: string, exchange: string): Promise<StockData[]> {
  const yahooSymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2y&interval=1d`;
  
  const response = await fetchWithRetry(url, {
    headers: {
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com'
    }
  });
  
  const data = await response.json();
  
  if (!data.chart?.result?.[0]) {
    throw new Error('No chart data in Yahoo response');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  
  if (!timestamps || !quote) {
    throw new Error('Missing timestamps or quote data from Yahoo');
  }
  
  const stocks: StockData[] = [];
  for (let i = 0; i < Math.min(timestamps.length, 500); i++) {
    if (quote.open[i] != null && quote.high[i] != null && 
        quote.low[i] != null && quote.close[i] != null) {
      stocks.push({
        symbol,
        exchange,
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: parseFloat(quote.open[i].toFixed(2)),
        high: parseFloat(quote.high[i].toFixed(2)),
        low: parseFloat(quote.low[i].toFixed(2)),
        close: parseFloat(quote.close[i].toFixed(2)),
        volume: parseInt(quote.volume[i]) || 100000
      });
    }
  }
  
  return stocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function fetchFromAlphaVantage(symbol: string, exchange: string, apiKey: string): Promise<StockData[]> {
  const suffix = exchange === 'NSE' ? '.NSE' : '.BSE';
  const url = `https://www.alphavantage.co/query?function=DAILY&symbol=${symbol}${suffix}&apikey=${apiKey}&outputsize=full`;
  
  const response = await fetchWithRetry(url);
  const data = await response.json();
  
  if (data['Error Message'] || data['Note'] || !data['Time Series (Daily)']) {
    throw new Error(`Alpha Vantage API Error: ${data['Error Message'] || data['Note'] || 'No data'}`);
  }
  
  const timeSeries = data['Time Series (Daily)'];
  const stocks = Object.entries(timeSeries).slice(0, 500).map(([date, values]: [string, any]) => ({
    symbol,
    exchange,
    date,
    open: parseFloat(values['1. open']),
    high: parseFloat(values['2. high']),
    low: parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
    volume: parseInt(values['5. volume']) || 100000
  }));
  
  return stocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function fetchFromTwelveData(symbol: string, exchange: string, apiKey: string): Promise<StockData[]> {
  const symbolSuffix = exchange === 'NSE' ? `${symbol}.NSE` : `${symbol}.BSE`;
  const url = `https://api.twelvedata.com/time_series?symbol=${symbolSuffix}&interval=1day&outputsize=500&apikey=${apiKey}`;
  
  const response = await fetchWithRetry(url);
  const data = await response.json();
  
  if (data.status === 'error' || !data.values || !Array.isArray(data.values)) {
    throw new Error(`Twelve Data API Error: ${data.message || 'No valid data'}`);
  }
  
  const stocks = data.values.map((item: any) => ({
    symbol,
    exchange,
    date: item.datetime,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseInt(item.volume) || 100000
  }));
  
  return stocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Technical indicator calculations
function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  
  const k = 2 / (period + 1);
  let ema = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  
  return ema;
}

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

// Enhanced VCP Pattern Detection with Stage Analysis
function detectVCPPattern(stockHistory: StockData[]): VCPResult | null {
  if (stockHistory.length < 250) return null;
  
  const latest = stockHistory[stockHistory.length - 1];
  const closes = stockHistory.map(d => d.close);
  const volumes = stockHistory.map(d => d.volume);
  const highs = stockHistory.map(d => d.high);
  const lows = stockHistory.map(d => d.low);
  
  try {
    // Basic quality filters
    if (latest.close < 50) return null;
    
    const dailyTurnover = latest.close * latest.volume;
    if (dailyTurnover < 5000000) return null;
    
    // 52-week high analysis
    const high52Week = Math.max(...closes.slice(-252));
    const percentFrom52WHigh = ((latest.close - high52Week) / high52Week) * 100;
    if (percentFrom52WHigh < -30) return null;
    
    // EMA calculations
    const ema10 = calculateEMA(closes, 10);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const ema150 = calculateEMA(closes, 150);
    const ema200 = calculateEMA(closes, 200);
    
    if (!ema10 || !ema21 || !ema50 || !ema150 || !ema200) return null;
    
    // Trend structure
    if (!(ema10 > ema21 && ema21 > ema50 && ema50 > ema150 && ema150 > ema200)) {
      return null;
    }
    
    if (latest.close < ema21 * 0.95) return null;
    
    // Volatility contraction
    const currentATR = calculateATR(stockHistory.slice(-21), 14);
    const previousATR = calculateATR(stockHistory.slice(-50, -21), 14);
    
    if (!currentATR || !previousATR) return null;
    
    const atrContractionPercent = (1 - currentATR/previousATR) * 100;
    if (atrContractionPercent < 15) return null;
    
    // Volume analysis
    const volumeAvg10 = calculateSMA(volumes.slice(-10), 10);
    const volumeAvg20 = calculateSMA(volumes.slice(-20), 20);
    const volumeAvg50 = calculateSMA(volumes.slice(-50), 50);
    
    if (!volumeAvg10 || !volumeAvg20 || !volumeAvg50) return null;
    
    // Volume drop calculation
    const volumeDropPercent = ((volumeAvg50 - volumeAvg10) / volumeAvg50) * 100;
    
    if (volumeAvg10 > volumeAvg20 * 1.5) return null;
    
    // Price consolidation
    const recent21Highs = highs.slice(-21);
    const recent21Lows = lows.slice(-21);
    const consolidationHigh = Math.max(...recent21Highs);
    const consolidationLow = Math.min(...recent21Lows);
    const consolidationRange = consolidationHigh - consolidationLow;
    const consolidationPercent = consolidationRange / latest.close;
    
    if (consolidationPercent > 0.25 || consolidationPercent < 0.05) return null;
    
    // Stage analysis
    let patternStage = "Stage 1";
    let remarks = "Base Forming";
    
    const distanceFromHigh = Math.abs(percentFrom52WHigh);
    if (distanceFromHigh < 5) {
      patternStage = "Stage 3";
      remarks = "Near Breakout";
    } else if (distanceFromHigh < 15) {
      patternStage = "Stage 2";
      remarks = "VCP Stage 2";
    }
    
    // Breakout analysis
    const high21Day = Math.max(...highs.slice(-22, -1));
    const breakoutSignal = latest.close > high21Day && latest.volume > volumeAvg20 * 1.3;
    
    if (breakoutSignal) {
      remarks = "Breakout Confirmed";
      patternStage = "Breakout";
    }
    
    // Risk and breakout zones
    const breakoutZone = consolidationHigh * 1.02;
    const riskArea = consolidationLow * 0.98;
    
    console.log(`🎯 VCP PATTERN DETECTED: ${latest.symbol} (${latest.exchange}) - Stage: ${patternStage}`);
    
    return {
      symbol: latest.symbol,
      exchange: latest.exchange,
      close_price: latest.close,
      volume: latest.volume,
      percent_from_52w_high: Math.round(percentFrom52WHigh * 100) / 100,
      atr_14: Math.round(currentATR * 10000) / 10000,
      ema_50: Math.round(ema50 * 100) / 100,
      ema_150: Math.round(ema150 * 100) / 100,
      ema_200: Math.round(ema200 * 100) / 100,
      volume_avg_20: Math.round(volumeAvg20),
      breakout_signal: breakoutSignal,
      volatility_contraction: Math.round(consolidationPercent * 10000) / 10000,
      scan_date: latest.date,
      pattern_stage: patternStage,
      breakout_zone: Math.round(breakoutZone * 100) / 100,
      risk_area: Math.round(riskArea * 100) / 100,
      volume_drop_percent: Math.round(volumeDropPercent * 100) / 100,
      remarks: remarks
    };
    
  } catch (error) {
    console.error(`❌ VCP analysis error for ${latest.symbol}: ${error.message}`);
    return null;
  }
}

function getCurrentTradingDate(): string {
  const now = new Date();
  const today = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // IST
  
  if (today.getDay() === 0) { // Sunday
    today.setDate(today.getDate() - 2);
  } else if (today.getDay() === 6) { // Saturday
    today.setDate(today.getDate() - 1);
  }
  
  return today.toISOString().split('T')[0];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 LAUNCHING ULTIMATE VCP MARKET SCANNER v10.0! 🚀');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const customStocks = body.stocks || [];
    const scanType = body.scanType || 'full';

    const scanStartTime = Date.now();
    const scanDate = getCurrentTradingDate();
    
    console.log(`📅 Trading Date: ${scanDate}`);
    console.log(`🔍 Scan Type: ${scanType}`);
    
    // Determine stock universe
    let stocksToScan;
    if (scanType === 'custom' && customStocks.length > 0) {
      stocksToScan = customStocks.slice(0, 200).map((stock: any) => ({
        symbol: stock.symbol || stock,
        exchange: stock.exchange || 'NSE'
      }));
      console.log(`📊 Custom scan: ${stocksToScan.length} stocks`);
    } else {
      // Full market scan
      const nseStocks = NSE_STOCKS.map(symbol => ({ symbol, exchange: 'NSE' }));
      const bseStocks = BSE_STOCKS.map(symbol => ({ symbol, exchange: 'BSE' }));
      stocksToScan = [...nseStocks, ...bseStocks];
      console.log(`📊 Full market scan: ${stocksToScan.length} stocks (NSE: ${NSE_STOCKS.length}, BSE: ${BSE_STOCKS.length})`);
    }

    const vcpResults: VCPResult[] = [];
    let totalProcessed = 0;
    let successfulDataFetches = 0;
    let realDataFetches = 0;
    let vcpPatternsFound = 0;
    let apiErrors = 0;

    console.log('🔍 Starting VCP Market Scan...');
    
    // Process in batches
    const batchSize = 5;
    const totalBatches = Math.ceil(stocksToScan.length / batchSize);
    
    for (let i = 0; i < stocksToScan.length; i += batchSize) {
      const batch = stocksToScan.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      
      console.log(`📊 Processing Batch ${batchNum}/${totalBatches} (${batch.length} stocks)`);
      
      const batchPromises = batch.map(async (stock: any) => {
        try {
          totalProcessed++;
          
          const stockData = await fetchStockData(stock.symbol, stock.exchange);
          
          if (stockData.length >= 200) {
            successfulDataFetches++;
            realDataFetches++;
            
            const vcpResult = detectVCPPattern(stockData);
            if (vcpResult) {
              vcpPatternsFound++;
              console.log(`✅ VCP FOUND: ${stock.symbol} (${stock.exchange}) - ${vcpResult.pattern_stage}`);
              return vcpResult;
            }
          }
          
          return null;
        } catch (error) {
          apiErrors++;
          console.error(`❌ Error for ${stock.symbol}: ${error.message}`);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      const validResults = batchResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<VCPResult>).value);
      
      vcpResults.push(...validResults);
      
      // Progress reporting
      const progress = (totalProcessed / stocksToScan.length * 100).toFixed(1);
      const eta = ((Date.now() - scanStartTime) / totalProcessed * (stocksToScan.length - totalProcessed) / 1000 / 60).toFixed(1);
      
      console.log(`📈 Progress: ${progress}% | VCP Found: ${vcpPatternsFound} | ETA: ${eta}min`);
      
      // Pause between batches
      if (batchNum < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const scanDurationSeconds = Math.floor((Date.now() - scanStartTime) / 1000);
    const processingRate = Math.round(totalProcessed / Math.max(scanDurationSeconds, 1) * 60);
    const successRate = ((vcpPatternsFound / Math.max(successfulDataFetches, 1)) * 100).toFixed(2);
    const realDataPercentage = ((realDataFetches / Math.max(totalProcessed, 1)) * 100).toFixed(1);
    
    console.log('🎉 VCP MARKET SCAN COMPLETED! 🎉');
    console.log(`📊 Total Processed: ${totalProcessed} stocks`);
    console.log(`🎯 VCP PATTERNS FOUND: ${vcpResults.length} stocks`);
    console.log(`⚡ Success Rate: ${successRate}% | Processing: ${processingRate} stocks/min`);

    // Save scan metadata
    try {
      const { error: metadataError } = await supabase
        .from('scan_metadata')
        .insert({
          scan_date: scanDate,
          scan_type: scanType === 'custom' ? 'VCP_CUSTOM_SCAN' : 'VCP_COMPREHENSIVE_MARKET_SCAN',
          total_stocks_scanned: totalProcessed,
          filtered_results_count: vcpResults.length,
          scan_duration_seconds: scanDurationSeconds,
          status: 'completed'
        });

      if (metadataError) {
        console.error('❌ Metadata save error:', metadataError);
      } else {
        console.log('✅ Scan metadata saved successfully');
      }
    } catch (err) {
      console.error('❌ Metadata save failed:', err);
    }

    // Save results
    try {
      // Clear old results for this scan type
      const { error: deleteError } = await supabase
        .from('vcp_scan_results')
        .delete()
        .gte('scan_date', scanDate);

      if (deleteError) {
        console.error('❌ Delete old results error:', deleteError);
      }

      // Save new results
      if (vcpResults.length > 0) {
        const insertBatchSize = 50;
        let savedCount = 0;
        
        for (let i = 0; i < vcpResults.length; i += insertBatchSize) {
          const insertBatch = vcpResults.slice(i, i + insertBatchSize);
          const { error: insertError } = await supabase
            .from('vcp_scan_results')
            .insert(insertBatch);

          if (insertError) {
            console.error(`❌ Insert batch error:`, insertError);
          } else {
            savedCount += insertBatch.length;
          }
        }
        
        console.log(`💾 SAVED: ${savedCount}/${vcpResults.length} VCP results to database`);
      }
    } catch (err) {
      console.error('❌ Database operations failed:', err);
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        scan_date: scanDate,
        scan_type: scanType,
        results_count: vcpResults.length,
        total_scanned: totalProcessed,
        successful_scans: successfulDataFetches,
        real_data_fetches: realDataFetches,
        scan_duration_seconds: scanDurationSeconds,
        processing_rate: processingRate,
        success_rate: successRate + '%',
        real_data_percentage: realDataPercentage + '%',
        api_errors: apiErrors,
        results: vcpResults,
        scan_summary: {
          nse_stocks: scanType === 'custom' ? 'Custom' : NSE_STOCKS.length,
          bse_stocks: scanType === 'custom' ? 'Custom' : BSE_STOCKS.length,
          total_universe: stocksToScan.length,
          vcp_patterns_found: vcpResults.length,
          real_data_coverage: realDataPercentage + '%'
        },
        message: `🚀 ULTIMATE VCP MARKET SCAN v10.0 COMPLETE! 
        
📊 PROCESSED: ${totalProcessed} stocks
🎯 VCP PATTERNS FOUND: ${vcpResults.length} high-quality stocks
⚡ SUCCESS RATE: ${successRate}%
📡 REAL DATA: ${realDataPercentage}% from live APIs
📅 SCAN DATE: ${scanDate}
⏱️ DURATION: ${Math.floor(scanDurationSeconds/60)}m ${scanDurationSeconds%60}s
🔥 PROCESSING RATE: ${processingRate} stocks/minute

Enhanced Mark Minervini VCP Algorithm v10.0 with pattern stage analysis!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 VCP SCANNER ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'VCP Scanner v10.0 encountered an error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
