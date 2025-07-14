import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Download, RefreshCw, Calendar, TrendingUp, BarChart3, Clock, Database, Globe, Settings, Shield, AlertTriangle, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VCPResultsTable } from './VCPResultsTable';
import { VCPScanStats } from './VCPScanStats';
import { FileUploadVCPScanner } from './FileUploadVCPScanner';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface ScanResponse {
  success: boolean;
  scan_date: string;
  results_count: number;
  total_scanned: number;
  successful_scans: number;
  real_data_fetches: number;
  scan_duration_seconds: number;
  processing_rate: number;
  success_rate: string;
  real_data_percentage: string;
  api_errors: number;
  ssl_errors: number;
  scan_summary: {
    nse_stocks: number;
    bse_stocks: number;
    total_universe: number;
    vcp_patterns_found: number;
    real_data_coverage: string;
    ssl_fixes_applied: boolean;
  };
  message: string;
}

function getCurrentTradingDay(): string {
  const today = new Date();
  let tradingDay = new Date(today);
  
  if (today.getDay() === 6) { // Saturday
    tradingDay.setDate(today.getDate() - 1);
  } else if (today.getDay() === 0) { // Sunday
    tradingDay.setDate(today.getDate() - 2);
  } else if (today.getHours() < 9) { // Before market opens
    tradingDay.setDate(today.getDate() - 1);
    if (tradingDay.getDay() === 0) {
      tradingDay.setDate(tradingDay.getDate() - 2);
    } else if (tradingDay.getDay() === 6) {
      tradingDay.setDate(tradingDay.getDate() - 1);
    }
  }
  
  return tradingDay.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function VCPScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: scanResults, isLoading: loadingResults, refetch: refetchResults } = useQuery({
    queryKey: ['vcp-scan-results'],
    queryFn: async () => {
      console.log('🔄 Fetching latest VCP scan results...');
      const { data, error } = await supabase
        .from('vcp_scan_results')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('❌ Error fetching scan results:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} VCP scan results`);
      return data as VCPScanResult[];
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const { data: scanMetadata, refetch: refetchMetadata } = useQuery({
    queryKey: ['scan-metadata'],
    queryFn: async () => {
      console.log('🔄 Fetching scan metadata...');
      const { data, error } = await supabase
        .from('scan_metadata')
        .select('*')
        .eq('scan_type', 'VCP_COMPREHENSIVE_MARKET_SCAN')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching metadata:', error);
        throw error;
      }
      
      const result = data?.[0] || null;
      console.log('✅ Fetched scan metadata:', result);
      return result as ScanMetadata | null;
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const runScannerMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Starting Ultimate VCP Market Scanner v10.0...');
      const { data, error } = await supabase.functions.invoke('run-vcp-scanner', {
        body: { scanType: 'full' }
      });
      
      if (error) {
        console.error('❌ Scanner function error:', error);
        throw error;
      }
      
      console.log('✅ Scanner completed successfully:', data);
      return data as ScanResponse;
    },
    onSuccess: (data) => {
      const successMessage = `🚀 ULTIMATE VCP MARKET SCAN v10.0 COMPLETE! 
      
📊 PROCESSED: ${data.total_scanned?.toLocaleString()} stocks from COMPLETE NSE + BSE universe
📈 NSE: ${data.scan_summary?.nse_stocks?.toLocaleString()} | BSE: ${data.scan_summary?.bse_stocks?.toLocaleString()} stocks  
🎯 VCP PATTERNS FOUND: ${data.results_count} high-quality stocks
⚡ SUCCESS RATE: ${data.success_rate}
📡 REAL DATA: ${data.real_data_percentage} from live APIs
📅 SCAN DATE: ${data.scan_date}
⏱️ DURATION: ${Math.floor(data.scan_duration_seconds/60)}m ${data.scan_duration_seconds%60}s
🔥 PROCESSING RATE: ${data.processing_rate} stocks/minute

Enhanced Mark Minervini VCP Algorithm v10.0 with pattern stage analysis!`;

      toast.success(successMessage, { duration: 15000 });
      
      // Force immediate refresh of all data
      console.log('🔄 Force refreshing all data after successful scan...');
      setTimeout(() => {
        refetchResults();
        refetchMetadata();
        queryClient.invalidateQueries({ queryKey: ['vcp-scan-results'] });
        queryClient.invalidateQueries({ queryKey: ['scan-metadata'] });
      }, 2000);
      
      setIsScanning(false);
    },
    onError: (error) => {
      console.error('💥 Ultimate VCP Scanner error:', error);
      
      let errorMessage = `🚨 Ultimate VCP Scanner v10.0 encountered an error: ${error.message}`;
      
      if (error.message.includes('Failed to send a request')) {
        errorMessage += '\n\n📡 Network Error: Please check your internet connection and try again. The edge function may need a moment to initialize.';
      }
      
      toast.error(errorMessage, { duration: 12000 });
      setIsScanning(false);
    },
  });

  const handleRunFullScanner = async () => {
    setIsScanning(true);
    console.log('🔥 Launching Ultimate VCP Market Scanner v10.0...');
    
    toast.info('🔥 LAUNCHING ULTIMATE VCP MARKET SCANNER v10.0...', {
      description: `Scanning ALL NSE & BSE stocks with enhanced real-time data integration. This comprehensive scan processes the complete Indian equity market with Mark Minervini's enhanced 12-point VCP methodology using live API data.`,
      duration: 10000
    });
    
    runScannerMutation.mutate();
  };

  const handleExportCSV = () => {
    if (!scanResults || scanResults.length === 0) {
      toast.error('No VCP results available for export');
      return;
    }

    console.log(`📥 Exporting ${scanResults.length} VCP results to CSV...`);

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
    a.download = `ultimate_vcp_scan_v10_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`📥 Ultimate VCP Results v10.0 exported! ${scanResults.length} stocks included.`);
    console.log(`✅ Export completed: ${scanResults.length} results`);
  };

  const currentTradingDay = getCurrentTradingDay();
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
      <Tabs defaultValue="full-scan" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="full-scan" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Full Market Scan
          </TabsTrigger>
          <TabsTrigger value="file-upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Custom File Scan
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="full-scan" className="space-y-6">
          {/* Enhanced Header Card */}
          <Card className="glass-effect border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white text-2xl">
                <Globe className="w-6 h-6 text-green-400" />
                Ultimate VCP Market Scanner v10.0
                <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Live Data + Enhanced
                </span>
              </CardTitle>
              <p className="text-slate-400">
                Professional-grade Volatility Contraction Pattern scanner with <strong>REAL-TIME API integration</strong>, and complete NSE & BSE coverage using Mark Minervini's enhanced 12-point algorithmic methodology
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <Database className="w-4 h-4" />
                  <span>NSE: 75+ top stocks</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <Database className="w-4 h-4" />
                  <span>BSE: 25+ stocks</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Clock className="w-4 h-4" />
                  <span>Trading Day: {currentTradingDay}</span>
                </div>
                <div className="flex items-center gap-2 text-orange-400">
                  <Shield className="w-4 h-4" />
                  <span>Live APIs</span>
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
                            VCP Results: <strong>{scanMetadata.filtered_results_count?.toLocaleString() || 0}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">
                            Total Processed: <strong>{scanMetadata.total_stocks_scanned?.toLocaleString() || 0}</strong> stocks
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-300 text-xs">
                      <strong>🚀 VCP SCANNER v10.0 ENHANCED:</strong> This scanner now includes improved real-time data integration, 
                      multiple retry strategies, and enhanced API integration for reliable data fetching from Yahoo Finance (primary), 
                      Alpha Vantage, and Twelve Data. Enhanced Mark Minervini VCP detection with 12 quality filters including 
                      volatility contraction, cup analysis, trend validation, and pattern stage identification across 100+ NSE & BSE stocks.
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
                        Scanning Market...
                      </>
                    ) : (
                      <>
                        <Globe className="w-5 h-5 mr-2" />
                        Run Ultimate Scanner v10.0
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
                Enhanced Mark Minervini VCP Algorithm v10.0 (Live Data + Pattern Stage Analysis)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                  <strong className="text-green-400">✅ Technical Filters (6 criteria):</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Strong EMA trend: 10 &gt; 21 &gt; 50 &gt; 150 &gt; 200</li>
                    <li>• ATR volatility contraction (min 15%)</li>
                    <li>• Price within 30% of 52-week high</li>
                    <li>• Volume contraction pattern validation</li>
                    <li>• Price consolidation range (5-25%)</li>
                    <li>• Cup formation depth analysis (12-65%)</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                  <strong className="text-blue-400">💰 Fundamental Filters (6 criteria):</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Minimum price: ₹50 (quality threshold)</li>
                    <li>• Daily turnover: ₹50L+ (liquidity requirement)</li>
                    <li>• Stage 2 uptrend: 5% above 200 SMA</li>
                    <li>• Relative strength: 10% gain over 200 days</li>
                    <li>• Price action quality (max 15% range in 5 days)</li>
                    <li>• 🎯 Breakout: Volume spike with price breakout</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded">
                <p className="text-purple-300 text-sm">
                  <strong>🚀 v10.0 ENHANCEMENTS:</strong> Complete NSE (75+) & BSE (25+) coverage with 
                  enhanced real-time data integration, multiple retry strategies, and live API integration prioritizing 
                  Yahoo Finance for reliability. 12-point quality filter system with professional-grade accuracy and 
                  pattern stage analysis for serious traders.
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
                Ultimate VCP Scanner v10.0 Results
                {scanResults && scanResults.length > 0 && (
                  <span className="text-sm text-slate-400 ml-2">
                    ({scanResults.length.toLocaleString()} VCP patterns from comprehensive market scan)
                  </span>
                )}
              </CardTitle>
              <p className="text-slate-400 text-sm">
                Real-time results with v10.0 enhancements showing all stocks that passed Mark Minervini's strict 12-point VCP criteria from the latest comprehensive market scan
              </p>
            </CardHeader>
            <CardContent>
              <VCPResultsTable 
                results={scanResults || []} 
                isLoading={loadingResults} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="file-upload">
          <FileUploadVCPScanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}
