
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trade, SetupType } from '@/types/trade';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

const setupTypes: SetupType[] = ['VCP Setup A1', 'Rocket Base A2', 'IPO Base A3', 'Extra Setup'];

interface SetupStats {
  total_trades: number;
  avg_return: number;
  win_rate: number;
  total_profit: number;
}

export function SetupTracker() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  const fetchTrades = async () => {
    try {
      // Use type assertion to work around type issues
      const { data, error } = await (supabase as any)
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSetupStats = (setupType: SetupType): SetupStats => {
    const setupTrades = trades.filter(trade => trade.setup_name === setupType);
    const completedTrades = setupTrades.filter(trade => trade.sell_price && trade.profit_loss !== null);
    
    if (completedTrades.length === 0) {
      return { total_trades: setupTrades.length, avg_return: 0, win_rate: 0, total_profit: 0 };
    }

    const totalProfit = completedTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
    const avgReturn = completedTrades.reduce((sum, trade) => sum + (trade.return_percentage || 0), 0) / completedTrades.length;
    const winningTrades = completedTrades.filter(trade => (trade.profit_loss || 0) > 0).length;
    const winRate = (winningTrades / completedTrades.length) * 100;

    return {
      total_trades: setupTrades.length,
      avg_return: avgReturn,
      win_rate: winRate,
      total_profit: totalProfit,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getSetupColor = (setup: string) => {
    switch (setup) {
      case 'VCP Setup A1': return 'border-blue-500 bg-blue-500/10';
      case 'Rocket Base A2': return 'border-green-500 bg-green-500/10';
      case 'IPO Base A3': return 'border-purple-500 bg-purple-500/10';
      case 'Extra Setup': return 'border-orange-500 bg-orange-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass-effect border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Target className="w-6 h-6" />
            Setup Tracker
          </CardTitle>
          <CardDescription>Analyze performance by trading setup</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="VCP Setup A1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-white/5 border border-white/10">
          {setupTypes.map((setup) => (
            <TabsTrigger key={setup} value={setup} className="text-xs">
              {setup.split(' ')[0]} {setup.split(' ')[1]}
            </TabsTrigger>
          ))}
        </TabsList>

        {setupTypes.map((setup) => {
          const stats = getSetupStats(setup);
          const setupTrades = trades.filter(trade => trade.setup_name === setup);

          return (
            <TabsContent key={setup} value={setup} className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className={`glass-effect ${getSetupColor(setup)}`}>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.total_trades}</div>
                    <div className="text-text-secondary text-sm">Total Trades</div>
                  </CardContent>
                </Card>

                <Card className={`glass-effect ${getSetupColor(setup)}`}>
                  <CardContent className="p-4">
                    <div className={`text-2xl font-bold ${stats.avg_return >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                      {stats.avg_return >= 0 ? '+' : ''}{stats.avg_return.toFixed(2)}%
                    </div>
                    <div className="text-text-secondary text-sm">Avg Return</div>
                  </CardContent>
                </Card>

                <Card className={`glass-effect ${getSetupColor(setup)}`}>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-accent-gold">
                      {stats.win_rate.toFixed(1)}%
                    </div>
                    <div className="text-text-secondary text-sm">Win Rate</div>
                  </CardContent>
                </Card>

                <Card className={`glass-effect ${getSetupColor(setup)}`}>
                  <CardContent className="p-4">
                    <div className={`text-2xl font-bold ${stats.total_profit >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                      {formatCurrency(stats.total_profit)}
                    </div>
                    <div className="text-text-secondary text-sm">Total P&L</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Trades */}
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg">Recent {setup} Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  {setupTrades.length === 0 ? (
                    <div className="text-center py-4 text-text-secondary">
                      No trades found for this setup
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {setupTrades.slice(0, 5).map((trade) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="font-semibold text-accent-gold">{trade.stock_name}</div>
                            <Badge variant="outline" className="text-xs">
                              Qty: {trade.quantity}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div>₹{trade.buy_price}</div>
                            {trade.sell_price && (
                              <>
                                <div>→</div>
                                <div>₹{trade.sell_price}</div>
                              </>
                            )}
                            {trade.profit_loss !== null && (
                              <div className={`flex items-center gap-1 font-medium ${
                                trade.profit_loss >= 0 ? 'text-profit-green' : 'text-loss-red'
                              }`}>
                                {trade.profit_loss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {formatCurrency(trade.profit_loss)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </motion.div>
  );
}
