
-- Create community_settings table for storing community password
CREATE TABLE IF NOT EXISTS public.community_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_access_logs table for tracking user access
CREATE TABLE IF NOT EXISTS public.community_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_id UUID NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for community_settings (admin only)
CREATE POLICY "Admin can manage community settings" ON public.community_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('admin@swingscribe.com', 'adityabarod807@gmail.com')
    )
  );

-- Create policies for community_access_logs (admin can view all, users can insert their own)
CREATE POLICY "Admin can view all access logs" ON public.community_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email IN ('admin@swingscribe.com', 'adityabarod807@gmail.com')
    )
  );

CREATE POLICY "Users can log their own access" ON public.community_access_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default community password with the requested password
INSERT INTO public.community_settings (key, password) 
VALUES ('community_password', 'SwingScribe1234@')
ON CONFLICT (key) DO UPDATE SET password = 'SwingScribe1234@';
