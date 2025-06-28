
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calculator, Target, TrendingUp, Percent } from 'lucide-react';

export function TradingCalculator() {
  const [positionSize, setPositionSize] = useState({
    accountSize: 100000,
    riskPercentage: 2,
    stopLoss: 5,
    result: 0,
  });

  const [riskReward, setRiskReward] = useState({
    entryPrice: 100,
    stopLoss: 95,
    target: 110,
    riskAmount: 0,
    rewardAmount: 0,
    ratio: '',
  });

  const [percentageCalc, setPercentageCalc] = useState({
    buyPrice: 100,
    sellPrice: 110,
    gainLoss: 0,
    percentage: 0,
  });

  const [targetStopCalc, setTargetStopCalc] = useState({
    entryPrice: 100,
    riskReward: 2,
    riskPercentage: 5,
    stopLoss: 0,
    target: 0,
  });

  const calculatePositionSize = () => {
    const riskAmount = (positionSize.accountSize * positionSize.riskPercentage) / 100;
    const shares = Math.floor(riskAmount / positionSize.stopLoss);
    setPositionSize(prev => ({ ...prev, result: shares }));
  };

  const calculateRiskReward = () => {
    const risk = riskReward.entryPrice - riskReward.stopLoss;
    const reward = riskReward.target - riskReward.entryPrice;
    const ratio = reward / risk;
    
    setRiskReward(prev => ({
      ...prev,
      riskAmount: risk,
      rewardAmount: reward,
      ratio: `1:${ratio.toFixed(2)}`,
    }));
  };

  const calculatePercentage = () => {
    const diff = percentageCalc.sellPrice - percentageCalc.buyPrice;
    const percentage = (diff / percentageCalc.buyPrice) * 100;
    
    setPercentageCalc(prev => ({
      ...prev,
      gainLoss: diff,
      percentage: percentage,
    }));
  };

  const calculateTargetStop = () => {
    const riskAmount = (targetStopCalc.entryPrice * targetStopCalc.riskPercentage) / 100;
    const stopLoss = targetStopCalc.entryPrice - riskAmount;
    const target = targetStopCalc.entryPrice + (riskAmount * targetStopCalc.riskReward);
    
    setTargetStopCalc(prev => ({
      ...prev,
      stopLoss: stopLoss,
      target: target,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass-effect border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Trading Calculator
          </CardTitle>
          <CardDescription>Essential trading calculation tools</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Position Size Calculator */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-gold" />
              Position Size Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accountSize">Account Size (₹)</Label>
              <Input
                id="accountSize"
                type="number"
                value={positionSize.accountSize}
                onChange={(e) => setPositionSize(prev => ({ ...prev, accountSize: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="riskPercent">Risk Percentage (%)</Label>
              <Input
                id="riskPercent"
                type="number"
                step="0.1"
                value={positionSize.riskPercentage}
                onChange={(e) => setPositionSize(prev => ({ ...prev, riskPercentage: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="stopLossAmount">Stop Loss per Share (₹)</Label>
              <Input
                id="stopLossAmount"
                type="number"
                step="0.01"
                value={positionSize.stopLoss}
                onChange={(e) => setPositionSize(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <Button onClick={calculatePositionSize} className="w-full gradient-gold text-dark-bg">
              Calculate Position Size
            </Button>
            
            {positionSize.result > 0 && (
              <div className="p-4 bg-accent-gold/10 rounded-lg border border-accent-gold/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-gold">{positionSize.result}</div>
                  <div className="text-sm text-text-secondary">Shares to buy</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Reward Calculator */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-gold" />
              Risk:Reward Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="entryPrice">Entry Price (₹)</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.01"
                value={riskReward.entryPrice}
                onChange={(e) => setRiskReward(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="stopLossPrice">Stop Loss (₹)</Label>
              <Input
                id="stopLossPrice"
                type="number"
                step="0.01"
                value={riskReward.stopLoss}
                onChange={(e) => setRiskReward(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="targetPrice">Target Price (₹)</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                value={riskReward.target}
                onChange={(e) => setRiskReward(prev => ({ ...prev, target: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <Button onClick={calculateRiskReward} className="w-full gradient-gold text-dark-bg">
              Calculate Risk:Reward
            </Button>
            
            {riskReward.ratio && (
              <div className="space-y-2">
                <div className="p-3 bg-loss-red/10 rounded border border-loss-red/20">
                  <div className="text-sm text-text-secondary">Risk</div>
                  <div className="font-bold text-loss-red">{formatCurrency(riskReward.riskAmount)}</div>
                </div>
                <div className="p-3 bg-profit-green/10 rounded border border-profit-green/20">
                  <div className="text-sm text-text-secondary">Reward</div>
                  <div className="font-bold text-profit-green">{formatCurrency(riskReward.rewardAmount)}</div>
                </div>
                <div className="p-3 bg-accent-gold/10 rounded border border-accent-gold/20 text-center">
                  <div className="text-sm text-text-secondary">Risk:Reward Ratio</div>
                  <div className="text-xl font-bold text-accent-gold">{riskReward.ratio}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Percentage Gain/Loss Calculator */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-accent-gold" />
              % Gain/Loss Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="buyPrice">Buy Price (₹)</Label>
              <Input
                id="buyPrice"
                type="number"
                step="0.01"
                value={percentageCalc.buyPrice}
                onChange={(e) => setPercentageCalc(prev => ({ ...prev, buyPrice: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="sellPrice">Sell Price (₹)</Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                value={percentageCalc.sellPrice}
                onChange={(e) => setPercentageCalc(prev => ({ ...prev, sellPrice: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <Button onClick={calculatePercentage} className="w-full gradient-gold text-dark-bg">
              Calculate Percentage
            </Button>
            
            {percentageCalc.percentage !== 0 && (
              <div className="space-y-2">
                <div className={`p-4 rounded-lg border ${
                  percentageCalc.gainLoss >= 0 
                    ? 'bg-profit-green/10 border-profit-green/20' 
                    : 'bg-loss-red/10 border-loss-red/20'
                }`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      percentageCalc.gainLoss >= 0 ? 'text-profit-green' : 'text-loss-red'
                    }`}>
                      {percentageCalc.gainLoss >= 0 ? '+' : ''}{percentageCalc.percentage.toFixed(2)}%
                    </div>
                    <div className="text-sm text-text-secondary">
                      {formatCurrency(percentageCalc.gainLoss)} per share
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target/Stop Loss Calculator */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-gold" />
              Target/Stop Loss Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="entryPriceTarget">Entry Price (₹)</Label>
              <Input
                id="entryPriceTarget"
                type="number"
                step="0.01"
                value={targetStopCalc.entryPrice}
                onChange={(e) => setTargetStopCalc(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="riskRewardRatio">Risk:Reward Ratio</Label>
              <Input
                id="riskRewardRatio"
                type="number"
                step="0.1"
                value={targetStopCalc.riskReward}
                onChange={(e) => setTargetStopCalc(prev => ({ ...prev, riskReward: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <div>
              <Label htmlFor="riskPercentageTarget">Risk Percentage (%)</Label>
              <Input
                id="riskPercentageTarget"
                type="number"
                step="0.1"
                value={targetStopCalc.riskPercentage}
                onChange={(e) => setTargetStopCalc(prev => ({ ...prev, riskPercentage: parseFloat(e.target.value) || 0 }))}
                className="bg-white/5 border-white/20"
              />
            </div>
            
            <Button onClick={calculateTargetStop} className="w-full gradient-gold text-dark-bg">
              Calculate Levels
            </Button>
            
            {targetStopCalc.stopLoss > 0 && (
              <div className="space-y-2">
                <div className="p-3 bg-loss-red/10 rounded border border-loss-red/20">
                  <div className="text-sm text-text-secondary">Stop Loss</div>
                  <div className="font-bold text-loss-red">{formatCurrency(targetStopCalc.stopLoss)}</div>
                </div>
                <div className="p-3 bg-profit-green/10 rounded border border-profit-green/20">
                  <div className="text-sm text-text-secondary">Target</div>
                  <div className="font-bold text-profit-green">{formatCurrency(targetStopCalc.target)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
