
-- Create enum for setup types
CREATE TYPE public.setup_type AS ENUM ('VCP Setup A1', 'Rocket Base A2', 'IPO Base A3', 'Extra Setup');

-- Create trades table
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stock_name TEXT NOT NULL,
    buy_price DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2),
    quantity INTEGER DEFAULT 1 NOT NULL,
    setup_name setup_type NOT NULL,
    chart_image_url TEXT,
    profit_loss DECIMAL(10,2),
    return_percentage DECIMAL(5,2),
    trade_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-calculate profit/loss
CREATE OR REPLACE FUNCTION public.calculate_trade_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sell_price IS NOT NULL THEN
        NEW.profit_loss = (NEW.sell_price - NEW.buy_price) * NEW.quantity;
        NEW.return_percentage = ((NEW.sell_price - NEW.buy_price) / NEW.buy_price) * 100;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculation
CREATE TRIGGER calculate_trade_metrics_trigger
    BEFORE INSERT OR UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.calculate_trade_metrics();

-- Create storage bucket for chart images
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-charts', 'trade-charts', true);

-- Create storage policy for authenticated users
CREATE POLICY "Users can upload their own chart images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'trade-charts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own chart images" ON storage.objects
    FOR SELECT USING (bucket_id = 'trade-charts' AND auth.uid()::text = (storage.foldername(name))[1]);
