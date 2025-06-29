
import React from 'react';

export function TradingBackground() {
  return (
    <div className="trading-bg">
      {/* Candle Chart Animation */}
      <div className="absolute top-20 left-10 flex gap-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="candle-animation"
            style={{
              animationDelay: `${i * 0.2}s`,
            }}
          >
            <div className="w-1 bg-green-500/30 rounded" style={{ height: `${20 + Math.random() * 40}px` }} />
            <div className="w-3 h-px bg-green-500/50 -mt-1" />
            <div className="w-3 h-px bg-green-500/50 mt-1" />
          </div>
        ))}
      </div>

      {/* Stock Line Chart */}
      <div className="absolute top-40 right-20">
        <svg width="200" height="80" className="opacity-30">
          <path
            d="M10,60 Q30,20 50,40 T90,30 T130,50 T170,20"
            stroke="#00ff88"
            strokeWidth="2"
            fill="none"
            className="candle-animation"
          />
        </svg>
      </div>

      {/* Market Ticker */}
      <div className="absolute bottom-20 left-0 w-full overflow-hidden">
        <div className="ticker-animation whitespace-nowrap text-green-400/30 text-sm">
          AAPL +2.5% • TSLA -1.2% • MSFT +0.8% • GOOGL +1.5% • AMZN -0.3% • NVDA +3.2% • META +1.8%
        </div>
      </div>

      {/* Floating Numbers */}
      <div className="absolute top-60 left-1/3">
        <div className="text-green-400/20 text-xs animate-pulse">+12.5%</div>
      </div>
      <div className="absolute top-80 right-1/3">
        <div className="text-blue-400/20 text-xs animate-pulse">-5.8%</div>
      </div>
    </div>
  );
}
