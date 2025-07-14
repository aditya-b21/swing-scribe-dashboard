
// Stock universe constants for display purposes
export const STOCK_UNIVERSE = {
  NSE_COUNT: 2000,
  BSE_COUNT: 3000,
  TOTAL_UNIVERSE: 5000,
  COVERAGE_DESCRIPTION: 'Complete NSE & BSE Universe',
  EXCHANGES: {
    NSE: 'National Stock Exchange',
    BSE: 'Bombay Stock Exchange'
  }
} as const;

// Sample of major stocks for reference (not the complete list)
export const MAJOR_NSE_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'KOTAKBANK', 'BHARTIARTL',
  'LT', 'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'AXISBANK', 'ULTRACEMCO', 'TITAN', 'WIPRO',
  'TECHM', 'HCLTECH', 'POWERGRID', 'SUNPHARMA', 'BAJFINANCE', 'SBIN', 'HDFCLIFE', 'ADANIPORTS'
];

export const MAJOR_BSE_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'BHARTIARTL', 'LT',
  'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'AXISBANK', 'TITAN', 'WIPRO', 'TECHM', 'HCLTECH'
];
