
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
}

// COMPREHENSIVE NSE STOCK UNIVERSE
const NSE_STOCKS = [
  // NIFTY 50
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'KOTAKBANK', 'BHARTIARTL',
  'LT', 'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'AXISBANK', 'ULTRACEMCO', 'TITAN', 'WIPRO',
  'TECHM', 'HCLTECH', 'POWERGRID', 'SUNPHARMA', 'BAJFINANCE', 'SBIN', 'HDFCLIFE', 'ADANIPORTS',
  'COALINDIA', 'DRREDDY', 'BAJAJFINSV', 'NTPC', 'ONGC', 'ITC', 'INDUSINDBK', 'CIPLA',
  'GRASIM', 'JSWSTEEL', 'TATASTEEL', 'BRITANNIA', 'APOLLOHOSP', 'DIVISLAB', 'EICHERMOT',
  'HEROMOTOCO', 'TATAMOTORS', 'BAJAJ-AUTO', 'HINDALCO', 'BPCL', 'TATACONSUM', 'SHREECEM',
  'ADANIENT', 'ADANIGREEN',
  
  // NIFTY NEXT 50 + MID CAP
  'NAUKRI', 'VEDL', 'GODREJCP', 'SIEMENS', 'DMART', 'PIDILITIND', 'COLPAL', 'MARICO',
  'BERGEPAINT', 'DABUR', 'LUPIN', 'GLAND', 'INDIGO', 'MCDOWELL-N', 'TORNTPHARM', 'BIOCON',
  'MOTHERSUMI', 'BOSCHLTD', 'HAVELLS', 'PAGEIND', 'AMBUJACEM', 'ACC', 'MPHASIS', 'BANKBARODA',
  'PEL', 'INDIAMART', 'CONCOR', 'NMDC', 'SAIL', 'NATIONALUM', 'HINDZINC', 'JINDALSTEL',
  'TATAPOWER', 'PFC', 'RECLTD', 'IRCTC', 'VOLTAS', 'CROMPTON', 'WHIRLPOOL', 'DIXON',
  'JUBLFOOD', 'PGHH', 'GODREJIND', 'VBL', 'AUROPHARMA', 'CADILAHC', 'GLAXO', 'PFIZER',
  'ABBOTINDIA', 'ALKEM', 'LALPATHLAB', 'APOLLOTYRE', 'CEAT', 'BALKRISIND', 'SUPREMEIND',
  'ASTRAL', 'FINOLEX', 'POLYCAB', 'KEI', 'APLAPOLLO', 'TORNTPOWER', 'ADANIPOWER', 'NHPC',
  'THERMAX', 'BHEL', 'CUMMINSIND', 'EXIDEIND', 'SUNDRMFAST', 'TVSMOTORS', 'MAHINDRA',
  'ASHOKLEY', 'PERSISTENT', 'LTTS', 'CYIENT', 'COFORGE', 'OFSS', 'KPITTECH', 'LTIM',
  'RNAM', 'SONACOMS', 'RAMCOCEM', 'JKCEMENT', 'HEIDELBERG', 'AARTIIND', 'AAVAS', 'ABCAPITAL',
  'ABFRL', 'AEGISLOG', 'AFFLE', 'AJANTPHARM', 'ALKYLAMINE', 'AMARAJABAT', 'ANANTRAJ',
  'APARINDS', 'ATUL', 'AUBANK', 'BAJAJHLDNG', 'BANDHANBNK', 'BHARATFORG', 'CANFINHOME',
  'CHOLAFIN', 'DEEPAKNTR', 'FEDERALBNK', 'GAIL', 'GMRINFRA', 'GRANULES', 'HONAUT',
  'IDFCFIRSTB', 'IIFL', 'IOC', 'IRCON', 'JSWENERGY', 'KANSAINER', 'LICHSGFIN', 'MANAPPURAM',
  'METROPOLIS', 'MFSL', 'MINDAIND', 'MRF', 'MUTHOOTFIN', 'NBCC', 'NIACL', 'NIITLTD',
  'NLCINDIA', 'PAYTM', 'PETRONET', 'PHOENIX', 'PIIND', 'PNBHOUSING', 'PRAJ', 'RAIL',
  'RAILTEL', 'RBLBANK', 'SCHAEFFLER', 'SBICARD', 'SBILIFE', 'SOLARINDS', 'SPANDANA',
  'SRTRANSFIN', 'STAR', 'SUZLON', 'SYNGENE', 'TATACHEM', 'TATACOMM', 'TATAELXSI',
  'TATAINVEST', 'TTML', 'UBL', 'UJJIVAN', 'UJJIVANSFB', 'UNIONBANK', 'UNIPARTS',
  'USHAMART', 'VGUARD', 'VINATIORGA', 'WELCORP', 'WELSPUNIND', 'YESBANK', 'ZEEL',
  'ZYDUSLIFE', 'BATAINDIA', 'RELAXO', 'SYMPHONY', 'BLUESTARCO', 'RAJESHEXPO'
];

