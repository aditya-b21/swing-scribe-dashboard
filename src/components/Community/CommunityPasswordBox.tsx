
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CommunityPasswordBox() {
  const { user } = useAuth();
  const [canSeePassword, setCanSeePassword] = useState(false);
  const [communityPassword, setCommunityPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkPasswordVisibility();
    }
  }, [user]);

  const checkPasswordVisibility = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if user can see password
      const { data: paymentData, error } = await supabase
        .from('payment_submissions')
        .select('can_see_password')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .eq('can_see_password', true)
        .limit(1);

      if (error) {
        console.error('Error checking password visibility:', error);
        return;
      }

      const hasAccess = paymentData && paymentData.length > 0;
      setCanSeePassword(hasAccess);

      if (hasAccess) {
        await fetchCommunityPassword();
      }
    } catch (error) {
      console.error('Error in checkPasswordVisibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityPassword = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-community-password');
      
      if (error) {
        console.error('Error fetching password:', error);
        return;
      }

      if (data?.password) {
        setCommunityPassword(data.password);
      }
    } catch (error) {
      console.error('Error fetching community password:', error);
      toast.error('Failed to fetch community password');
    }
  };

  if (loading) {
    return (
      <Card className="bg-black border-2 border-blue-600 shadow-lg shadow-blue-600/20">
        <CardContent className="p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!canSeePassword) {
    return (
      <Card className="bg-black border-2 border-yellow-600 shadow-lg shadow-yellow-600/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Lock className="w-5 h-5" />
            Community Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 text-sm">
            Complete your payment and get admin verification to access the community password.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black border-2 border-green-600 shadow-lg shadow-green-600/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-400">
          <CheckCircle className="w-5 h-5" />
          Community Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-900 p-4 rounded-lg border border-green-400/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-2">Active Password:</label>
              <div className="font-mono text-lg text-green-400">
                {showPassword ? communityPassword : '••••••••••••'}
              </div>
            </div>
            <Button
              onClick={() => setShowPassword(!showPassword)}
              variant="outline"
              size="sm"
              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Use this password to access the community features. Keep it secure!
        </p>
      </CardContent>
    </Card>
  );
}
