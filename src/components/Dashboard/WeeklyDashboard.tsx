import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trade, SetupType } from '@/types/trade';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';

export function WeeklyDashboard() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeeklyTrades();
    }
  }, [user]);

  const fetchWeeklyTrades = async () => {
    if (!user) return;
    
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true });

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
    } catch (error) {
      console.error('Error fetching weekly trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate weekly stats
  const completedTrades = trades.filter(trade => trade.sell_price && trade.profit_loss !== null);
  const totalTrades = trades.length;
  const totalProfit = completedTrades.filter(trade => (trade.profit_loss || 0) > 0)
    .reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
  const totalLoss = Math.abs(completedTrades.filter(trade => (trade.profit_loss || 0) < 0)
    .reduce((sum, trade) => sum + (trade.profit_loss || 0), 0));
  const winRate = completedTrades.length > 0 
    ? (completedTrades.filter(trade => (trade.profit_loss || 0) > 0).length / completedTrades.length) * 100 
    : 0;

  // Prepare chart data
  const profitLossData = [
    { name: 'Profit', value: totalProfit, fill: '#10B981' },
    { name: 'Loss', value: totalLoss, fill: '#EF4444' }
  ].filter(item => item.value > 0);

  const setupData = trades.reduce((acc, trade) => {
    acc[trade.setup_name] = (acc[trade.setup_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const setupChartData = Object.entries(setupData).map(([name, value], index) => ({
    name: name.split(' ')[0] + ' ' + name.split(' ')[1],
    value,
    fill: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][index % 4]
  }));

  // Daily cumulative data
  const dailyData = trades.reduce((acc, trade) => {
    const date = new Date(trade.created_at).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, cumulative: 0, trades: 0 };
    }
    acc[date].trades += 1;
    if (trade.profit_loss) {
      acc[date].cumulative += trade.profit_loss;
    }
    return acc;
  }, {} as Record<string, any>);

  const lineChartData = Object.values(dailyData);

  const chartConfig = {
    profit: {
      label: "Profit",
      color: "#10B981",
    },
    loss: {
      label: "Loss", 
      color: "#EF4444",
    },
    cumulative: {
      label: "Cumulative P&L",
      color: "#E4C06D",
    },
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
          <CardTitle className="text-2xl text-gradient">Weekly Performance Dashboard</CardTitle>
          <CardDescription>Last 7 days trading summary</CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-effect border-white/10 card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-accent-gold" />
              <div>
                <div className="text-2xl font-bold">{totalTrades}</div>
                <div className="text-text-secondary text-sm">Total Trades</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/10 card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-profit-green" />
              <div>
                <div className="text-2xl font-bold text-profit-green">{formatCurrency(totalProfit)}</div>
                <div className="text-text-secondary text-sm">Total Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/10 card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-loss-red" />
              <div>
                <div className="text-2xl font-bold text-loss-red">{formatCurrency(totalLoss)}</div>
                <div className="text-text-secondary text-sm">Total Loss</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-white/10 card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-accent-gold" />
              <div>
                <div className="text-2xl font-bold text-accent-gold">{winRate.toFixed(1)}%</div>
                <div className="text-text-secondary text-sm">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profit vs Loss Bar Chart */}
        {profitLossData.length > 0 && (
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle>Profit vs Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={profitLossData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#CFCFCF" />
                  <YAxis stroke="#CFCFCF" tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Setup Distribution Pie Chart */}
        {setupChartData.length > 0 && (
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle>Setup Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={setupChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {setupChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value: number, name: string) => [`${value} trades`, name]}
                    />}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cumulative P&L Line Chart */}
      {lineChartData.length > 0 && (
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle>Daily Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#CFCFCF" />
                <YAxis stroke="#CFCFCF" tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                  />}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#E4C06D" 
                  strokeWidth={3}
                  dot={{ fill: '#E4C06D', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* No data message */}
      {totalTrades === 0 && (
        <Card className="glass-effect border-white/10">
          <CardContent className="p-8 text-center">
            <div className="text-text-secondary">
              No trades found for the past 7 days. Start by adding some trades to see your performance!
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
