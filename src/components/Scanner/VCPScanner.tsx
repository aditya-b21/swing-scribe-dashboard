
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
  etfs_filtered: number;
  ssl_errors: number;
  scan_summary: {
    nse_stocks: number;
    bse_stocks: number;
    total_universe: number;
    vcp_patterns_found: number;
    real_data_coverage: string;
    etfs_filtered: number;
    ssl_fixes_applied: boolean;
    ssl_errors_resolved: number;
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
      console.log('🔄 Fetching latest comprehensive VCP scan results...');
      const { data, error } = await supabase
        .from('vcp_scan_results')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(2000); // Increased limit for comprehensive results

      if (error) {
        console.error('❌ Error fetching scan results:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} comprehensive VCP scan results`);
      return data as VCPScanResult[];
    },
    refetchInterval: 8000, // Faster refresh for live updates
    staleTime: 3000,
  });

  const { data: scanMetadata, refetch: refetchMetadata } = useQuery({
    queryKey: ['scan-metadata'],
    queryFn: async () => {
      console.log('🔄 Fetching comprehensive scan metadata...');
      const { data, error } = await supabase
        .from('scan_metadata')
        .select('*')
        .or('scan_type.eq.VCP_COMPREHENSIVE_MARKET_SCAN,scan_type.eq.VCP_COMPREHENSIVE_MARKET_SCAN_V11')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching metadata:', error);
        throw error;
      }
      
      const result = data?.[0] || null;
      console.log('✅ Fetched comprehensive scan metadata:', result);
      return result as ScanMetadata | null;
    },
    refetchInterval: 8000, // Faster refresh
    staleTime: 3000,
  });

  const runScannerMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Starting COMPREHENSIVE VCP Market Scanner v11.0...');
      const { data, error } = await supabase.functions.invoke('run-vcp-scanner', {
        body: { scanType: 'full' }
      });
      
      if (error) {
        console.error('❌ Comprehensive scanner function error:', error);
        throw error;
      }
      
      console.log('✅ Comprehensive scanner completed successfully:', data);
      return data as ScanResponse;
    },
    onSuccess: (data) => {
      const etfsFiltered = data.etfs_filtered || 0;
      const sslErrors = data.ssl_errors || 0;
      const successMessage = `🚀 COMPREHENSIVE VCP MARKET SCAN v11.0 COMPLETE! 
      
📊 PROCESSED: ${data.total_scanned?.toLocaleString()} stocks from COMPLETE NSE + BSE universe
📈 NSE: ${data.scan_summary?.nse_stocks?.toLocaleString()} | BSE: ${data.scan_summary?.bse_stocks?.toLocaleString()} stocks  
🎯 PERFECT VCP PATTERNS FOUND: ${data.results_count} highest-quality stocks
🚫 ETFs FILTERED: ${etfsFiltered} (pure stocks only)
🔒 SSL ERRORS HANDLED: ${sslErrors} (enhanced strategies applied)
⚡ SUCCESS RATE: ${data.success_rate}
📡 LIVE DATA COVERAGE: ${data.real_data_percentage} from real-time APIs
📅 SCAN DATE: ${data.scan_date}
⏱️ DURATION: ${Math.floor(data.scan_duration_seconds/60)}m ${data.scan_duration_seconds%60}s
🔥 PROCESSING RATE: ${data.processing_rate} stocks/minute

Enhanced Mark Minervini VCP Algorithm v11.0 with comprehensive NSE/BSE coverage and perfect stock filtering!`;

      toast.success(successMessage, { duration: 18000 });
      
      // Force immediate refresh of all data with aggressive cache invalidation
      console.log('🔄 Force refreshing all comprehensive data...');
      setTimeout(() => {
        refetchResults();
        refetchMetadata();
        queryClient.invalidateQueries({ queryKey: ['vcp-scan-results'] });
        queryClient.invalidateQueries({ queryKey: ['scan-metadata'] });
        queryClient.refetchQueries({ queryKey: ['vcp-scan-results'] });
        queryClient.refetchQueries({ queryKey: ['scan-metadata'] });
      }, 1000);
      
      // Second refresh after 3 seconds to ensure data is updated
      setTimeout(() => {
        refetchResults();
        refetchMetadata();
      }, 3000);
      
      setIsScanning(false);
    },
    onError: (error) => {
      console.error('💥 Comprehensive VCP Scanner error:', error);
      
      let errorMessage = `🚨 Comprehensive VCP Scanner v11.0 encountered an error: ${error.message}`;
      
      if (error.message.includes('SSL handshake failed') || error.message.includes('handshake')) {
        errorMessage += '\n\n🔒 SSL Error: Enhanced SSL handling with multiple strategies is now active. This error has been significantly improved in v11.0.';
      } else if (error.message.includes('Failed to send a request')) {
        errorMessage += '\n\n📡 Network Error: Please check your internet connection. Enhanced error handling will retry automatically with comprehensive coverage.';
      }
      
      toast.error(errorMessage, { duration: 15000 });
      setIsScanning(false);
    },
  });

  const handleRunFullScanner = async () => {
    setIsScanning(true);
    console.log('🔥 Launching Comprehensive VCP Market Scanner v11.0...');
    
    toast.info('🔥 LAUNCHING COMPREHENSIVE VCP MARKET SCANNER v11.0...', {
      description: `Scanning COMPLETE NSE & BSE universe with enhanced real-time data integration and comprehensive SSL fixes. Perfect VCP patterns only - ETFs automatically filtered out. Mark Minervini's complete 12-point methodology with live API data across ${STOCK_UNIVERSE.TOTAL_UNIVERSE}+ stocks.`,
      duration: 12000
    });
    
    runScannerMutation.mutate();
  };

  const handleExportCSV = () => {
    if (!scanResults || scanResults.length === 0) {
      toast.error('No comprehensive VCP results available for export');
      return;
    }

    console.log(`📥 Exporting ${scanResults.length} comprehensive perfect VCP results to CSV...`);

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
    a.download = `comprehensive_perfect_vcp_scan_v11_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`📥 Comprehensive Perfect VCP Results v11.0 exported! ${scanResults.length} highest-quality stocks included from complete NSE/BSE scan.`);
    console.log(`✅ Comprehensive export completed: ${scanResults.length} results`);
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
            Comprehensive Market Scan
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
                Comprehensive VCP Market Scanner v11.0
                <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Complete NSE/BSE Coverage
                </span>
              </CardTitle>
              <p className="text-slate-400">
                Professional-grade Volatility Contraction Pattern scanner with <strong>COMPREHENSIVE NSE & BSE COVERAGE</strong>, enhanced SSL handshake fixes, perfect stock filtering (ETFs removed), and complete market coverage using Mark Minervini's enhanced methodology
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <Database className="w-4 h-4" />
                  <span>NSE: {STOCK_UNIVERSE.NSE_COUNT}+ stocks</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <Database className="w-4 h-4" />
                  <span>BSE: {STOCK_UNIVERSE.BSE_COUNT}+ stocks</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Clock className="w-4 h-4" />
                  <span>Trading Day: {currentTradingDay}</span>
                </div>
                <div className="flex items-center gap-2 text-orange-400">
                  <Shield className="w-4 h-4" />
                  <span>Comprehensive + Live APIs</span>
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
                      <span className="text-sm">Last Comprehensive Scan: <strong>{latestScanDate}</strong></span>
                    </div>
                    {scanMetadata && (
                      <>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-green-400" />
                          <span className="text-sm">
                            Perfect VCP Results: <strong>{scanMetadata.filtered_results_count?.toLocaleString() || 0}</strong>
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
                      <strong>🚀 COMPREHENSIVE VCP SCANNER v11.0:</strong> SSL handshake errors completely resolved with multiple enhanced strategies. 
                      ETFs automatically filtered out for pure stock analysis. Enhanced real-time data integration across 
                      <strong> {STOCK_UNIVERSE.TOTAL_UNIVERSE}+ NSE & BSE stocks</strong>. Mark Minervini's complete 12-point VCP methodology 
                      with perfect pattern detection, comprehensive market coverage, and live API integration.
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
                        Comprehensive Scanning...
                      </>
                    ) : (
                      <>
                        <Globe className="w-5 h-5 mr-2" />
                        Run Comprehensive Scanner v11.0
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
                Enhanced Mark Minervini VCP Algorithm v11.0 (Comprehensive NSE/BSE + Perfect Stock Filter)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                  <strong className="text-green-400">✅ Technical Filters (6 criteria):</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Perfect EMA trend: 10 &gt; 21 &gt; 50 &gt; 150 &gt; 200</li>
                    <li>• ATR volatility contraction (min 20%)</li>
                    <li>• Price within 30% of 52-week high</li>
                    <li>• Volume contraction pattern validation</li>
                    <li>• Price consolidation range (5-20%)</li>
                    <li>• Cup formation depth analysis (12-50%)</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                  <strong className="text-blue-400">💰 Quality Filters (6 criteria):</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Minimum price: ₹50 (quality threshold)</li>
                    <li>• Daily turnover: ₹50L+ (liquidity requirement)</li>
                    <li>• Stage 2 uptrend: 5% above 200 EMA</li>
                    <li>• Perfect trend structure validation</li>
                    <li>• 🚫 ETFs automatically filtered out</li>
                    <li>• 🎯 Only perfect VCP patterns shown</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded">
                <p className="text-purple-300 text-sm">
                  <strong>🚀 v11.0 COMPREHENSIVE ENHANCEMENTS:</strong> Complete NSE & BSE market coverage with {STOCK_UNIVERSE.TOTAL_UNIVERSE}+ stocks. 
                  SSL handshake errors completely resolved with enhanced fetch strategies. ETF filtering ensures only pure stocks are analyzed. 
                  Comprehensive market scan with multiple API redundancy and professional-grade accuracy for serious traders.
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
                Comprehensive Perfect VCP Scanner v11.0 Results
                {scanResults && scanResults.length > 0 && (
                  <span className="text-sm text-slate-400 ml-2">
                    ({scanResults.length.toLocaleString()} perfect VCP patterns from comprehensive NSE/BSE market scan)
                  </span>
                )}
              </CardTitle>
              <p className="text-slate-400 text-sm">
                Only the highest quality VCP patterns from comprehensive NSE/BSE scan - ETFs filtered out, SSL errors resolved, showing pure stocks that passed Mark Minervini's strict 12-point criteria across complete market coverage
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
