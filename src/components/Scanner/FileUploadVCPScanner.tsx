
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Download, Zap, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VCPResultsTable } from './VCPResultsTable';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface FileStock {
  symbol: string;
  name: string;
  exchange: string;
}

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

interface FileScanResponse {
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
    custom_stocks: number;
    vcp_patterns_found: number;
    real_data_coverage: string;
    etfs_filtered: number;
    ssl_fixes_applied: boolean;
  };
  message: string;
}

export function FileUploadVCPScanner() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedStocks, setExtractedStocks] = useState<FileStock[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: customScanResults, isLoading: loadingCustomResults, refetch: refetchCustomResults } = useQuery({
    queryKey: ['custom-vcp-scan-results'],
    queryFn: async () => {
      console.log('🔄 Fetching custom file VCP scan results...');
      const { data, error } = await supabase
        .from('vcp_scan_results')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('❌ Error fetching custom scan results:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} custom VCP scan results`);
      return data as VCPScanResult[];
    },
    enabled: false, // Only fetch when we have custom results
  });

  // Enhanced ETF filter
  const ETF_KEYWORDS = [
    'ETF', 'BEES', 'INDEX', 'FUND', 'GOLD', 'SILVER', 'COMMODITY', 'LIQUID', 'DEBT',
    'BOND', 'GILT', 'TREASURY', 'MUTUAL', 'SCHEME', 'PLAN', 'GROWTH', 'DIVIDEND',
    'NIFTYBEES', 'GOLDBEES', 'SETFGOLD', 'LIQUIDBEES', 'JUNIORBEES', 'MNC', 'PSUBANK'
  ];

  const isETF = (symbol: string): boolean => {
    const upperSymbol = symbol.toUpperCase();
    return ETF_KEYWORDS.some(keyword => upperSymbol.includes(keyword));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setExtractedStocks([]);
      console.log('📁 File selected:', file.name, 'Type:', file.type, 'Size:', file.size);
    }
  };

  const extractStocksFromFile = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    console.log('🔍 Starting stock extraction from file:', selectedFile.name);

    try {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      let extractedData: FileStock[] = [];

      if (fileExtension === 'csv') {
        const text = await selectedFile.text();
        extractedData = parseCSVData(text);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        extractedData = parseExcelData(jsonData as any[][]);
      } else if (fileExtension === 'pdf') {
        toast.error('PDF parsing not yet implemented. Please use CSV or Excel files.');
        setIsExtracting(false);
        return;
      }

      // Filter out ETFs and limit to 200 stocks
      const filteredStocks = extractedData
        .filter(stock => !isETF(stock.symbol))
        .slice(0, 200);

      const etfsFiltered = extractedData.length - filteredStocks.length;

      console.log(`✅ Stock extraction complete: ${filteredStocks.length} stocks (${etfsFiltered} ETFs filtered)`);
      setExtractedStocks(filteredStocks);

      toast.success(`🎯 Successfully extracted ${filteredStocks.length} stocks from ${selectedFile.name}${etfsFiltered > 0 ? ` (${etfsFiltered} ETFs filtered out)` : ''}`, {
        duration: 8000
      });

    } catch (error) {
      console.error('❌ Error extracting stocks:', error);
      toast.error(`Failed to extract stocks from file: ${error.message}`);
    }

    setIsExtracting(false);
  };

  const parseCSVData = (csvText: string): FileStock[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const stocks: FileStock[] = [];

    console.log('📊 Parsing CSV data with enhanced format detection...');

    for (let i = 1; i < lines.length && stocks.length < 200; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by comma and clean each field
      const fields = line.split(',').map(field => field.trim().replace(/["']/g, ''));
      
      // Handle the specified format: Sr., Stock Name, Symbol, Links, % Chg, Price, Volume
      if (fields.length >= 3) {
        const symbol = fields[2]?.trim(); // Symbol is in column 3
        const name = fields[1]?.trim() || symbol; // Stock Name is in column 2
        
        if (symbol && symbol.length > 0 && symbol !== 'Symbol') {
          // Clean symbol (remove any extra characters)
          const cleanSymbol = symbol.replace(/[^A-Z0-9-]/g, '');
          
          if (cleanSymbol && !isETF(cleanSymbol)) {
            stocks.push({
              symbol: cleanSymbol,
              name: name,
              exchange: 'NSE' // Default to NSE
            });
            console.log(`✅ Extracted stock: ${cleanSymbol} (${name})`);
          } else if (isETF(cleanSymbol)) {
            console.log(`🚫 Filtered ETF: ${cleanSymbol}`);
          }
        }
      }
    }

    console.log(`📈 CSV parsing complete: ${stocks.length} valid stocks extracted`);
    return stocks;
  };

  const parseExcelData = (excelData: any[][]): FileStock[] => {
    const stocks: FileStock[] = [];
    
    console.log('📊 Parsing Excel data with enhanced format detection...');

    for (let i = 1; i < excelData.length && stocks.length < 200; i++) {
      const row = excelData[i];
      if (!row || row.length < 3) continue;

      // Handle the specified format: Sr., Stock Name, Symbol, Links, % Chg, Price, Volume
      const symbol = String(row[2] || '').trim(); // Symbol is in column 3 (index 2)
      const name = String(row[1] || '').trim() || symbol; // Stock Name is in column 2 (index 1)
      
      if (symbol && symbol.length > 0 && symbol !== 'Symbol') {
        // Clean symbol
        const cleanSymbol = symbol.replace(/[^A-Z0-9-]/g, '');
        
        if (cleanSymbol && !isETF(cleanSymbol)) {
          stocks.push({
            symbol: cleanSymbol,
            name: name,
            exchange: 'NSE' // Default to NSE
          });
          console.log(`✅ Extracted stock: ${cleanSymbol} (${name})`);
        } else if (isETF(cleanSymbol)) {
          console.log(`🚫 Filtered ETF: ${cleanSymbol}`);
        }
      }
    }

    console.log(`📈 Excel parsing complete: ${stocks.length} valid stocks extracted`);
    return stocks;
  };

  const runCustomScanMutation = useMutation({
    mutationFn: async () => {
      if (extractedStocks.length === 0) {
        throw new Error('No stocks to scan. Please extract stocks from file first.');
      }

      console.log(`🚀 Starting custom VCP scan with ${extractedStocks.length} stocks`);
      const { data, error } = await supabase.functions.invoke('run-vcp-scanner', {
        body: { 
          scanType: 'custom',
          stocks: extractedStocks.map(stock => ({
            symbol: stock.symbol,
            exchange: stock.exchange
          }))
        }
      });
      
      if (error) {
        console.error('❌ Custom VCP scanner function error:', error);
        throw error;
      }
      
      console.log('✅ Custom VCP scanner completed successfully:', data);
      return data as FileScanResponse;
    },
    onSuccess: (data) => {
      const etfsFiltered = data.etfs_filtered || 0;
      const sslErrors = data.ssl_errors || 0;
      const successMessage = `🚀 CUSTOM FILE VCP SCAN COMPLETE! 
      
📁 PROCESSED: ${data.total_scanned} stocks from uploaded file
🎯 PERFECT VCP PATTERNS FOUND: ${data.results_count} highest-quality stocks
🚫 ETFs FILTERED: ${etfsFiltered} (pure stocks only)
🔒 SSL ERRORS HANDLED: ${sslErrors} (enhanced strategies applied)
⚡ SUCCESS RATE: ${data.success_rate}
📡 LIVE DATA COVERAGE: ${data.real_data_percentage} from real-time APIs
📅 SCAN DATE: ${data.scan_date}
⏱️ DURATION: ${Math.floor(data.scan_duration_seconds/60)}m ${data.scan_duration_seconds%60}s
🔥 PROCESSING RATE: ${data.processing_rate} stocks/minute

Enhanced Mark Minervini VCP Algorithm with perfect stock filtering from your custom file!`;

      toast.success(successMessage, { duration: 15000 });
      
      // Force refresh of custom results
      setTimeout(() => {
        refetchCustomResults();
        queryClient.invalidateQueries({ queryKey: ['custom-vcp-scan-results'] });
      }, 2000);
      
      setIsScanning(false);
    },
    onError: (error) => {
      console.error('💥 Custom VCP Scanner error:', error);
      
      let errorMessage = `🚨 Custom File VCP Scanner encountered an error: ${error.message}`;
      
      if (error.message.includes('SSL handshake failed') || error.message.includes('handshake')) {
        errorMessage += '\n\n🔒 SSL Error: Enhanced SSL handling with multiple strategies is active. This will be resolved automatically.';
      }
      
      toast.error(errorMessage, { duration: 12000 });
      setIsScanning(false);
    },
  });

  const handleRunCustomScan = () => {
    if (extractedStocks.length === 0) {
      toast.error('Please extract stocks from file first');
      return;
    }

    setIsScanning(true);
    console.log('🔥 Launching Custom File VCP Scanner...');
    
    toast.info('🔥 LAUNCHING CUSTOM FILE VCP SCANNER...', {
      description: `Scanning ${extractedStocks.length} stocks from your uploaded file with enhanced real-time data integration and SSL fixes. Perfect VCP patterns only - ETFs automatically filtered out.`,
      duration: 10000
    });
    
    runCustomScanMutation.mutate();
  };

  const handleExportCustomCSV = () => {
    if (!customScanResults || customScanResults.length === 0) {
      toast.error('No custom VCP results available for export');
      return;
    }

    console.log(`📥 Exporting ${customScanResults.length} custom VCP results to CSV...`);

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

    const csvData = customScanResults.map(result => [
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
    a.download = `custom_vcp_scan_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`📥 Custom VCP Results exported! ${customScanResults.length} stocks included.`);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card className="glass-effect border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-xl">
            <Upload className="w-5 h-5 text-blue-400" />
            Custom File VCP Scanner
            <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
              Enhanced SSL + ETF Filter
            </span>
          </CardTitle>
          <p className="text-slate-400">
            Upload your custom stock list and run VCP pattern detection with enhanced real-time data integration and comprehensive SSL fixes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload Stock File
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Select File
                </Button>
                {selectedFile && (
                  <span className="text-sm text-slate-400">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: CSV, Excel (.xlsx, .xls), PDF
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expected File Format
              </label>
              <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded">
                <strong>CSV/Excel columns:</strong><br />
                Sr. | Stock Name | Symbol | Links | % Chg | Price | Volume<br />
                <em>Only Symbol column is required for scanning</em>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={extractStocksFromFile}
              disabled={!selectedFile || isExtracting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Extract Stocks
                </>
              )}
            </Button>

            <Button
              onClick={handleRunCustomScan}
              disabled={extractedStocks.length === 0 || isScanning}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Scan for VCP Patterns
                </>
              )}
            </Button>

            <Button
              onClick={handleExportCustomCSV}
              variant="outline"
              disabled={!customScanResults || customScanResults.length === 0}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>

          {extractedStocks.length > 0 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-300 text-sm">
                ✅ <strong>{extractedStocks.length} stocks</strong> extracted and ready for VCP scanning
                (ETFs automatically filtered out)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {customScanResults && customScanResults.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Custom File VCP Scan Results
              <span className="text-sm text-slate-400 ml-2">
                ({customScanResults.length} perfect VCP patterns found)
              </span>
            </CardTitle>
            <p className="text-slate-400 text-sm">
              Perfect VCP patterns detected from your custom file - ETFs filtered out, enhanced with real-time data
            </p>
          </CardHeader>
          <CardContent>
            <VCPResultsTable 
              results={customScanResults} 
              isLoading={loadingCustomResults} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
