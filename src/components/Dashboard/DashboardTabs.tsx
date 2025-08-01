
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradeJournal } from '@/components/TradeJournal/TradeJournal';
import { SetupTracker } from '@/components/SetupTracker/SetupTracker';
import { WeeklyDashboard } from '@/components/Dashboard/WeeklyDashboard';
import { TradingCalculator } from '@/components/Calculator/TradingCalculator';
import { CommunitySection } from '@/components/Community/CommunitySection';
import { ScannerSection } from '@/components/Scanner/ScannerSection';
import { BookOpen, Target, BarChart3, Calculator, MessageSquare, Search } from 'lucide-react';

export function DashboardTabs() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Tabs defaultValue="journal" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-white/5 border border-white/10">
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Trade Journal</span>
          </TabsTrigger>
          <TabsTrigger value="setups" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Setup Tracker</span>
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Scanner</span>
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Community</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Calculator</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-6">
          <TradeJournal />
        </TabsContent>

        <TabsContent value="setups" className="mt-6">
          <SetupTracker />
        </TabsContent>

        <TabsContent value="scanner" className="mt-6">
          <ScannerSection />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <CommunitySection />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <WeeklyDashboard />
        </TabsContent>

        <TabsContent value="calculator" className="mt-6">
          <TradingCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
