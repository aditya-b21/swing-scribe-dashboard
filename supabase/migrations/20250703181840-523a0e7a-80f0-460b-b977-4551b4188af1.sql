-- Fix RLS policies for admin access
DROP POLICY IF EXISTS "Admins can manage payment settings" ON public.payment_settings;
CREATE POLICY "Admins can manage payment settings" 
ON public.payment_settings 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Allow profile creation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);