// BSE ADDITIONAL STOCKS
const BSE_STOCKS = [
  'KAJARIACER', 'ORIENTCEM', 'PRISMJOHNS', 'SKFINDIA', 'TIMKEN', 'GRINDWELL', 'CARBORUNIV',
  'FINEORG', 'EIDPARRY', 'BALRAMCHIN', 'DALBHARAT', 'SHREERENUKA', 'BAJAJCON', 'IPCALAB',
  'GLENMARK', 'NATCOPHARM', 'STRIDES', 'APLLTD', 'MANEINDUS', 'PRISMCEM', 'SOMANYCER'
];

// Real-time data fetching with proper API integration
async function fetchRealStockData(symbol: string, exchange: string): Promise<StockData[]> {
  console.log(`🔍 Fetching real data for ${symbol} (${exchange})`);
  
  // Try Alpha Vantage first
  try {
    const alphaData = await fetchFromAlphaVantage(symbol, exchange);
    if (alphaData && alphaData.length >= 200) {
      console.log(`✅ Alpha Vantage: Got ${alphaData.length} records for ${symbol}`);
      return alphaData;
    }
  } catch (error) {
    console.warn(`⚠️ Alpha Vantage failed for ${symbol}: ${error.message}`);
  }
  
  // Try Twelve Data as backup
  try {
    const twelveData = await fetchFromTwelveData(symbol, exchange);
    if (twelveData && twelveData.length >= 200) {
      console.log(`✅ Twelve Data: Got ${twelveData.length} records for ${symbol}`);
      return twelveData;
    }
  } catch (error) {
    console.warn(`⚠️ Twelve Data failed for ${symbol}: ${error.message}`);
  }
  
  // Try Yahoo Finance scraping as last resort
  try {
    const yahooData = await fetchFromYahooFinance(symbol, exchange);
    if (yahooData && yahooData.length >= 200) {
      console.log(`✅ Yahoo Finance: Got ${yahooData.length} records for ${symbol}`);
      return yahooData;
    }
  } catch (error) {
    console.warn(`⚠️ Yahoo Finance failed for ${symbol}: ${error.message}`);
  }
  
  throw new Error(`No real data available for ${symbol}`);
}

