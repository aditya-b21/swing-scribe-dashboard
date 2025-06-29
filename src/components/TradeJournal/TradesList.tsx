import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trade, SetupType } from '@/types/trade';
import { TradeCard } from './TradeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download } from 'lucide-react';
import { toast } from 'sonner';

interface TradesListProps {
  refreshTrigger: number;
}

export function TradesList({ refreshTrigger }: TradesListProps) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [setupFilter, setSetupFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user, refreshTrigger]);

  const fetchTrades = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // Type assertion to ensure setup_name is properly typed
      const typedTrades = (data || []).map(trade => ({
        ...trade,
        setup_name: trade.setup_name as SetupType
      }));
      
      setTrades(typedTrades);
    } catch (error: any) {
      console.error('Error fetching trades:', error);
      toast.error('Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.stock_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSetup = setupFilter === 'all' || trade.setup_name === setupFilter;
    return matchesSearch && matchesSetup;
  });

  const exportTrades = () => {
    if (trades.length === 0) {
      toast.error('No trades to export');
      return;
    }

    try {
      const csvData = trades.map(trade => ({
        'Stock Name': trade.stock_name,
        'Setup': trade.setup_name,
        'Buy Price': trade.buy_price,
        'Sell Price': trade.sell_price || 'N/A',
        'Quantity': trade.quantity,
        'P&L': trade.profit_loss || 'N/A',
        'Return %': trade.return_percentage || 'N/A',
        'Date': new Date(trade.trade_date).toLocaleDateString(),
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Trades exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export trades');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
          <Input
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/20"
          />
        </div>
        
        <Select value={setupFilter} onValueChange={setSetupFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/20">
            <SelectValue placeholder="Filter by setup" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Setups</SelectItem>
            <SelectItem value="VCP Setup A1">VCP Setup A1</SelectItem>
            <SelectItem value="Rocket Base A2">Rocket Base A2</SelectItem>
            <SelectItem value="IPO Base A3">IPO Base A3</SelectItem>
            <SelectItem value="Extra Setup">Extra Setup</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={exportTrades}
          variant="outline"
          className="border-white/20 hover:bg-white/5"
          disabled={trades.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Trades List */}
      {filteredTrades.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          {trades.length === 0 ? 'No trades found. Start by adding your first trade!' : 'No trades match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTrades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <TradeCard trade={trade} onUpdate={fetchTrades} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
