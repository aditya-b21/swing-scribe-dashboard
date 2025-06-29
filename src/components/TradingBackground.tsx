
import React from 'react';

export function TradingBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated geometric shapes */}
      <div className="absolute inset-0">
        {/* Large circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-slate-600/10 to-slate-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-slate-500/10 to-slate-400/10 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Floating particles */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-slate-400/30 rounded-full animate-bounce animation-delay-500" />
        <div className="absolute top-1/3 right-20 w-1 h-1 bg-slate-300/40 rounded-full animate-bounce animation-delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-3 h-3 bg-slate-500/20 rounded-full animate-bounce animation-delay-1500" />
        <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-slate-400/30 rounded-full animate-bounce animation-delay-2000" />
      </div>
      
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-slate-900/30" />
    </div>
  );
}
