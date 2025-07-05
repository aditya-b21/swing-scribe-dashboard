
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Clock, Search, TrendingUp } from 'lucide-react';

interface ScanMetadata {
  id: string;
  scan_date: string;
  total_stocks_scanned: number | null;
  filtered_results_count: number | null;
  scan_duration_seconds: number | null;
  status: string | null;
  created_at: string;
}

interface VCPScanStatsProps {
  metadata: ScanMetadata | null | undefined;
}

export function VCPScanStats({ metadata }: VCPScanStatsProps) {
  if (!metadata) {
    return null;
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const successRate = metadata.total_stocks_scanned && metadata.filtered_results_count
    ? ((metadata.filtered_results_count / metadata.total_stocks_scanned) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="glass-effect">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Stocks Scanned</p>
              <p className="text-white text-xl font-bold">
                {metadata.total_stocks_scanned?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">VCP Matches</p>
              <p className="text-white text-xl font-bold">
                {metadata.filtered_results_count?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Success Rate</p>
              <p className="text-white text-xl font-bold">{successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Scan Duration</p>
              <p className="text-white text-xl font-bold">
                {formatDuration(metadata.scan_duration_seconds)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
