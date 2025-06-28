
export type SetupType = 'VCP Setup A1' | 'Rocket Base A2' | 'IPO Base A3' | 'Extra Setup';

export interface Trade {
  id: string;
  user_id: string;
  stock_name: string;
  buy_price: number;
  sell_price?: number;
  quantity: number;
  setup_name: SetupType;
  chart_image_url?: string;
  profit_loss?: number;
  return_percentage?: number;
  trade_date: string;
  created_at: string;
  updated_at: string;
}

export interface TradeFormData {
  stock_name: string;
  buy_price: number;
  sell_price?: number;
  quantity: number;
  setup_name: SetupType;
  chart_image?: File;
}

export interface WeeklyPerformance {
  total_trades: number;
  total_profit: number;
  total_loss: number;
  win_rate: number;
  setup_breakdown: Record<SetupType, number>;
}
