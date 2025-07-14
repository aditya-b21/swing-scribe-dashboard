
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Play, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UploadedStock {
  symbol: string;
  exchange: string;
  stockName?: string;
  currentPrice?: number;
  volume?: number;
  changePercent?: number;
}

interface VCPFileResult {
  symbol: string;
  exchange: string;
  close_price: number;
  pattern_stage: string;
  breakout_zone: number;
  risk_area: number;
  volume_drop_percent: number;
  remarks: string;
  percent_from_52w_high: number;
  volume: number;
}

export function FileUploadVCPScanner() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedStocks, setExtractedStocks] = useState<UploadedStock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<VCPFileResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf'
    ];

    // Also check file extension for better detection
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['csv', 'xlsx', 'xls', 'pdf'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV, Excel (.xlsx, .xls), or PDF file",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      await extractStocksFromFile(file);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "File Processing Error",
        description: "Failed to extract stock symbols from the file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const extractStocksFromFile = async (file: File) => {
    const text = await file.text();
    const stocks: UploadedStock[] = [];

    try {
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        // Enhanced CSV parsing for the specific format
        const lines = text.split('\n').filter(line => line.trim());
        console.log('📄 Processing CSV with', lines.length, 'lines');
        
        // Skip header row and process data rows
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by comma, but handle quoted fields
          const values = line.split(',').map(val => val.trim().replace(/['"]/g, ''));
          
          if (values.length >= 3) {
            // Expected format: Sr., Stock Name, Symbol, Links, % Chg, Price, Volume
            const sr = values[0];
            const stockName = values[1];
            const symbol = values[2];
            const changePercent = values[4] ? parseFloat(values[4].replace('%', '')) : undefined;
            const price = values[5] ? parseFloat(values[5]) : undefined;
            const volume = values[6] ? parseInt(values[6].replace(/,/g, '')) : undefined;
            
            // Clean and validate symbol
            const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            if (cleanSymbol && cleanSymbol.length >= 2 && cleanSymbol.length <= 20) {
              stocks.push({
                symbol: cleanSymbol,
                exchange: 'NSE', // Default to NSE, can be changed if needed
                stockName: stockName || cleanSymbol,
                currentPrice: price,
                volume: volume,
                changePercent: changePercent
              });
              
              console.log(`✅ Extracted: ${cleanSymbol} (${stockName}) - ₹${price}`);
            }
          }
        }
        
        // If the above format doesn't work, try extracting symbols from any column
        if (stocks.length === 0) {
          console.log('📄 Trying alternative CSV parsing...');
          
          for (const line of lines) {
            const values = line.split(',');
            for (const value of values) {
              const cleanValue = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
              if (cleanValue.length >= 2 && cleanValue.length <= 20 && /^[A-Z]/.test(cleanValue)) {
                stocks.push({
                  symbol: cleanValue,
                  exchange: 'NSE'
                });
              }
            }
          }
        }
        
      } else if (file.type.includes('sheet') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        // For Excel files, extract text and look for stock symbols
        console.log('📄 Processing Excel file...');
        const lines = text.split('\n');
        for (const line of lines) {
          const words = line.split(/[\s,\t]+/);
          for (const word of words) {
            const symbol = word.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (symbol.length >= 2 && symbol.length <= 20 && /^[A-Z]/.test(symbol)) {
              stocks.push({
                symbol,
                exchange: 'NSE'
              });
            }
          }
        }
      } else if (file.type === 'application/pdf') {
        // Basic PDF text extraction (looking for stock patterns)
        console.log('📄 Processing PDF file...');
        const lines = text.split('\n');
        for (const line of lines) {
          const matches = line.match(/\b[A-Z]{2,10}\b/g);
          if (matches) {
            for (const match of matches) {
              if (match.length >= 2 && match.length <= 10) {
                stocks.push({
                  symbol: match,
                  exchange: 'NSE'
                });
              }
            }
          }
        }
      }

      // Remove duplicates and limit to 200 stocks
      const uniqueStocks = stocks
        .filter((stock, index, self) => 
          self.findIndex(s => s.symbol === stock.symbol) === index
        )
        .slice(0, 200);

      setExtractedStocks(uniqueStocks);

      console.log(`✅ Successfully extracted ${uniqueStocks.length} unique stocks:`, uniqueStocks.map(s => s.symbol).join(', '));

      toast({
        title: "File Processed Successfully",
        description: `Extracted ${uniqueStocks.length} unique stock symbols (limited to 200)`,
      });

    } catch (error) {
      console.error('File parsing error:', error);
      throw new Error('Failed to parse file content. Please check the file format.');
    }
  };

  const runVCPScan = async () => {
    if (extractedStocks.length === 0) {
      toast({
        title: "No Stocks to Scan",
        description: "Please upload a file with stock symbols first",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanResults([]);

    try {
      console.log('🔍 Starting custom VCP scan with', extractedStocks.length, 'stocks');
      
      toast({
        title: "🔍 Starting Custom VCP Scan",
        description: `Analyzing ${extractedStocks.length} stocks from your uploaded file with live market data`,
      });

      const { data, error } = await supabase.functions.invoke('run-vcp-scanner', {
        body: {
          scanType: 'custom',
          stocks: extractedStocks
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('📊 VCP scan response:', data);

      if (data.success && data.results) {
        setScanResults(data.results);
        
        toast({
          title: "🎯 Custom VCP Scan Complete!",
          description: `Found ${data.results.length} VCP patterns from ${data.total_scanned} stocks analyzed`,
        });
      } else {
        throw new Error(data.error || 'Scan failed');
      }

    } catch (error) {
      console.error('VCP Scan error:', error);
      toast({
        title: "Scan Error",
        description: error.message || "Failed to complete VCP scan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const exportResults = () => {
    if (scanResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please run a scan first",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = [
      'Stock Symbol',
      'Exchange',
      'Current Price (₹)',
      'Pattern Stage',
      'Breakout Zone (₹)',
      'Risk Area (₹)',
      'Volume Drop %',
      'Remarks',
      '% from 52W High',
      'Current Volume'
    ];

    const csvData = scanResults.map(result => [
      result.symbol,
      result.exchange,
      result.close_price,
      result.pattern_stage,
      result.breakout_zone,
      result.risk_area,
      result.volume_drop_percent,
      result.remarks,
      result.percent_from_52w_high,
      result.volume
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_vcp_scan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Results Exported",
      description: `${scanResults.length} VCP results exported to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card className="glass-effect border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-xl">
            <Upload className="w-5 h-5 text-blue-400" />
            Custom VCP Scanner - File Upload
          </CardTitle>
          <p className="text-slate-400">
            Upload your stock list (.csv, .xlsx, .xls, .pdf) and run VCP analysis with live market data
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {!uploadedFile ? (
              <div>
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 mb-2">
                  Click to upload your stock list
                </p>
                <p className="text-sm text-slate-500">
                  Supports CSV, Excel (.xlsx, .xls), and PDF files
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Expected CSV format: Sr., Stock Name, Symbol, Links, % Chg, Price, Volume
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mt-4"
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>File uploaded: {uploadedFile.name}</span>
                </div>
                
                {extractedStocks.length > 0 && (
                  <div className="text-sm text-slate-300">
                    <p>📊 Extracted {extractedStocks.length} stock symbols</p>
                    <div className="mt-2 p-2 bg-slate-800 rounded text-xs max-h-32 overflow-y-auto">
                      {extractedStocks.slice(0, 20).map((stock, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1">
                          <span className="font-mono">{stock.symbol}</span>
                          {stock.stockName && stock.stockName !== stock.symbol && (
                            <span className="text-slate-500 text-xs truncate ml-2">{stock.stockName}</span>
                          )}
                          {stock.currentPrice && (
                            <span className="text-green-400 text-xs">₹{stock.currentPrice}</span>
                          )}
                        </div>
                      ))}
                      {extractedStocks.length > 20 && (
                        <p className="text-slate-500 text-center mt-2">...and {extractedStocks.length - 20} more</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                  >
                    Upload Different File
                  </Button>
                  
                  <Button
                    onClick={runVCPScan}
                    disabled={extractedStocks.length === 0 || isScanning}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isScanning ? (
                      <>
                        <Play className="w-4 h-4 mr-2 animate-spin" />
                        Scanning {extractedStocks.length} Stocks...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run VCP Scan ({extractedStocks.length} stocks)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {scanResults.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="w-5 h-5 text-green-400" />
                VCP Scan Results ({scanResults.length} patterns found)
              </CardTitle>
              <Button
                onClick={exportResults}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock Symbol</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Pattern Stage</TableHead>
                    <TableHead>Breakout Zone</TableHead>
                    <TableHead>Risk Area</TableHead>
                    <TableHead>Volume Drop %</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {result.symbol}
                        <div className="text-xs text-slate-500">{result.exchange}</div>
                      </TableCell>
                      <TableCell>₹{result.close_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.pattern_stage === 'Breakout' 
                            ? 'bg-green-500/20 text-green-400'
                            : result.pattern_stage === 'Stage 3'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {result.pattern_stage}
                        </span>
                      </TableCell>
                      <TableCell>₹{result.breakout_zone.toFixed(2)}</TableCell>
                      <TableCell>₹{result.risk_area.toFixed(2)}</TableCell>
                      <TableCell>{result.volume_drop_percent.toFixed(1)}%</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.remarks === 'Breakout Confirmed'
                            ? 'bg-green-500/20 text-green-400'
                            : result.remarks === 'Near Breakout'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {result.remarks}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            How to Use Custom VCP Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-blue-400 font-medium mb-2">📁 File Upload</h4>
              <ul className="space-y-1 text-xs">
                <li>• Supports CSV, Excel (.xlsx, .xls), and PDF files</li>
                <li>• Extract up to 200 stock symbols automatically</li>
                <li>• Expected CSV format: Sr., Stock Name, Symbol, Links, % Chg, Price, Volume</li>
                <li>• Stock symbols should be in NSE/BSE format</li>
                <li>• File size limit: 10MB</li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-400 font-medium mb-2">🔍 VCP Analysis</h4>
              <ul className="space-y-1 text-xs">
                <li>• Real-time market data from multiple APIs</li>
                <li>• Mark Minervini's 12-point VCP methodology</li>
                <li>• Pattern stage identification</li>
                <li>• Breakout and risk zone calculations</li>
                <li>• Volume contraction analysis</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <p className="text-yellow-300 text-xs">
              <strong>💡 Pro Tip:</strong> For best results, ensure your CSV file contains clear stock symbols. 
              The scanner will automatically detect NSE/BSE symbols and fetch the latest market data for accurate VCP analysis.
              Supported format: Sr., Stock Name, Symbol, Links, % Chg, Price, Volume
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
