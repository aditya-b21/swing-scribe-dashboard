
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Zap, Rocket } from 'lucide-react';

export function ScannerSection() {
  const [activeScanner, setActiveScanner] = useState<string | null>(null);

  const scanners = [
    {
      id: 'ipo',
      title: 'IPO',
      description: 'Scan for Initial Public Offerings and new listings',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      id: 'vcp',
      title: 'VCP',
      description: 'Volatility Contraction Pattern scanner',
      icon: Search,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      id: 'rocket',
      title: 'Rocket',
      description: 'High momentum breakout scanner',
      icon: Rocket,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white text-2xl">
            <Search className="w-6 h-6 text-blue-400" />
            Trading Scanner
          </CardTitle>
          <p className="text-slate-400">
            Choose a scanner type to find trading opportunities
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scanners.map((scanner) => {
          const IconComponent = scanner.icon;
          return (
            <Card 
              key={scanner.id}
              className={`glass-effect card-hover cursor-pointer transition-all duration-300 ${
                activeScanner === scanner.id ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => setActiveScanner(activeScanner === scanner.id ? null : scanner.id)}
            >
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${scanner.color} ${scanner.hoverColor} flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">
                      {scanner.title}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {scanner.description}
                    </p>
                  </div>

                  <Button 
                    className={`w-full bg-gradient-to-r ${scanner.color} ${scanner.hoverColor} text-white font-medium transition-all duration-300 transform hover:scale-105`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveScanner(scanner.id);
                    }}
                  >
                    Open {scanner.title} Scanner
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeScanner && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-white">
              {scanners.find(s => s.id === activeScanner)?.title} Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {scanners.find(s => s.id === activeScanner)?.title} scanner is coming soon!
                </p>
                <p className="text-sm mt-2">
                  We'll implement the scanning functionality for this pattern.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
