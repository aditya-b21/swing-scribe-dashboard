
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Download, RefreshCw, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
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
        body: { scan_date: new Date().toISOString().split('T')[0] }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('VCP Scanner completed successfully!');
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
    toast.info('Starting VCP Scanner... This may take a few minutes.');
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
      'Close Price',
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
    
    toast.success('Results exported to CSV');
  };

  const latestScanDate = scanMetadata?.scan_date 
    ? new Date(scanMetadata.scan_date).toLocaleDateString('en-IN')
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
                    {scanMetadata.filtered_results_count} results found
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
                    Run VCP Scanner
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

      {/* Scan Statistics */}
      <VCPScanStats metadata={scanMetadata} />

      {/* Results Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-green-400" />
            VCP Scanner Results
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
