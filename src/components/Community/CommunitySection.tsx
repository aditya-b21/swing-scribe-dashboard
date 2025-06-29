
import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, TrendingUp, HelpCircle, Send, UserPlus, User, Reply, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  post_type: 'discussion' | 'analysis' | 'question';
  created_at: string;
  user_id: string;
  image_url?: string;
  replies?: CommunityReply[];
}

interface CommunityReply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
}

export function CommunitySection() {
  const { profile, loading: profileLoading } = useProfile();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', content: '', post_type: 'discussion' as 'discussion' | 'analysis' | 'question' });
  const [newReply, setNewReply] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription for posts changes
    const postSubscription = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, fetchPosts)
      .subscribe();

    // Set up real-time subscription for replies changes
    const replySubscription = supabase
      .channel('community-replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_replies' }, fetchPosts)
      .subscribe();

    return () => {
      postSubscription.unsubscribe();
      replySubscription.unsubscribe();
    };
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      console.log('Fetching community posts...');

      const { data, error } = await supabase
        .from('community_posts')
        .select('*, replies:community_replies(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        return;
      }

      console.log('Fetched community posts:', data);
      
      // Type cast the data to ensure proper typing
      const typedPosts: CommunityPost[] = (data || []).map(post => ({
        id: post.id,
        title: post.title || '',
        content: post.content || '',
        post_type: (post.post_type || 'discussion') as 'discussion' | 'analysis' | 'question',
        created_at: post.created_at || new Date().toISOString(),
        user_id: post.user_id || '',
        image_url: post.image_url || undefined,
        replies: (post.replies || []).map((reply: any) => ({
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          user_id: reply.user_id,
          post_id: reply.post_id
        }))
      }));

      setPosts(typedPosts);
    } catch (error) {
      console.error('Error fetching community posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCommunityAccess = async () => {
    if (!profile) return;

    try {
      setRequestingAccess(true);
      console.log('Requesting community access for user:', profile.id);

      const { error } = await supabase
        .from('profiles')
        .update({
          community_request_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error requesting community access:', error);
        toast.error('Failed to request community access');
        return;
      }

      toast.success('Community access requested! Please wait for admin approval.');
    } catch (error) {
      console.error('Error requesting community access:', error);
      toast.error('Failed to request community access');
    } finally {
      setRequestingAccess(false);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSubmitting(true);
      console.log('Creating new post:', newPost);

      const { error } = await supabase
        .from('community_posts')
        .insert({
          ...newPost,
          user_id: profile.id
        });

      if (error) {
        console.error('Post creation error:', error);
        toast.error('Failed to create post');
        return;
      }

      setNewPost({ title: '', content: '', post_type: 'discussion' });
      toast.success('Post created successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const addReply = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSubmitting(true);
      console.log('Adding reply to post:', postId, newReply[postId]);

      const { error } = await supabase
        .from('community_replies')
        .insert({
          content: newReply[postId],
          user_id: profile.id,
          post_id: postId
        });

      if (error) {
        console.error('Reply creation error:', error);
        toast.error('Failed to add reply');
        return;
      }

      setNewReply(prev => ({ ...prev, [postId]: '' }));
      toast.success('Reply added successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error creating reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="glass-effect border-white/20">
        <CardContent className="text-center py-8">
          <p className="text-text-secondary">Please log in to access the community.</p>
        </CardContent>
      </Card>
    );
  }

  // Check community access status
  const communityRequestStatus = profile.community_request_status;
  const hasApprovedAccess = communityRequestStatus === 'approved';
  const hasPendingRequest = communityRequestStatus === 'pending';
  const hasBeenDenied = communityRequestStatus === 'denied';

  if (!hasApprovedAccess) {
    return (
      <Card className="glass-effect border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Users className="w-6 h-6" />
            Community Access Required
          </CardTitle>
          <CardDescription>Join our trading community to share insights and learn from others</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          {!communityRequestStatus ? (
            <div className="space-y-4">
              <p className="text-text-secondary mb-4">
                Request access to join our exclusive trading community where you can share charts, ask questions, and discuss strategies with fellow traders.
              </p>
              <Button
                onClick={requestCommunityAccess}
                disabled={requestingAccess}
                className="gradient-gold text-dark-bg"
              >
                {requestingAccess ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-bg mr-2"></div>
                    Requesting Access...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Request Community Access
                  </>
                )}
              </Button>
            </div>
          ) : hasPendingRequest ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
                <Clock className="w-4 h-4" />
                Access Request Pending
              </div>
              <p className="text-text-secondary">
                Your community access request is being reviewed by our admin team. You'll be notified once approved.
              </p>
            </div>
          ) : hasBeenDenied ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg">
                <X className="w-4 h-4" />
                Request Denied
              </div>
              <p className="text-text-secondary">
                Your community access request has been denied. Please contact support if you believe this is an error.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl text-gradient flex items-center gap-2">
            <Users className="w-6 h-6" />
            Trading Community
          </CardTitle>
          <CardDescription>Share insights, ask questions, and learn from fellow traders</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={createPost} className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                placeholder="What's on your mind?"
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                className="bg-white/5 border-white/20"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="post-content">Content</Label>
              <Textarea
                id="post-content"
                placeholder="Share your thoughts, analysis, or questions..."
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                className="bg-white/5 border-white/20 min-h-[100px]"
                required
              />
            </div>
            
            <div className="flex justify-between items-center">
              <Select value={newPost.post_type} onValueChange={(value: 'discussion' | 'analysis' | 'question') => setNewPost(prev => ({ ...prev, post_type: value }))}>
                <SelectTrigger className="w-48 bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion"><MessageSquare className="w-4 h-4 mr-2 inline" />Discussion</SelectItem>
                  <SelectItem value="analysis"><TrendingUp className="w-4 h-4 mr-2 inline" />Analysis</SelectItem>
                  <SelectItem value="question"><HelpCircle className="w-4 h-4 mr-2 inline" />Question</SelectItem>
                </SelectContent>
              </Select>
              
              <Button type="submit" disabled={submitting} className="gradient-gold text-dark-bg">
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-bg mr-2"></div>
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
          </form>
        </CardContent>
      </Card>

      {/* Posts Display */}
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
            <Card key={post.id} className="glass-effect border-white/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-accent-gold to-yellow-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-dark-bg" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-white">Anonymous Trader</span>
                      <Badge className="text-xs">{post.post_type}</Badge>
                      <span className="text-text-secondary text-sm">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-white mb-2">{post.title}</h3>
                    <p className="text-text-secondary mb-4">{post.content}</p>
                    
                    {post.image_url && (
                      <div className="mb-4">
                        <img 
                          src={post.image_url} 
                          alt="Post attachment" 
                          className="max-w-full h-auto rounded-lg border border-white/10"
                        />
                      </div>
                    )}
                    
                    {/* Replies */}
                    {post.replies && post.replies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-white/10 space-y-3">
                        {post.replies.map((reply) => (
                          <div key={reply.id} className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-white text-sm">Anonymous Trader</span>
                              <span className="text-text-secondary text-xs">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-text-secondary text-sm">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Reply Form */}
                    <form 
                      onSubmit={(e) => addReply(e, post.id)} 
                      className="mt-4 flex gap-2"
                    >
                      <Input
                        placeholder="Write a reply..."
                        value={newReply[post.id] || ''}
                        onChange={(e) => setNewReply(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="bg-white/5 border-white/20 flex-1"
                        required
                      />
                      <Button type="submit" size="sm" className="gradient-gold text-dark-bg">
                        <Reply className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
