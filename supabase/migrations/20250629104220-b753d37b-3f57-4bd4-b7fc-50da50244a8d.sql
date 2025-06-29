
-- Add community_request_status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN community_request_status TEXT DEFAULT NULL;

-- Update existing profiles to have NULL community_request_status (they haven't requested yet)
-- This allows us to distinguish between users who haven't requested vs those who have pending/approved/denied status
