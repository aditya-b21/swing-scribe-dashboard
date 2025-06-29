
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  email_verified: boolean;
  admin_approved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  is_community_member: boolean;
  created_at: string;
  updated_at: string;
}

export function AllUsersManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    
    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('all-profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log('Profile updated, refetching users...');
        fetchUsers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching all users...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }
      
      console.log('Fetched all users:', data);
      
      // Type cast the data to ensure proper typing
      const typedUsers = data?.map(user => ({
        ...user,
        status: (user.status || 'pending') as 'pending' | 'approved' | 'rejected',
        email_verified: user.email_verified || false,
        admin_approved: user.admin_approved || false,
        is_community_member: user.is_community_member || false,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString()
      })) || [];
      
      setUsers(typedUsers as Profile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleCommunityMembership = async (userId: string, currentStatus: boolean) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    try {
      setUpdating(userId);
      const newStatus = !currentStatus;
      console.log(`Updating user ${userId} community membership to ${newStatus}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_community_member: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log(`Successfully updated user ${userId} community membership to ${newStatus}`);

      // Update the local state immediately
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_community_member: newStatus, updated_at: new Date().toISOString() }
            : user
        )
      );

      toast.success(newStatus ? 'User added to community' : 'User removed from community');
    } catch (error) {
      console.error('Error updating community membership:', error);
      toast.error('Failed to update community membership');
    } finally {
      setUpdating(null);
    }
  };

  const stats = {
    total: users.length,
    communityMembers: users.filter(u => u.is_community_member).length,
    emailVerified: users.filter(u => u.email_verified).length,
    adminApproved: users.filter(u => u.admin_approved).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <Card className="glass-effect border-green-500/20">
      <CardHeader>
        <CardTitle className="text-2xl text-gradient flex items-center gap-2">
          <Users className="w-6 h-6" />
          All Users - Real-Time Control
        </CardTitle>
        <CardDescription>Manage user community access and view live user data</CardDescription>
        
        <div className="flex justify-between items-center">
          <Button
            onClick={fetchUsers}
            variant="outline"
            size="sm"
            className="border-green-500/20 hover:bg-green-500/10 btn-animated"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{stats.total}</div>
              <div className="text-text-secondary">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{stats.communityMembers}</div>
              <div className="text-text-secondary">Community</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{stats.emailVerified}</div>
              <div className="text-text-secondary">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{stats.adminApproved}</div>
              <div className="text-text-secondary">Approved</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No users found.
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-green-500/10 hover:bg-white/10 transition-colors card-hover"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">
                      {user.full_name || user.email}
                    </h3>
                    
                    {user.is_community_member ? (
                      <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Community Member
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Not in Community
                      </Badge>
                    )}
                    
                    {user.email_verified && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                        Email Verified
                      </Badge>
                    )}
                    
                    {user.admin_approved && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                        Admin Approved
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-text-secondary mb-1">{user.email}</p>
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                    {user.updated_at !== user.created_at && (
                      <span>Updated: {new Date(user.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => toggleCommunityMembership(user.id, user.is_community_member)}
                    className={user.is_community_member 
                      ? "bg-red-600 hover:bg-red-700 text-white btn-animated" 
                      : "bg-green-600 hover:bg-green-700 text-white btn-animated pulse-glow"
                    }
                    disabled={updating === user.id}
                  >
                    {updating === user.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : user.is_community_member ? (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Remove from Community
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add to Community Group
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