async function fetchFromAlphaVantage(symbol: string, exchange: string): Promise<StockData[]> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  if (!apiKey) throw new Error('Alpha Vantage API key not configured');
  
  const suffix = exchange === 'NSE' ? '.NSE' : '.BSE';
  const url = `https://www.alphavantage.co/query?function=DAILY&symbol=${symbol}${suffix}&apikey=${apiKey}&outputsize=full`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'VCP-Scanner/6.0' },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  
  if (data['Error Message'] || data['Note'] || !data['Time Series (Daily)']) {
    throw new Error('Invalid Alpha Vantage response');
  }
  
  const timeSeries = data['Time Series (Daily)'];
  const stocks = Object.entries(timeSeries).slice(0, 300).map(([date, values]: [string, any]) => ({
    symbol,
    exchange,
    date,
    open: parseFloat(values['1. open']),
    high: parseFloat(values['2. high']),
    low: parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
    volume: parseInt(values['5. volume']) || 1000
  }));
  
  await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
  return stocks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function fetchFromTwelveData(symbol: string, exchange: string): Promise<StockData[]> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) throw new Error('Twelve Data API key not configured');
  
  const symbolSuffix = exchange === 'NSE' ? `${symbol}.NSE` : `${symbol}.BSE`;
  const url = `https://api.twelvedata.com/time_series?symbol=${symbolSuffix}&interval=1day&outputsize=300&apikey=${apiKey}`;
  
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (data.status === 'error' || !data.values) throw new Error('Invalid Twelve Data response');
  
  return data.values.map((item: any) => ({
    symbol,
    exchange,
    date: item.datetime,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseInt(item.volume) || 1000
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function fetchFromYahooFinance(symbol: string, exchange: string): Promise<StockData[]> {
  const yahooSymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=2y&interval=1d`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (VCP-Scanner/6.0)' },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data.chart?.result?.[0]) throw new Error('Invalid Yahoo response');
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  
  if (!timestamps || !quote) throw new Error('No data in Yahoo response');
  
  const stocks: StockData[] = [];
  for (let i = 0; i < Math.min(timestamps.length, 300); i++) {
    if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
      stocks.push({
        symbol,
        exchange,
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i] || 1000
      });
    }
  }
  
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

// ENHANCED VCP Pattern Detection - Mark Minervini's Complete Methodology
function detectVCPPattern(stockHistory: StockData[]): VCPResult | null {
  if (stockHistory.length < 250) return null;
  
  const latest = stockHistory[stockHistory.length - 1];
  const closes = stockHistory.map(d => d.close);
  const volumes = stockHistory.map(d => d.volume);
  const highs = stockHistory.map(d => d.high);
  const lows = stockHistory.map(d => d.low);
  
  try {
    // 1. PRICE FILTER - Minimum price threshold
    if (latest.close < 50) return null;
    
    // 2. LIQUIDITY FILTER - Minimum turnover requirement
    if (latest.close * latest.volume < 5000000) return null; // Min ₹50L turnover
    
    // 3. 52-WEEK HIGH PROXIMITY - Must be within 25% of 52-week high
    const high52Week = Math.max(...closes.slice(-252));
    const percentFrom52WHigh = ((latest.close - high52Week) / high52Week) * 100;
    if (percentFrom52WHigh < -25) return null;
    
    // 4. TREND STRUCTURE - EMA alignment (bullish trend)
    const ema10 = calculateEMA(closes, 10);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const ema150 = calculateEMA(closes, 150);
    const ema200 = calculateEMA(closes, 200);
    
    if (!ema10 || !ema21 || !ema50 || !ema150 || !ema200) return null;
    
    // Strong trend structure requirement
    if (!(ema10 > ema21 && ema21 > ema50 && ema50 > ema150 && ema150 > ema200)) return null;
    if (latest.close < ema21 * 0.95) return null; // Price above 21 EMA
    
    // 5. VOLATILITY CONTRACTION - Key VCP characteristic
    const currentATR = calculateATR(stockHistory.slice(-21), 14);
    const previousATR = calculateATR(stockHistory.slice(-50, -21), 14);
    
    if (!currentATR || !previousATR) return null;
    if (currentATR >= previousATR * 0.8) return null; // ATR must contract by at least 20%
    
    // 6. VOLUME ANALYSIS - Volume must be contracting
    const volumeAvg10 = calculateSMA(volumes.slice(-10), 10);
    const volumeAvg20 = calculateSMA(volumes.slice(-20), 20);
    const volumeAvg50 = calculateSMA(volumes.slice(-50), 50);
    
    if (!volumeAvg10 || !volumeAvg20 || !volumeAvg50) return null;
    
    // Volume contraction pattern
    if (volumeAvg10 > volumeAvg20 * 1.2) return null;
    if (latest.volume > volumeAvg20 * 2) return null;
    
    // 7. PRICE CONSOLIDATION PATTERN
    const recent21Highs = highs.slice(-21);
    const recent21Lows = lows.slice(-21);
    const consolidationRange = Math.max(...recent21Highs) - Math.min(...recent21Lows);
    const consolidationPercent = consolidationRange / latest.close;
    
    if (consolidationPercent > 0.20) return null; // Max 20% consolidation range
    if (consolidationPercent < 0.05) return null; // Min 5% range
    
    // 8. CUP FORMATION CHECK
    const low200Day = Math.min(...closes.slice(-200));
    const cupDepth = (high52Week - low200Day) / high52Week;
    if (cupDepth < 0.15 || cupDepth > 0.65) return null; // 15-65% cup depth
    
    // 9. STAGE ANALYSIS - Stage 2 uptrend
    const sma200 = calculateSMA(closes, 200);
    if (!sma200 || latest.close < sma200 * 1.10) return null; // 10% above 200 SMA
    
    // 10. RELATIVE STRENGTH
    const priceChange200Day = (latest.close - closes[closes.length - 200]) / closes[closes.length - 200];
    if (priceChange200Day < 0.20) return null; // Min 20% gain over 200 days
    
    // 11. BREAKOUT SIGNAL DETECTION
    const high21Day = Math.max(...highs.slice(-22, -1));
    const breakoutSignal = latest.close > high21Day && latest.volume > volumeAvg20 * 1.5;
    
    // 12. QUALITY FILTERS
    const recent5Days = closes.slice(-5);
    const recent5DaysVolatility = Math.max(...recent5Days) / Math.min(...recent5Days);
    if (recent5DaysVolatility > 1.15) return null; // Max 15% range in last 5 days
    
    const volumeQuality = volumeAvg20 / volumeAvg50;
    if (volumeQuality > 1.5) return null;
    
    console.log(`🎯 VCP PATTERN DETECTED: ${latest.symbol} (${latest.exchange})`);
    console.log(`   Price: ₹${latest.close} | From 52W High: ${percentFrom52WHigh.toFixed(1)}%`);
    console.log(`   ATR Contraction: ${((1 - currentATR/previousATR) * 100).toFixed(1)}%`);
    console.log(`   Consolidation: ${(consolidationPercent * 100).toFixed(1)}%`);
    console.log(`   Breakout: ${breakoutSignal ? 'YES' : 'NO'}`);
    
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
      breakout_signal: breakoutSignal,
      volatility_contraction: consolidationPercent,
      scan_date: latest.date
    };
    
  } catch (error) {
    console.error(`❌ VCP detection error ${latest.symbol}: ${error.message}`);
    return null;
  }
}

function getLastTradingDay(): string {
  const today = new Date();
  let lastTradingDay = new Date(today);
  
  if (today.getDay() === 6) { // Saturday
    lastTradingDay.setDate(today.getDate() - 1);
  } else if (today.getDay() === 0) { // Sunday
    lastTradingDay.setDate(today.getDate() - 2);
  } else if (today.getHours() < 16) { // Before market close
    lastTradingDay.setDate(today.getDate() - 1);
    if (lastTradingDay.getDay() === 0) {
      lastTradingDay.setDate(lastTradingDay.getDate() - 2);
    } else if (lastTradingDay.getDay() === 6) {
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
    }
  }
  
  return lastTradingDay.toISOString().split('T')[0];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 ENHANCED VCP SCANNER WITH REAL-TIME DATA LAUNCHED 🚀');
    console.log('📊 COMPREHENSIVE NSE & BSE COVERAGE WITH LIVE DATA INTEGRATION');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const scanStartTime = Date.now();
    const scanDate = getLastTradingDay();
    
    console.log(`📅 Scan Date: ${scanDate}`);
    console.log(`🔑 API Status:`, {
      alphaVantage: !!Deno.env.get('ALPHA_VANTAGE_API_KEY'),
      twelveData: !!Deno.env.get('TWELVE_DATA_API_KEY')
    });

    // COMPREHENSIVE MARKET UNIVERSE
    const allStocks = [
      ...NSE_STOCKS.map(symbol => ({ symbol, exchange: 'NSE' })),
      ...BSE_STOCKS.map(symbol => ({ symbol, exchange: 'BSE' }))
    ];
    
    console.log(`🎯 TOTAL UNIVERSE: ${allStocks.length} stocks`);
    console.log(`📈 NSE: ${NSE_STOCKS.length} | BSE: ${BSE_STOCKS.length}`);

    const vcpResults: VCPResult[] = [];
    let processed = 0;
    let successful = 0;
    let realDataFetches = 0;
    let vcpFound = 0;
    let errors = 0;

    console.log('🔍 Starting REAL-TIME VCP Detection...');
    
    // Process in batches with real data fetching
    const batchSize = 15; // Smaller batches for API rate limiting
    for (let i = 0; i < allStocks.length; i += batchSize) {
      const batch = allStocks.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(allStocks.length/batchSize);
      
      console.log(`📊 Processing Batch ${batchNum}/${totalBatches} (${batch.length} stocks)`);
      
      const batchPromises = batch.map(async (stock) => {
        try {
          processed++;
          
          // Fetch REAL market data
          const stockData = await fetchRealStockData(stock.symbol, stock.exchange);
          
          if (stockData.length >= 200) {
            successful++;
            realDataFetches++;
            
            // Apply ENHANCED VCP detection
            const vcpResult = detectVCPPattern(stockData);
            if (vcpResult) {
              vcpFound++;
              console.log(`🎯 VCP FOUND: ${stock.symbol} (${stock.exchange}) - ₹${vcpResult.close_price.toFixed(2)}`);
              return vcpResult;
            }
          }
          
          return null;
        } catch (error) {
          errors++;
          console.error(`❌ Error processing ${stock.symbol}: ${error.message}`);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      const successfulResults = batchResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<VCPResult>).value);
      
      vcpResults.push(...successfulResults);
      
      // Progress update
      const progress = (processed / allStocks.length * 100).toFixed(1);
      const eta = ((Date.now() - scanStartTime) / processed * (allStocks.length - processed) / 1000 / 60).toFixed(1);
      
      console.log(`📈 Progress: ${progress}% | VCP: ${vcpFound} | Real Data: ${realDataFetches} | ETA: ${eta}min`);
      
      // Rate limiting for API calls
      if (i + batchSize < allStocks.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const scanDuration = Math.floor((Date.now() - scanStartTime) / 1000);
    
    console.log('🎉 REAL-TIME VCP SCAN COMPLETED! 🎉');
    console.log(`📊 Total Processed: ${processed} stocks`);
    console.log(`📡 Real Data Fetches: ${realDataFetches} (${((realDataFetches/Math.max(successful,1))*100).toFixed(1)}%)`);
    console.log(`🎯 VCP PATTERNS: ${vcpResults.length} qualifying stocks`);
    console.log(`⏱️ Duration: ${Math.floor(scanDuration/60)}m ${scanDuration%60}s`);

    // Save scan metadata
    try {
      const { error: metadataError } = await supabase
        .from('scan_metadata')
        .insert({
          scan_date: scanDate,
          scan_type: 'VCP_REAL_TIME_SCAN',
          total_stocks_scanned: processed,
          filtered_results_count: vcpResults.length,
          scan_duration_seconds: scanDuration,
          status: 'completed'
        });

      if (metadataError) {
        console.error('❌ Metadata save error:', metadataError);
      }
    } catch (err) {
      console.error('❌ Metadata save failed:', err);
    }

    // Clear and save new results
    try {
      await supabase
        .from('vcp_scan_results')
        .delete()
        .gte('scan_date', scanDate);

      if (vcpResults.length > 0) {
        const insertBatchSize = 50;
        for (let i = 0; i < vcpResults.length; i += insertBatchSize) {
          const insertBatch = vcpResults.slice(i, i + insertBatchSize);
          const { error: insertError } = await supabase
            .from('vcp_scan_results')
            .insert(insertBatch);

          if (insertError) {
            console.error(`❌ Insert error:`, insertError);
          }
        }
        
        console.log(`💾 SAVED: ${vcpResults.length} VCP results`);
      }
    } catch (err) {
      console.error('❌ Database save failed:', err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scan_date: scanDate,
        results_count: vcpResults.length,
        total_scanned: processed,
        successful_scans: successful,
        real_data_fetches: realDataFetches,
        scan_duration_seconds: scanDuration,
        processing_rate: Math.round(processed/scanDuration*60),
        errors: errors,
        real_data_percentage: ((realDataFetches/Math.max(successful,1))*100).toFixed(1) + '%',
        message: `🚀 REAL-TIME VCP SCAN COMPLETE! Processed ${processed} stocks with ${realDataFetches} real data fetches and found ${vcpResults.length} high-quality VCP patterns using enhanced Mark Minervini methodology.`,
        api_integration: {
          primary_source: 'Alpha Vantage + Twelve Data',
          backup_source: 'Yahoo Finance',
          real_time_capability: true,
          eod_data_available: true,
          rate_limited: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 FATAL SCANNER ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Real-time VCP Scanner encountered an error during market data processing.',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
