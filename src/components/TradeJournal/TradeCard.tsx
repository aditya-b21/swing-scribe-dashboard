
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
      case 'VCP Setup A1': return 'bg-blue-500/20 text-blue-400';
      case 'Rocket Base A2': return 'bg-green-500/20 text-green-400';
      case 'IPO Base A3': return 'bg-purple-500/20 text-purple-400';
      case 'Extra Setup': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Use type assertion to work around type issues
      const { error } = await (supabase as any)
        .from('trades')
        .delete()
        .eq('id', trade.id);

      if (error) throw error;

      toast.success('Trade deleted successfully');
      onUpdate();
    } catch (error: any) {
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
              <h3 className="text-lg font-semibold text-accent-gold">{trade.stock_name}</h3>
              <Badge className={getSetupColor(trade.setup_name)}>
                {trade.setup_name}
              </Badge>
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
                  />
                </DialogContent>
              </Dialog>
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-white/20"
              onClick={() => {/* TODO: Add edit functionality */}}
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
