import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Pin, Trash2, Eye } from 'lucide-react';
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
}

export function CommunityManagement() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch user profiles separately to get email information
      const userIds = postsData?.map(post => post.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      // Combine posts with user profile data and type cast
      const postsWithUserInfo = postsData?.map(post => ({
        ...post,
        post_type: (post.post_type || 'discussion') as 'discussion' | 'chart' | 'announcement',
        is_pinned: post.is_pinned || false,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString(),
        user_email: profilesData?.find(profile => profile.id === post.user_id)?.email
      })) || [];

      setPosts(postsWithUserInfo as CommunityPost[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to fetch community posts');
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (postId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ is_pinned: !currentPinned })
        .eq('id', postId);

      if (error) throw error;

      await fetchPosts();
      toast.success(`Post ${!currentPinned ? 'pinned' : 'unpinned'} successfully`);
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update post');
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      await fetchPosts();
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold"></div>
      </div>
    );
  }

  return (
    <Card className="glass-effect border-white/20">
      <CardHeader>
        <CardTitle className="text-2xl text-gradient flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Community Management
        </CardTitle>
        <CardDescription>Manage community posts and discussions</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No community posts found.
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
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
                    
                    {post.content && (
                      <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                        {post.content}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span>By: {post.user_email || 'Unknown User'}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      {post.image_url && (
                        <Badge variant="outline" className="text-xs">
                          Has Image
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePin(post.id, post.is_pinned)}
                      className="border-white/20"
                    >
                      <Pin className="w-4 h-4" />
                    </Button>
                    
                    {post.image_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(post.image_url, '_blank')}
                        className="border-white/20"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
