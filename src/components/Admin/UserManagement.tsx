
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Check, X, RefreshCw, UserCheck, UserX, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  email_verified: boolean;
  admin_approved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    
    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }
      
      console.log('Fetched users:', data);
      
      // Type cast the data to ensure proper typing
      const typedUsers = data?.map(user => ({
        ...user,
        status: (user.status || 'pending') as 'pending' | 'approved' | 'rejected',
        email_verified: user.email_verified || false,
        admin_approved: user.admin_approved || false,
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

  const updateUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    try {
      setUpdating(userId);
      console.log(`Updating user ${userId} to ${status}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status,
          admin_approved: status === 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log(`Successfully updated user ${userId} to ${status}`);

      // Update the local state immediately
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status, admin_approved: status === 'approved', updated_at: new Date().toISOString() }
            : user
        )
      );

      toast.success(`User ${status} successfully`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error(`Failed to ${status} user`);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'pending') return user.status === 'pending';
    if (filter === 'approved') return user.status === 'approved';
    if (filter === 'rejected') return user.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1">
            <UserX className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length
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
          <Users className="w-6 h-6" />
          User Management
        </CardTitle>
        <CardDescription>Manage user approvals and community access</CardDescription>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users ({stats.total})</SelectItem>
                <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
                <SelectItem value="approved">Approved ({stats.approved})</SelectItem>
                <SelectItem value="rejected">Rejected ({stats.rejected})</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={fetchUsers}
              variant="outline"
              size="sm"
              className="border-white/20 hover:bg-white/5"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-accent-gold">{stats.total}</div>
              <div className="text-text-secondary">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-text-secondary">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{stats.approved}</div>
              <div className="text-text-secondary">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{stats.rejected}</div>
              <div className="text-text-secondary">Rejected</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {users.length === 0 ? 'No users found.' : `No ${filter} users found.`}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">
                      {user.full_name || user.email}
                    </h3>
                    {getStatusBadge(user.status)}
                    {user.email_verified && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                        Email Verified
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
                  {user.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateUserStatus(user.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={updating === user.id}
                      >
                        {updating === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateUserStatus(user.id, 'rejected')}
                        disabled={updating === user.id}
                      >
                        {updating === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  
                  {user.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateUserStatus(user.id, 'rejected')}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                      disabled={updating === user.id}
                    >
                      {updating === user.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  )}
                  
                  {user.status === 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => updateUserStatus(user.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={updating === user.id}
                    >
                      {updating === user.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Restore
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
