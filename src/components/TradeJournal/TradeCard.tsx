
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trade } from '@/types/trade';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TradeCardProps {
  trade: Trade;
  onUpdate: () => void;
}

export function TradeCard({ trade, onUpdate }: TradeCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getSetupColor = (setup: string) => {
    switch (setup) {
      case 'VCP Setup A1': return 'bg-blue-600/30 text-blue-300 border border-blue-500/50 font-bold text-sm px-3 py-1 rounded-full shadow-lg';
      case 'Rocket Base A2': return 'bg-green-600/30 text-green-300 border border-green-500/50 font-bold text-sm px-3 py-1 rounded-full shadow-lg';
      case 'IPO Base A3': return 'bg-purple-600/30 text-purple-300 border border-purple-500/50 font-bold text-sm px-3 py-1 rounded-full shadow-lg';
      case 'Extra Setup': return 'bg-orange-600/30 text-orange-300 border border-orange-500/50 font-bold text-sm px-3 py-1 rounded-full shadow-lg';
      default: return 'bg-gray-600/30 text-gray-300 border border-gray-500/50 font-bold text-sm px-3 py-1 rounded-full shadow-lg';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', trade.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      toast.success('Trade deleted successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to delete trade:', error);
      toast.error('Failed to delete trade');
    } finally {
      setIsDeleting(false);
    }
  };

  const isProfit = trade.profit_loss && trade.profit_loss > 0;
  const isLoss = trade.profit_loss && trade.profit_loss < 0;

  return (
    <Card className="glass-effect border-white/10 card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-accent-blue">{trade.stock_name}</h3>
              <div className={getSetupColor(trade.setup_name)}>
                {trade.setup_name}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Buy Price</span>
                <p className="font-medium">{formatCurrency(trade.buy_price)}</p>
              </div>
              
              {trade.sell_price && (
                <div>
                  <span className="text-text-secondary">Sell Price</span>
                  <p className="font-medium">{formatCurrency(trade.sell_price)}</p>
                </div>
              )}
              
              <div>
                <span className="text-text-secondary">Quantity</span>
                <p className="font-medium">{trade.quantity}</p>
              </div>

              {trade.profit_loss !== null && (
                <div>
                  <span className="text-text-secondary">P&L</span>
                  <p className={`font-medium flex items-center gap-1 ${
                    isProfit ? 'text-profit-green' : isLoss ? 'text-loss-red' : ''
                  }`}>
                    {isProfit && <TrendingUp className="w-4 h-4" />}
                    {isLoss && <TrendingDown className="w-4 h-4" />}
                    {formatCurrency(trade.profit_loss)}
                  </p>
                </div>
              )}

              {trade.return_percentage !== null && (
                <div>
                  <span className="text-text-secondary">Return</span>
                  <p className={`font-medium ${
                    trade.return_percentage > 0 ? 'text-profit-green' : 'text-loss-red'
                  }`}>
                    {formatPercentage(trade.return_percentage)}
                  </p>
                </div>
              )}
            </div>

            <div className="text-xs text-text-secondary">
              {new Date(trade.trade_date).toLocaleDateString('en-IN')}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {trade.chart_image_url && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-white/20">
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{trade.stock_name} Chart</DialogTitle>
                  </DialogHeader>
                  <img
                    src={trade.chart_image_url}
                    alt={`${trade.stock_name} chart`}
                    className="w-full h-auto rounded-lg"
                    onError={(e) => {
                      console.error('Image failed to load:', trade.chart_image_url);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-white/20"
              onClick={() => {
                toast.info('Edit functionality coming soon!');
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
