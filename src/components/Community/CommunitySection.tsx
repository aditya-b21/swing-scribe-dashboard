import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Upload, Send, Pin, Image, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityPost {
  id: string;
  user_id: string;
  title?: string;
  content?: string;
  image_url?: string;
  post_type: 'discussion' | 'chart' | 'announcement';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user_email?: string;
  replies?: CommunityReply[];
}

interface CommunityReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
}

export function CommunitySection() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    post_type: 'discussion' as 'discussion' | 'chart' | 'announcement'
  });

  useEffect(() => {
    if (profile?.status === 'approved') {
      fetchPosts();
    }
  }, [profile]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch user profiles for email information
      const userIds = postsData?.map(post => post.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      // Fetch replies for each post
      const { data: repliesData } = await supabase
        .from('community_replies')
        .select('*')
        .order('created_at', { ascending: true });

      const postsWithUserInfo = postsData?.map(post => ({
        ...post,
        post_type: (post.post_type || 'discussion') as 'discussion' | 'chart' | 'announcement',
        is_pinned: post.is_pinned || false,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString(),
        user_email: profilesData?.find(profile => profile.id === post.user_id)?.email,
        replies: repliesData?.filter(reply => reply.post_id === post.id).map(reply => ({
          ...reply,
          user_email: profilesData?.find(profile => profile.id === reply.user_id)?.email
        })) || []
      })) || [];

      setPosts(postsWithUserInfo as CommunityPost[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to fetch community posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.content.trim()) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          title: newPost.title.trim() || null,
          content: newPost.content.trim(),
          post_type: newPost.post_type
        });

      if (error) throw error;

      setNewPost({ title: '', content: '', post_type: 'discussion' });
      setShowCreatePost(false);
      await fetchPosts();
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleReply = async (postId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('community_replies')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

      await fetchPosts();
      toast.success('Reply added!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const getPostTypeBadge = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Badge className="bg-purple-500/20 text-purple-400">Announcement</Badge>;
      case 'chart':
        return <Badge className="bg-blue-500/20 text-blue-400">Chart</Badge>;
      default:
        return <Badge className="bg-green-500/20 text-green-400">Discussion</Badge>;
    }
  };

  const handleApprovalRequest = async () => {
    if (!user) return;

    try {
      // Update user status to request approval
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Approval request sent! Please wait for admin approval.');
    } catch (error) {
      console.error('Error requesting approval:', error);
      toast.error('Failed to send approval request');
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
      </div>
    );
  }

  if (profile.status === 'rejected') {
    return (
      <Card className="glass-effect border-white/20">
        <CardContent className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-400">Access Denied</h3>
          <p className="text-text-secondary">
            Your community access request has been rejected. Please contact the administrator if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (profile.status !== 'approved') {
    return (
      <Card className="glass-effect border-white/20">
        <CardContent className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Community Access Required</h3>
          <p className="text-text-secondary mb-6">
            You need admin approval to access the community features. Click below to request access.
          </p>
          {profile.status === 'pending' ? (
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Clock className="w-5 h-5" />
              <span>Approval request pending...</span>
            </div>
          ) : (
            <Button onClick={handleApprovalRequest} className="gradient-gold text-dark-bg">
              Request Community Access
            </Button>
          )}
        </CardContent>
      </Card>
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
      <Card className="glass-effect border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gradient flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Community Group
              </CardTitle>
              <CardDescription>Share charts, ask questions, and discuss trading strategies</CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreatePost(!showCreatePost)}
              className="gradient-gold text-dark-bg"
            >
              <Send className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </CardHeader>

        {showCreatePost && (
          <CardContent className="border-t border-white/10">
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={newPost.post_type === 'discussion' ? 'default' : 'outline'}
                  onClick={() => setNewPost(prev => ({ ...prev, post_type: 'discussion' }))}
                >
                  Discussion
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={newPost.post_type === 'chart' ? 'default' : 'outline'}
                  onClick={() => setNewPost(prev => ({ ...prev, post_type: 'chart' }))}
                >
                  <Image className="w-4 h-4 mr-1" />
                  Chart
                </Button>
              </div>
              
              <Input
                placeholder="Post title (optional)"
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                className="bg-white/5 border-white/20"
              />
              
              <Textarea
                placeholder="What's on your mind? Share your trading insights..."
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                className="bg-white/5 border-white/20 min-h-[100px]"
                required
              />
              
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gradient-gold text-dark-bg">
                  Post
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowCreatePost(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="glass-effect border-white/20">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onReply={handleReply}
              getPostTypeBadge={getPostTypeBadge}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PostCard({ 
  post, 
  onReply, 
  getPostTypeBadge 
}: { 
  post: CommunityPost; 
  onReply: (postId: string, content: string) => void;
  getPostTypeBadge: (type: string) => JSX.Element;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onReply(post.id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  return (
    <Card className="glass-effect border-white/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {post.title && (
                <h3 className="font-semibold text-accent-gold">{post.title}</h3>
              )}
              {getPostTypeBadge(post.post_type)}
              {post.is_pinned && (
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
            </div>
            <span className="text-xs text-text-secondary">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <p className="text-sm text-text-secondary">{post.content}</p>

          {post.image_url && (
            <img 
              src={post.image_url} 
              alt="Post attachment" 
              className="max-w-full h-auto rounded-lg border border-white/20"
            />
          )}

          <div className="flex items-center justify-between text-xs text-text-secondary border-t border-white/10 pt-3">
            <span>By: {post.user_email || 'Unknown User'}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-accent-gold hover:bg-accent-gold/10"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Reply ({post.replies?.length || 0})
            </Button>
          </div>

          {post.replies && post.replies.length > 0 && (
            <div className="pl-4 border-l-2 border-white/10 space-y-2">
              {post.replies.map((reply) => (
                <div key={reply.id} className="bg-white/5 p-3 rounded">
                  <p className="text-sm mb-1">{reply.content}</p>
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>{reply.user_email || 'Unknown User'}</span>
                    <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="space-y-2">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="bg-white/5 border-white/20 text-sm"
                rows={3}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gradient-gold text-dark-bg">
                  Reply
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowReplyForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
