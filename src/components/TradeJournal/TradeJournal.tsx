
import { useState } from 'react';
import { motion } from 'framer-motion';
import { TradeForm } from './TradeForm';
import { TradesList } from './TradesList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function TradeJournal() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTradeAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass-effect border-white/20 card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-gradient">Trade Journal</CardTitle>
            <CardDescription>Track and analyze your swing trades</CardDescription>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gradient-blue text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <TradeForm onTradeAdded={handleTradeAdded} />
            </motion.div>
          )}
          <TradesList refreshTrigger={refreshTrigger} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
