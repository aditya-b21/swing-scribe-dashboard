
-- Create table for storing stock data
CREATE TABLE public.stock_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL, -- NSE or BSE
  date DATE NOT NULL,
  open DECIMAL(10,2) NOT NULL,
  high DECIMAL(10,2) NOT NULL,
  low DECIMAL(10,2) NOT NULL,
  close DECIMAL(10,2) NOT NULL,
  volume BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, exchange, date)
);

-- Create table for VCP scan results
CREATE TABLE public.vcp_scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  close_price DECIMAL(10,2) NOT NULL,
  volume BIGINT NOT NULL,
  percent_from_52w_high DECIMAL(5,2),
  atr_14 DECIMAL(10,4),
  ema_50 DECIMAL(10,2),
  ema_150 DECIMAL(10,2),
  ema_200 DECIMAL(10,2),
  volume_avg_20 BIGINT,
  breakout_signal BOOLEAN DEFAULT false,
  volatility_contraction DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scan metadata
CREATE TABLE public.scan_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_date DATE NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'VCP',
  total_stocks_scanned INTEGER,
  filtered_results_count INTEGER,
  scan_duration_seconds INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_stock_data_symbol_date ON public.stock_data(symbol, date DESC);
CREATE INDEX idx_stock_data_date ON public.stock_data(date DESC);
CREATE INDEX idx_vcp_scan_date ON public.vcp_scan_results(scan_date DESC);

-- Enable RLS
ALTER TABLE public.stock_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vcp_scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view data
CREATE POLICY "Authenticated users can view stock data" 
  ON public.stock_data 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view scan results" 
  ON public.vcp_scan_results 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view scan metadata" 
  ON public.scan_metadata 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow admins to manage all data
CREATE POLICY "Admins can manage stock data" 
  ON public.stock_data 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND email = ANY(ARRAY['admin@swingscribe.com', 'adityabarod807@gmail.com'])
  ));

CREATE POLICY "Admins can manage scan results" 
  ON public.vcp_scan_results 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND email = ANY(ARRAY['admin@swingscribe.com', 'adityabarod807@gmail.com'])
  ));

CREATE POLICY "Admins can manage scan metadata" 
  ON public.scan_metadata 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND email = ANY(ARRAY['admin@swingscribe.com', 'adityabarod807@gmail.com'])
  ));
