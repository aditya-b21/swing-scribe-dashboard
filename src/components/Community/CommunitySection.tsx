
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Send, Pin, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  post_type: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

export function CommunitySection() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', content: '', post_type: 'discussion' });

  // Check if user has community access
  if (!profile?.is_community_member) {
    return (
      <div className="space-y-6">
        <Card className="glass-effect border-yellow-500/20 shine-animation">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-16 h-16 text-yellow-400" />
            </div>
            <CardTitle className="text-2xl text-gradient flex items-center justify-center gap-2">
              <Users className="w-6 h-6" />
              Community Access Required
            </CardTitle>
            <CardDescription className="text-lg">
              You are not added to the community group yet.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
              <p className="text-yellow-200 mb-4">
                ⚠️ <strong>Access Restricted</strong>
              </p>
              <p className="text-text-secondary mb-4">
                To join our exclusive trading community and access:
              </p>
              <ul className="text-left text-text-secondary space-y-2 mb-6">
                <li>• Trading discussions and strategies</li>
                <li>• Market analysis and insights</li>
                <li>• Community support and networking</li>
                <li>• Exclusive trading setups</li>
              </ul>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-200 mb-2">
                  📩 <strong>Request Access:</strong>
                </p>
                <p className="text-text-secondary">
                  Please email <strong className="text-blue-400">adityabarod807@gmail.com</strong> to request access from the admin.
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => window.open('mailto:adityabarod807@gmail.com?subject=Community Access Request - SwingScribe&body=Hi, I would like to request access to the SwingScribe community group. My account email: ' + user?.email, '_blank')}
              className="gradient-blue text-white font-semibold btn-animated pulse-glow"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Access Request Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    fetchPosts();
    
    // Set up real-time subscription for new posts
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
  }, []);

  const fetchPosts = async () => {
    try {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-green-500/20 shine-animation">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Users className="w-6 h-6" />
            Trading Community
          </CardTitle>
          <CardDescription>
            Connect with fellow traders, share insights, and discuss market strategies
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Create New Post */}
      <Card className="glass-effect border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Share Your Thoughts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Post title..."
            value={newPost.title}
            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
            className="bg-white/5 border-green-500/20 focus:border-green-400"
          />
          <Textarea
            placeholder="What's on your mind about trading today?"
            value={newPost.content}
            onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
            className="bg-white/5 border-green-500/20 focus:border-green-400 min-h-[100px]"
          />
          <div className="flex justify-between items-center">
            <select
              value={newPost.post_type}
              onChange={(e) => setNewPost(prev => ({ ...prev, post_type: e.target.value }))}
              className="bg-white/5 border border-green-500/20 rounded px-3 py-2 text-sm focus:border-green-400"
            >
              <option value="discussion">Discussion</option>
              <option value="analysis">Market Analysis</option>
              <option value="setup">Trading Setup</option>
              <option value="question">Question</option>
            </select>
            <Button
              onClick={createPost}
              className="gradient-green text-white font-semibold btn-animated pulse-glow"
            >
              <Send className="w-4 h-4 mr-2" />
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Community Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="glass-effect border-green-500/20">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-green-400/50 mx-auto mb-4" />
              <p className="text-text-secondary">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="glass-effect border-green-500/20 hover:bg-white/5 transition-colors card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                      <h3 className="font-semibold text-white">{post.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>{post.profiles?.full_name || post.profiles?.email || 'Unknown User'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {post.post_type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">{post.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
