
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Send, Pin, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { CommunityPasswordPrompt } from './CommunityPasswordPrompt';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  post_type: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  image_url?: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

export function CommunitySection() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', post_type: 'discussion' });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingPost, setUploadingPost] = useState(false);

  // Check community access and validate password freshness
  useEffect(() => {
    checkCommunityAccess();
  }, [user]);

  // Set up real-time subscription when user has access
  useEffect(() => {
    if (!hasAccess) return;

    const subscription = supabase
      .channel('community-posts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_posts'
      }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [hasAccess]);

  const checkCommunityAccess = async () => {
    try {
      const communityAccess = sessionStorage.getItem('community_access');
      const accessTimestamp = sessionStorage.getItem('community_access_time');
      const accessPassword = sessionStorage.getItem('community_password');
      
      if (communityAccess === 'granted' && accessTimestamp && accessPassword) {
        // Check if access is still valid (within 24 hours and password hasn't changed)
        const accessTime = parseInt(accessTimestamp);
        const currentTime = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (currentTime - accessTime < twentyFourHours) {
          // Verify the stored password is still valid
          const { data } = await supabase.functions.invoke('verify-community-password', {
            body: { password: accessPassword }
          });
          
          if (data?.valid) {
            setHasAccess(true);
            fetchPosts();
          } else {
            // Password changed, clear session
            clearCommunitySession();
          }
        } else {
          // Session expired
          clearCommunitySession();
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking community access:', error);
      clearCommunitySession();
    }
  };

  const clearCommunitySession = () => {
    sessionStorage.removeItem('community_access');
    sessionStorage.removeItem('community_access_time');
    sessionStorage.removeItem('community_password');
    setHasAccess(false);
    setLoading(false);
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-community-password', {
        body: { password }
      });

      if (error) {
        console.error('Verification error:', error);
        throw error;
      }

      if (data?.valid) {
        // Log access
        if (user) {
          await supabase.functions.invoke('log-community-access', {
            body: { 
              user_email: user.email,
              user_id: user.id 
            }
          });
        }

        // Set session with timestamp and password
        setHasAccess(true);
        sessionStorage.setItem('community_access', 'granted');
        sessionStorage.setItem('community_access_time', Date.now().toString());
        sessionStorage.setItem('community_password', password);
        
        fetchPosts();
        toast.success('Welcome to the community!');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying password:', error);
      toast.error('Failed to verify password. Please try again.');
      return false;
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Get posts with user profiles
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Posts fetch error:', postsError);
        throw postsError;
      }

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `community-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-uploads')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const createPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create posts');
      return;
    }

    setUploadingPost(true);
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          setUploadingPost(false);
          return;
        }
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          post_type: newPost.post_type,
          user_id: user.id,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Post creation error:', error);
        throw error;
      }

      setNewPost({ title: '', content: '', post_type: 'discussion' });
      setSelectedImage(null);
      setImagePreview(null);
      toast.success('Post created successfully!');
      await fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setUploadingPost(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Show password prompt if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <CommunityPasswordPrompt onPasswordSubmit={verifyPassword} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect shine-animation border-slate-700">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Users className="w-6 h-6" />
            Premium Trading Community
          </CardTitle>
          <CardDescription className="text-slate-400">
            Connect with fellow traders, share insights, and discuss market strategies
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Create New Post */}
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-300">
            <MessageSquare className="w-5 h-5" />
            Share Your Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Post title..."
            value={newPost.title}
            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
            className="bg-slate-800 border-slate-600 focus:border-slate-400 text-white"
          />
          <Textarea
            placeholder="Share your trading insights, analysis, or questions..."
            value={newPost.content}
            onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
            className="bg-slate-800 border-slate-600 focus:border-slate-400 min-h-[100px] text-white"
          />
          
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-w-full h-48 object-cover rounded-lg border border-slate-600"
              />
              <Button
                onClick={removeImage}
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <select
              value={newPost.post_type}
              onChange={(e) => setNewPost(prev => ({ ...prev, post_type: e.target.value }))}
              className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:border-slate-400 text-white"
            >
              <option value="discussion">Discussion</option>
              <option value="analysis">Market Analysis</option>
              <option value="setup">Trading Setup</option>
              <option value="question">Question</option>
              <option value="chart">Chart Share</option>
            </select>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="border-slate-600 hover:bg-slate-800 text-slate-300 btn-animated"
                  type="button"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Chart
                </Button>
              </label>
              <Button
                onClick={createPost}
                disabled={uploadingPost}
                className="gradient-slate font-semibold btn-animated btn-glow"
              >
                {uploadingPost ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="glass-effect border-slate-700">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="glass-effect hover:bg-slate-800/50 transition-colors card-hover border-slate-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && <Pin className="w-4 h-4 text-slate-300" />}
                      <h3 className="font-semibold text-white">{post.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>{post.profiles?.full_name || post.profiles?.email || 'Unknown User'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {post.post_type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap mb-4">{post.content}</p>
                {post.image_url && (
                  <div className="mt-4">
                    <img 
                      src={post.image_url} 
                      alt="Chart" 
                      className="rounded-lg max-w-full h-auto border border-slate-600 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(post.image_url, '_blank')}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
