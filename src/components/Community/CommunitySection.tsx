
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Send, Pin, Upload } from 'lucide-react';
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

  // Check if user has community access for this session
  useEffect(() => {
    const communityAccess = sessionStorage.getItem('community_access');
    if (communityAccess === 'granted') {
      setHasAccess(true);
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, []);

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

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      // Call edge function to verify password
      const { data, error } = await supabase.functions.invoke('verify-community-password', {
        body: { password }
      });

      if (error) throw error;

      if (data?.valid) {
        // Log access
        await supabase.functions.invoke('log-community-access', {
          body: { 
            user_email: user?.email,
            user_id: user?.id 
          }
        });

        setHasAccess(true);
        sessionStorage.setItem('community_access', 'granted');
        fetchPosts();
        toast.success('Welcome to the community!');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // First get the posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Then get the profiles for each post
      const userIds = postsData?.map(post => post.user_id).filter(Boolean) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const postsWithProfiles = postsData?.map(post => ({
        ...post,
        profiles: profilesData?.find(profile => profile.id === post.user_id) || null
      })) || [];

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          title: newPost.title,
          content: newPost.content,
          post_type: newPost.post_type,
          user_id: user?.id
        });

      if (error) throw error;

      setNewPost({ title: '', content: '', post_type: 'discussion' });
      toast.success('Post created successfully!');
      await fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect shine-animation">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Users className="w-6 h-6" />
            Premium Trading Community
          </CardTitle>
          <CardDescription className="text-text-secondary">
            Connect with fellow traders, share insights, and discuss market strategies
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Create New Post */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-gold">
            <MessageSquare className="w-5 h-5" />
            Share Your Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Post title..."
            value={newPost.title}
            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
            className="bg-card-bg border-gold/20 focus:border-accent-gold text-white"
          />
          <Textarea
            placeholder="Share your trading insights, analysis, or questions..."
            value={newPost.content}
            onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
            className="bg-card-bg border-gold/20 focus:border-accent-gold min-h-[100px] text-white"
          />
          <div className="flex justify-between items-center">
            <select
              value={newPost.post_type}
              onChange={(e) => setNewPost(prev => ({ ...prev, post_type: e.target.value }))}
              className="bg-card-bg border border-gold/20 rounded px-3 py-2 text-sm focus:border-accent-gold text-white"
            >
              <option value="discussion">Discussion</option>
              <option value="analysis">Market Analysis</option>
              <option value="setup">Trading Setup</option>
              <option value="question">Question</option>
              <option value="chart">Chart Share</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-gold/20 hover:bg-card-bg text-accent-gold btn-animated"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Chart
              </Button>
              <Button
                onClick={createPost}
                className="gradient-gold font-semibold btn-animated golden-glow"
              >
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="glass-effect">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-accent-gold/50 mx-auto mb-4" />
              <p className="text-text-secondary">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="glass-effect hover:bg-card-bg/50 transition-colors card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && <Pin className="w-4 h-4 text-accent-gold" />}
                      <h3 className="font-semibold text-white">{post.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>{post.profiles?.full_name || post.profiles?.email || 'Unknown User'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs border-gold/20 text-accent-gold">
                        {post.post_type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <div className="mt-4">
                    <img 
                      src={post.image_url} 
                      alt="Chart" 
                      className="rounded-lg max-w-full h-auto border border-gold/20"
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
