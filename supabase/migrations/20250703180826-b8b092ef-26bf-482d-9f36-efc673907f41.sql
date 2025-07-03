-- Create payment submissions table
CREATE TABLE public.payment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text NOT NULL,
  utr_reference text NOT NULL,
  payment_proof_url text,
  payment_amount numeric NOT NULL,
  coupon_code text,
  discount_amount numeric DEFAULT 0,
  final_amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  verified_by uuid REFERENCES auth.users(id)
);

-- Create coupons table
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
  discount_value numeric NOT NULL,
  expiry_date timestamp with time zone,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create payment settings table
CREATE TABLE public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default payment amount
INSERT INTO public.payment_settings (key, value) VALUES ('payment_amount', '999');
INSERT INTO public.payment_settings (key, value) VALUES ('qr_code_url', '/lovable-uploads/25f34618-a2c2-4386-a490-72a69fa89c8b.png');

-- Enable RLS
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_submissions
CREATE POLICY "Users can view their own submissions" 
ON public.payment_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" 
ON public.payment_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all submissions" 
ON public.payment_submissions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.email = ANY(ARRAY['admin@swingscribe.com', 'adityabarod807@gmail.com'])
));

-- RLS Policies for coupons
CREATE POLICY "Everyone can view active coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage coupons" 
ON public.coupons 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.email = ANY(ARRAY['admin@swingscribe.com', 'adityabarod807@gmail.com'])
));

-- RLS Policies for payment_settings
CREATE POLICY "Everyone can view payment settings" 
ON public.payment_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage payment settings" 
ON public.payment_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.email = ANY(ARRAY['admin@swingscribe.com', 'adityabarod807@gmail.com'])
));

-- Function to update usage count for coupons
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'verified' AND OLD.status != 'verified' AND NEW.coupon_code IS NOT NULL THEN
    UPDATE public.coupons 
    SET usage_count = usage_count + 1 
    WHERE code = NEW.coupon_code;
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger to increment coupon usage when payment is verified
CREATE TRIGGER increment_coupon_usage_trigger
  AFTER UPDATE ON public.payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();