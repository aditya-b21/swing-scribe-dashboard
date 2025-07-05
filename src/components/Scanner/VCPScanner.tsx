import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Download, RefreshCw, Calendar, TrendingUp, BarChart3, Clock, Database, Globe, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VCPResultsTable } from './VCPResultsTable';
import { VCPScanStats } from './VCPScanStats';
import { toast } from 'sonner';

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
        .limit(1000); // Increased limit for full market results

      if (error) throw error;
      return data as VCPScanResult[];
    },
  });

  // Fetch scan metadata
  const { data: scanMetadata } = useQuery({
    queryKey: ['scan-metadata'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scan_metadata')
        .select('*')
        .eq('scan_type', 'VCP_FULL_MARKET')
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
      const successMessage = `🚀 FULL MARKET VCP SCAN COMPLETE! 
      
📊 SCANNED: ${data.total_scanned?.toLocaleString()} stocks from entire NSE + BSE universe
📈 NSE: ${data.nse_stocks?.toLocaleString()} stocks | BSE: ${data.bse_stocks?.toLocaleString()} stocks  
🎯 VCP PATTERNS FOUND: ${data.results_count} qualifying stocks
⚡ SUCCESS RATE: ${data.breakdown?.success_rate}
📅 DATA: ${data.scan_date} (Last Market Close)
⏱️ DURATION: ${data.scan_duration}s
🔥 API STATUS: ${data.api_status ? 'Real-time data integration active' : 'Mock data mode'}`;

      toast.success(successMessage, { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ['vcp-scan-results'] });
      queryClient.invalidateQueries({ queryKey: ['scan-metadata'] });
      setIsScanning(false);
    },
    onError: (error) => {
      console.error('Full Market Scanner error:', error);
      toast.error('🚨 Full Market Scanner encountered an error. Please check API configuration and try again.', { duration: 6000 });
      setIsScanning(false);
    },
  });

  const handleRunFullScanner = async () => {
    setIsScanning(true);
    toast.info('🔥 LAUNCHING FULL MARKET VCP SCANNER...', {
      description: `Scanning ALL ${(1800 + 5000).toLocaleString()}+ NSE & BSE stocks with real-time data. This comprehensive scan will take several minutes to process the entire market universe.`,
      duration: 5000
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
            Enhanced VCP Full Market Scanner
            <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
              Complete Universe Coverage
            </span>
          </CardTitle>
          <p className="text-slate-400">
            Professional-grade Volatility Contraction Pattern scanner with <strong>FULL market coverage</strong> across entire NSE & BSE universe using Mark Minervini's algorithmic methodology
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <Database className="w-4 h-4" />
              <span>NSE: 1,800+ stocks</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Database className="w-4 h-4" />
              <span>BSE: 5,000+ stocks</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <Clock className="w-4 h-4" />
              <span>Last Trading Day: {lastTradingDay}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <Settings className="w-4 h-4" />
              <span>Real-time API Integration</span>
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
                  <span className="text-sm">Last Full Scan: <strong>{latestScanDate}</strong></span>
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
                        Universe: <strong>{scanMetadata.total_stocks_scanned?.toLocaleString()}</strong> stocks
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs">
                  <strong>FULL MARKET COVERAGE:</strong> This scanner processes the <em>complete universe</em> of NSE & BSE listed stocks, 
                  ensuring zero VCP opportunities are missed across Indian equity markets. Real-time data integration with multiple API sources.
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
                    Scanning Full Market...
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5 mr-2" />
                    Run Full Market Scanner
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

      {/* Enhanced VCP Filter Conditions Info */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Mark Minervini's VCP Algorithm (Applied to ALL 6,800+ Stocks)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
              <strong className="text-green-400">✅ Technical Filters:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• ATR(14) &lt; ATR(14) 10 days ago</li>
                <li>• ATR(14) / Close &lt; 0.08 (8% volatility limit)</li>
                <li>• Close &gt; 0.75 × 52-week High</li>
                <li>• EMA(50) &gt; EMA(150) &gt; EMA(200)</li>
                <li>• Close &gt; EMA(50)</li>
              </ul>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
              <strong className="text-blue-400">💰 Fundamental Filters:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Close &gt; ₹10 (Minimum price)</li>
                <li>• Close × Volume &gt; ₹1 Crore (Liquidity)</li>
                <li>• Volume &lt; 20-day average (Contraction)</li>
                <li>• 5-day price range / Close &lt; 0.08</li>
                <li>• 🎯 Breakout: Close crosses 20-day High + Volume spike</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded">
            <p className="text-purple-300 text-sm">
              <strong>🚀 ENHANCED FEATURES:</strong> Multi-API integration (Alpha Vantage, Twelve Data, EOD Historical), 
              real-time market data synchronization, comprehensive universe coverage, and professional-grade accuracy for serious traders.
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
