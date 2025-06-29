
-- Add community membership flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_community_member BOOLEAN DEFAULT false;

-- Update existing profiles to have the default value
UPDATE public.profiles 
SET is_community_member = false 
WHERE is_community_member IS NULL;

-- Enable realtime for profiles table to get live updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add the profiles table to realtime publication if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
