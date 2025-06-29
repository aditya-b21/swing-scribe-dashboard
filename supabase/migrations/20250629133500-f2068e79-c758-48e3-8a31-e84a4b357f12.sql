
-- Create storage bucket for community uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-uploads', 'community-uploads', true);

-- Allow public access to community uploads
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'community-uploads');

-- Allow authenticated users to upload to community uploads
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'community-uploads' AND auth.role() = 'authenticated');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE 
USING (bucket_id = 'community-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable RLS on community_posts table
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all community posts
CREATE POLICY "Authenticated users can view all posts" ON community_posts FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to create posts
CREATE POLICY "Authenticated users can create posts" ON community_posts FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to manage all posts
CREATE POLICY "Admins can manage all posts" ON community_posts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email IN ('admin@swingscribe.com', 'adityabarod807@gmail.com')
  )
);
