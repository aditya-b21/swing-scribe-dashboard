
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Volume, Zap } from 'lucide-react';

interface VCPResult {
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

interface VCPResultsTableProps {
  results: VCPResult[];
  isLoading: boolean;
}

export function VCPResultsTable({ results, isLoading }: VCPResultsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-slate-700/50 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-800/50 border-slate-700">
        <div className="text-slate-400 space-y-2">
          <Zap className="w-12 h-12 mx-auto opacity-50" />
          <h3 className="text-lg font-medium">No VCP Results Yet</h3>
          <p className="text-sm">
            Click "Run VCP Scanner" to analyze stocks for Volatility Contraction Patterns
          </p>
        </div>
      </Card>
    );
  }

  const formatVolume = (volume: number) => {
    if (volume >= 10000000) return `${(volume / 10000000).toFixed(1)}Cr`;
    if (volume >= 100000) return `${(volume / 100000).toFixed(1)}L`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  const formatPrice = (price: number) => `₹${price.toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Mobile/Tablet responsive cards */}
      <div className="block lg:hidden space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="p-4 bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">{result.symbol}</h3>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {result.exchange}
                  </Badge>
                </div>
                {result.breakout_signal && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Zap className="w-3 h-3 mr-1" />
                    Breakout
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-slate-400">Close Price</span>
                  <div className="font-medium text-white">{formatPrice(result.close_price)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Volume</span>
                  <div className="font-medium text-white flex items-center gap-1">
                    <Volume className="w-3 h-3" />
                    {formatVolume(result.volume)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">From 52W High</span>
                  <div className="font-medium text-white flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {result.percent_from_52w_high?.toFixed(1) || 'N/A'}%
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Vol. Contraction</span>
                  <div className="font-medium text-white">
                    {result.volatility_contraction?.toFixed(3) || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-slate-300 font-medium">Stock</th>
                <th className="text-right p-3 text-slate-300 font-medium">Close</th>
                <th className="text-right p-3 text-slate-300 font-medium">Volume</th>
                <th className="text-right p-3 text-slate-300 font-medium">% from 52W High</th>
                <th className="text-right p-3 text-slate-300 font-medium">ATR(14)</th>
                <th className="text-right p-3 text-slate-300 font-medium">EMA Trend</th>
                <th className="text-center p-3 text-slate-300 font-medium">Breakout</th>
                <th className="text-right p-3 text-slate-300 font-medium">Vol. Contract</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr 
                  key={result.id} 
                  className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${
                    index % 2 === 0 ? 'bg-slate-900/20' : ''
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{result.symbol}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {result.exchange}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium text-white">
                    {formatPrice(result.close_price)}
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {formatVolume(result.volume)}
                  </td>
                  <td className="p-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-slate-300">
                      <TrendingUp className="w-3 h-3" />
                      {result.percent_from_52w_high?.toFixed(1) || 'N/A'}%
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {result.atr_14?.toFixed(3) || 'N/A'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {result.ema_50 && result.ema_150 && result.ema_200 ? (
                        result.ema_50 > result.ema_150 && result.ema_150 > result.ema_200 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {result.breakout_signal ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Zap className="w-3 h-3 mr-1" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        No
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {result.volatility_contraction?.toFixed(3) || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
