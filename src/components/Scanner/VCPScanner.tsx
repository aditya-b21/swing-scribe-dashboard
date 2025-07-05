
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Download, RefreshCw, Calendar, TrendingUp, BarChart3, Clock } from 'lucide-react';
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
        .limit(100);

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
        .eq('scan_type', 'VCP')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ScanMetadata | null;
    },
  });

  // Run VCP Scanner mutation
  const runScannerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('run-vcp-scanner', {
        body: {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`VCP Scanner completed! Found ${data.results_count} stocks matching VCP criteria for ${data.scan_date}.`);
      queryClient.invalidateQueries({ queryKey: ['vcp-scan-results'] });
      queryClient.invalidateQueries({ queryKey: ['scan-metadata'] });
      setIsScanning(false);
    },
    onError: (error) => {
      console.error('Scanner error:', error);
      toast.error('Scanner failed to run. Please try again.');
      setIsScanning(false);
    },
  });

  const handleRunScanner = async () => {
    setIsScanning(true);
    toast.info('Starting VCP Scanner for last market close data... This may take a few minutes.');
    runScannerMutation.mutate();
  };

  const handleExportCSV = () => {
    if (!scanResults || scanResults.length === 0) {
      toast.error('No data to export');
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
    a.download = `vcp_scan_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('VCP Results exported to CSV');
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
      {/* Header Card */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-2xl">
            <Zap className="w-6 h-6 text-yellow-400" />
            VCP Algo Inbuilt Scanner
          </CardTitle>
          <p className="text-slate-400">
            Professional Volatility Contraction Pattern scanner based on Mark Minervini's methodology
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <Clock className="w-4 h-4" />
              <span>Market Close: 3:30 PM IST</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Calendar className="w-4 h-4" />
              <span>Last Trading Day: {lastTradingDay}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Control Panel */}
      <Card className="glass-effect">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Last Scan: {latestScanDate}</span>
              </div>
              {scanMetadata && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">
                    {scanMetadata.filtered_results_count} VCP patterns found
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRunScanner}
                disabled={isScanning}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run Scanner (Last Market Close Data)
                  </>
                )}
              </Button>

              <Button
                onClick={handleExportCSV}
                variant="outline"
                disabled={!scanResults || scanResults.length === 0}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VCP Filter Conditions Info */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-white text-lg">Mark Minervini's VCP Filter Conditions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>• ATR(14) &lt; ATR(14) 10 days ago</div>
            <div>• ATR(14) / Close &lt; 0.08</div>
            <div>• Close &gt; 0.75 × 52-week High</div>
            <div>• EMA(50) &gt; EMA(150) &gt; EMA(200)</div>
            <div>• Close &gt; EMA(50)</div>
            <div>• Close &gt; ₹10</div>
            <div>• Close × Volume &gt; ₹1 Crore</div>
            <div>• Volume &lt; 20-day average</div>
            <div>• (Max 5-day High - Min 5-day Low) / Close &lt; 0.08</div>
            <div>• Breakout: Close crosses 20-day High + Volume spike</div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Statistics */}
      <VCPScanStats metadata={scanMetadata} />

      {/* Results Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-green-400" />
            VCP Scanner Results
            {scanResults && scanResults.length > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                ({scanResults.length} stocks match VCP criteria)
              </span>
            )}
          </CardTitle>
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
