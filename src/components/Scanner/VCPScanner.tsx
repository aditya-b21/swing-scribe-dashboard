
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Download, RefreshCw, Calendar, TrendingUp, BarChart3, Clock, Database, Globe, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VCPResultsTable } from './VCPResultsTable';
import { VCPScanStats } from './VCPScanStats';
import { toast } from 'sonner';
import { STOCK_UNIVERSE } from '@/constants/stockUniverse';

interface VCPScanResult {
  id: string;
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
  breakout_signal: boolean | null;
  volatility_contraction: number | null;
  scan_date: string;
}

interface ScanMetadata {
  id: string;
  scan_date: string;
  total_stocks_scanned: number | null;
  filtered_results_count: number | null;
  scan_duration_seconds: number | null;
  status: string | null;
  created_at: string;
}

// Get last trading day for display
function getLastTradingDay(): string {
  const today = new Date();
  let lastTradingDay = new Date(today);
  
  if (today.getDay() === 6) { // Saturday
    lastTradingDay.setDate(today.getDate() - 1);
  } else if (today.getDay() === 0) { // Sunday
    lastTradingDay.setDate(today.getDate() - 2);
  } else if (today.getHours() < 16) { // Before 4 PM
    lastTradingDay.setDate(today.getDate() - 1);
    if (lastTradingDay.getDay() === 0) {
      lastTradingDay.setDate(lastTradingDay.getDate() - 2);
    } else if (lastTradingDay.getDay() === 6) {
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
    }
  }
  
  return lastTradingDay.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function VCPScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch latest scan results
  const { data: scanResults, isLoading: loadingResults } = useQuery({
    queryKey: ['vcp-scan-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vcp_scan_results')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(2000); // Increased limit for complete market results

      if (error) throw error;
      return data as VCPScanResult[];
    },
  });

  // Fetch scan metadata with updated scan type
  const { data: scanMetadata } = useQuery({
    queryKey: ['scan-metadata'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scan_metadata')
        .select('*')
        .eq('scan_type', 'VCP_COMPREHENSIVE_MARKET_SCAN')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ScanMetadata | null;
    },
  });

  // Enhanced Full Market VCP Scanner mutation
  const runScannerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('run-vcp-scanner', {
        body: {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const successMessage = `🚀 ULTIMATE VCP MARKET SCAN COMPLETE! 
      
📊 PROCESSED: ${data.total_scanned?.toLocaleString()} stocks from COMPLETE NSE + BSE universe
📈 NSE: ${data.scan_summary?.nse_stocks?.toLocaleString()} | BSE: ${data.scan_summary?.bse_stocks?.toLocaleString()} stocks  
🎯 VCP PATTERNS FOUND: ${data.results_count} high-quality stocks
⚡ SUCCESS RATE: ${data.success_rate}
📡 REAL DATA: ${data.scan_summary?.real_data_percentage} from live APIs
📅 SCAN DATE: ${data.scan_date}
⏱️ DURATION: ${Math.floor(data.scan_duration_seconds/60)}m ${data.scan_duration_seconds%60}s
🔥 PROCESSING RATE: ${data.processing_rate} stocks/minute

Enhanced Mark Minervini VCP Algorithm v6.0 with 12 quality filters applied!`;

      toast.success(successMessage, { duration: 10000 });
      queryClient.invalidateQueries({ queryKey: ['vcp-scan-results'] });
      queryClient.invalidateQueries({ queryKey: ['scan-metadata'] });
      setIsScanning(false);
    },
    onError: (error) => {
      console.error('Ultimate VCP Scanner error:', error);
      toast.error('🚨 Ultimate VCP Scanner encountered an error. Please check API configuration and try again.', { duration: 6000 });
      setIsScanning(false);
    },
  });

  const handleRunFullScanner = async () => {
    setIsScanning(true);
    toast.info('🔥 LAUNCHING ULTIMATE VCP MARKET SCANNER...', {
      description: `Scanning ALL ${STOCK_UNIVERSE.TOTAL_UNIVERSE.toLocaleString()}+ NSE & BSE stocks with enhanced VCP detection. This comprehensive scan will process the complete Indian equity market universe with Mark Minervini's algorithmic methodology.`,
      duration: 6000
    });
    runScannerMutation.mutate();
  };

  const handleExportCSV = () => {
    if (!scanResults || scanResults.length === 0) {
      toast.error('No VCP results available for export');
      return;
    }

    const csvHeaders = [
      'Symbol',
      'Exchange', 
      'Close Price (₹)',
      'Volume',
      '% from 52W High',
      'ATR(14)',
      'EMA(50)',
      'EMA(150)',
      'EMA(200)',
      'Avg Volume(20)',
      'Breakout Signal',
      'Volatility Contraction',
      'Scan Date'
    ];

    const csvData = scanResults.map(result => [
      result.symbol,
      result.exchange,
      result.close_price,
      result.volume,
      result.percent_from_52w_high?.toFixed(2) || 'N/A',
      result.atr_14?.toFixed(4) || 'N/A',
      result.ema_50?.toFixed(2) || 'N/A',
      result.ema_150?.toFixed(2) || 'N/A',
      result.ema_200?.toFixed(2) || 'N/A',
      result.volume_avg_20 || 'N/A',
      result.breakout_signal ? 'Yes' : 'No',
      result.volatility_contraction?.toFixed(4) || 'N/A',
      result.scan_date
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complete_market_vcp_scan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`📥 Full Market VCP Results exported! ${scanResults.length} stocks included.`);
  };

  const lastTradingDay = getLastTradingDay();
  const latestScanDate = scanMetadata?.scan_date 
    ? new Date(scanMetadata.scan_date).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Never';

  return (
    <div className="space-y-6">
      {/* Enhanced Header Card */}
      <Card className="glass-effect border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-2xl">
            <Globe className="w-6 h-6 text-green-400" />
            Ultimate VCP Market Scanner v6.0
            <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
              Complete Universe + Enhanced Detection
            </span>
          </CardTitle>
          <p className="text-slate-400">
            Professional-grade Volatility Contraction Pattern scanner with <strong>COMPLETE market coverage</strong> across entire NSE & BSE universe using Mark Minervini's enhanced algorithmic methodology with 12 quality filters
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <Database className="w-4 h-4" />
              <span>NSE: {STOCK_UNIVERSE.NSE_COUNT.toLocaleString()}+ stocks</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Database className="w-4 h-4" />
              <span>BSE: {STOCK_UNIVERSE.BSE_COUNT.toLocaleString()}+ stocks</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <Clock className="w-4 h-4" />
              <span>Last Trading Day: {lastTradingDay}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <Settings className="w-4 h-4" />
              <span>Multi-API Integration</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Control Panel */}
      <Card className="glass-effect">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Last Complete Scan: <strong>{latestScanDate}</strong></span>
                </div>
                {scanMetadata && (
                  <>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">
                        VCP Results: <strong>{scanMetadata.filtered_results_count?.toLocaleString()}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span className="text-sm">
                        Total Processed: <strong>{scanMetadata.total_stocks_scanned?.toLocaleString()}</strong> stocks
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs">
                  <strong>ULTIMATE MARKET COVERAGE:</strong> This scanner processes the <em>complete universe</em> of NSE & BSE listed stocks 
                  with enhanced Mark Minervini VCP detection algorithm featuring 12 quality filters including volatility contraction, 
                  cup formation analysis, trend structure validation, and breakout signal detection.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRunFullScanner}
                disabled={isScanning}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium px-8 py-3 text-base shadow-lg"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Scanning Complete Market...
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5 mr-2" />
                    Run Ultimate Market Scanner
                  </>
                )}
              </Button>

              <Button
                onClick={handleExportCSV}
                variant="outline"
                disabled={!scanResults || scanResults.length === 0}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced VCP Algorithm Info */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Enhanced Mark Minervini VCP Algorithm v6.0 (Applied to Complete Market)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
              <strong className="text-green-400">✅ Technical Filters (6 criteria):</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Strong EMA trend: 10 &gt; 21 &gt; 50 &gt; 150 &gt; 200</li>
                <li>• ATR volatility contraction (min 20%)</li>
                <li>• Price within 25% of 52-week high</li>
                <li>• Volume contraction pattern validation</li>
                <li>• Price consolidation range (5-20%)</li>
                <li>• Cup formation depth analysis (15-65%)</li>
              </ul>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
              <strong className="text-blue-400">💰 Fundamental Filters (6 criteria):</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Minimum price: ₹50 (quality threshold)</li>
                <li>• Daily turnover: ₹50L+ (liquidity requirement)</li>
                <li>• Stage 2 uptrend: 10% above 200 SMA</li>
                <li>• Relative strength: 20% gain over 200 days</li>
                <li>• Price action quality (max 15% range in 5 days)</li>
                <li>• 🎯 Breakout: Volume spike with price breakout</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded">
            <p className="text-purple-300 text-sm">
              <strong>🚀 ENHANCED v6.0 FEATURES:</strong> Complete NSE & BSE coverage ({STOCK_UNIVERSE.TOTAL_UNIVERSE.toLocaleString()}+ stocks), 
              Multi-API integration (Alpha Vantage, Yahoo Finance, Twelve Data, Zerodha), 12-point quality filter system, 
              cup formation analysis, relative strength validation, and professional-grade accuracy for serious traders.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scan Statistics */}
      <VCPScanStats metadata={scanMetadata} />

      {/* Enhanced Results Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Full Market VCP Scanner Results
            {scanResults && scanResults.length > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                ({scanResults.length.toLocaleString()} VCP patterns from complete market scan)
              </span>
            )}
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Displaying all stocks that passed Mark Minervini's strict VCP criteria from the last full market scan
          </p>
        </CardHeader>
        <CardContent>
          <VCPResultsTable 
            results={scanResults || []} 
            isLoading={loadingResults} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
