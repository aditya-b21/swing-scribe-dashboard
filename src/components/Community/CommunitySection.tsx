import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/Payment/PaymentModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Send, Pin, Upload, X, ImageIcon, Trash2, CreditCard, CheckCircle, Lock } from 'lucide-react';
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
  user_email?: string;
  user_full_name?: string;
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
  const [hasVerifiedPayment, setHasVerifiedPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);

  useEffect(() => {
    if (user) {
      checkCommunityAccess();
    } else {
      setLoading(false);
      setCheckingPayment(false);
    }
  }, [user]);

  useEffect(() => {
    if (!hasAccess || !user) return;

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
  }, [hasAccess, user]);

  const checkCommunityAccess = async () => {
    if (!user) return;
    
    try {
      setCheckingPayment(true);
      console.log('Checking community access for user:', user.id);
      
      // Check if user has verified payment
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_submissions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .limit(1);
      
      if (paymentError) {
        console.error('Error checking payment:', paymentError);
      }

      const hasPayment = paymentData && paymentData.length > 0;
      setHasVerifiedPayment(hasPayment);
      console.log('Has verified payment:', hasPayment);
      
      if (!hasPayment) {
        setLoading(false);
        setCheckingPayment(false);
        return;
      }

      // Check session storage for community access
      const communityAccess = sessionStorage.getItem('community_access');
      const accessTimestamp = sessionStorage.getItem('community_access_time');
      const accessPassword = sessionStorage.getItem('community_password');
      
      if (communityAccess === 'granted' && accessTimestamp && accessPassword) {
        const accessTime = parseInt(accessTimestamp);
        const currentTime = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (currentTime - accessTime < twentyFourHours) {
          try {
            const { data } = await supabase.functions.invoke('verify-community-password', {
              body: { password: accessPassword }
            });
            
            if (data?.valid) {
              setHasAccess(true);
              fetchPosts();
              return;
            }
          } catch (error) {
            console.error('Error verifying stored password:', error);
          }
        }
      }
      
      // Clear invalid session
      clearCommunitySession();
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
    setCheckingPayment(false);
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-community-password', {
        body: { password }
      });

      if (error) {
        console.error('Verification error:', error);
        return false;
      }

      if (data?.valid) {
        if (user) {
          await supabase.functions.invoke('log-community-access', {
            body: { 
              user_email: user.email,
              user_id: user.id 
            }
          });
        }

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
      console.log('Fetching posts...');
      
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Posts fetch error:', postsError);
        throw postsError;
      }

      console.log('Posts fetched:', postsData?.length || 0);

      // Get user profiles for posts
      const userIds = [...new Set(postsData?.map(post => post.user_id).filter(Boolean))];
      let postsWithUserInfo = postsData || [];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        postsWithUserInfo = postsData?.map(post => {
          const profile = profilesData?.find(p => p.id === post.user_id);
          return {
            ...post,
            user_email: profile?.email || 'Unknown User',
            user_full_name: profile?.full_name || profile?.email || 'Unknown User'
          };
        }) || [];
      }

      setPosts(postsWithUserInfo);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
      setCheckingPayment(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      console.log('Starting image upload...');
      
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `community-images/${fileName}`;

      console.log('Uploading to path:', filePath);

      const { data, error: uploadError } = await supabase.storage
        .from('community-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', data);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('community-uploads')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
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
        console.log('Uploading image...');
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          setUploadingPost(false);
          return;
        }
        console.log('Image uploaded successfully:', imageUrl);
      }

      console.log('Creating post with data:', {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        post_type: newPost.post_type,
        user_id: user.id,
        image_url: imageUrl
      });

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          post_type: newPost.post_type,
          user_id: user.id,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Post creation error:', error);
        throw error;
      }

      console.log('Post created successfully:', data);

      // Reset form
      setNewPost({ title: '', content: '', post_type: 'discussion' });
      setSelectedImage(null);
      setImagePreview(null);
      
      // Clear the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
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
    
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('chart-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      toast.success('Post deleted successfully!');
      await fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post. Please try again.');
    }
  };

  if (checkingPayment) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6 bg-background min-h-screen p-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-primary text-2xl">
              <Lock className="w-6 h-6" />
              Login Required
            </CardTitle>
            <CardDescription className="text-lg">
              Please login to access the trading community
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!hasVerifiedPayment) {
    return (
      <div className="space-y-6 bg-background min-h-screen p-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-primary text-2xl">
              <Lock className="w-6 h-6" />
              Premium Community Access
            </CardTitle>
            <CardDescription className="text-lg">
              Subscribe to access our exclusive trading community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="bg-primary/10 p-6 rounded-lg border border-primary/20">
                <CreditCard className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">Premium Features</h3>
                <ul className="text-left space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Share trading insights and charts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Connect with experienced traders
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Access to exclusive discussions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Real-time market insights
                  </li>
                </ul>
              </div>
              <PaymentModal>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Subscribe Now
                </Button>
              </PaymentModal>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6 bg-background min-h-screen p-6">
        <Card className="border-primary/20 bg-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-primary text-2xl">
              <CheckCircle className="w-6 h-6 text-green-400" />
              Payment Verified!
            </CardTitle>
            <CardDescription className="text-lg text-green-400">
              Your payment has been verified. Enter the community password to access.
            </CardDescription>
          </CardHeader>
        </Card>
        <CommunityPasswordPrompt onPasswordSubmit={verifyPassword} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-black min-h-screen p-6">
      <Card className="bg-black border-2 border-blue-600 shadow-lg shadow-blue-600/20">
        <CardHeader>
          <CardTitle className="text-3xl text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-400" />
            Premium Trading Community
          </CardTitle>
          <CardDescription className="text-gray-300 text-lg">
            Connect with fellow traders, share insights, and discuss market strategies
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Create New Post */}
      <Card className="bg-black border-2 border-blue-600 shadow-lg shadow-blue-600/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-xl">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Share Your Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Post title..."
            value={newPost.title}
            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
            className="bg-gray-900 border-2 border-gray-700 focus:border-blue-400 text-white placeholder-gray-400 transition-all duration-300"
          />
          <Textarea
            placeholder="Share your trading insights, analysis, or questions..."
            value={newPost.content}
            onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
            className="bg-gray-900 border-2 border-gray-700 focus:border-blue-400 min-h-[100px] text-white placeholder-gray-400 transition-all duration-300"
          />
          
          {imagePreview && (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-w-full h-48 object-cover rounded-lg border-2 border-blue-400"
              />
              <Button
                onClick={removeImage}
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 transform hover:scale-110 transition-all duration-200"
                type="button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <input
            id="chart-upload-input"
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <div className="flex justify-between items-center">
            <select
              value={newPost.post_type}
              onChange={(e) => setNewPost(prev => ({ ...prev, post_type: e.target.value }))}
              className="bg-gray-900 border-2 border-gray-700 rounded px-4 py-2 text-white focus:border-blue-400 transition-all duration-300"
            >
              <option value="discussion">Discussion</option>
              <option value="chart">Chart Share</option>
              <option value="announcement">Announcement</option>
            </select>
            <div className="flex gap-3">
              <Button
                onClick={triggerFileInput}
                variant="outline"
                className="border-2 border-blue-400 bg-black hover:bg-blue-400 hover:text-black text-blue-400 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-400/50"
                type="button"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {selectedImage ? 'Change Chart' : 'Upload Chart'}
              </Button>
              <Button
                onClick={createPost}
                disabled={uploadingPost || (!newPost.title.trim() || !newPost.content.trim())}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPost ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    {selectedImage ? 'Uploading...' : 'Posting...'}
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
          <Card className="bg-black border-2 border-blue-600 shadow-lg shadow-blue-600/20">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-300 text-lg">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="bg-black border-2 border-gray-700 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-blue-400/30 transform hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && <Pin className="w-4 h-4 text-blue-400" />}
                      <h3 className="font-semibold text-white text-lg">{post.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-blue-400">{post.user_full_name}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs border-blue-400 text-blue-400 bg-blue-400/10">
                        {post.post_type}
                      </Badge>
                    </div>
                  </div>
                  
                  {user && post.user_id === user.id && (
                    <Button
                      onClick={() => deletePost(post.id)}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white transform hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-red-500/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 whitespace-pre-wrap mb-4 leading-relaxed">{post.content}</p>
                {post.image_url && (
                  <div className="mt-4">
                    <img 
                      src={post.image_url} 
                      alt="Chart" 
                      className="rounded-lg max-w-full h-auto border-2 border-blue-400 cursor-pointer hover:opacity-90 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-blue-400/30"
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
