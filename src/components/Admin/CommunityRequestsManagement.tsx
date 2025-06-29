
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Check, X, RefreshCw, Clock, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityRequest {
  id: string;
  email: string;
  full_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  community_request_status?: 'pending' | 'approved' | 'denied' | null;
}

export function CommunityRequestsManagement() {
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunityRequests();
    
    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('community-requests-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchCommunityRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCommunityRequests = async () => {
    try {
      console.log('Fetching community requests...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('community_request_status', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch error:', error);
        toast.error('Failed to fetch community requests');
        return;
      }
      
      console.log('Fetched community requests:', data);
      
      const typedRequests = data?.map(request => ({
        id: request.id,
        email: request.email || '',
        full_name: request.full_name || undefined,
        status: (request.status || 'pending') as 'pending' | 'approved' | 'rejected',
        community_request_status: request.community_request_status as 'pending' | 'approved' | 'denied' | null,
        created_at: request.created_at || new Date().toISOString(),
        updated_at: request.updated_at || new Date().toISOString()
      })) || [];
      
      setRequests(typedRequests);
    } catch (error) {
      console.error('Error fetching community requests:', error);
      toast.error('Failed to fetch community requests');
    } finally {
      setLoading(false);
    }
  };

  const updateCommunityRequestStatus = async (userId: string, communityStatus: 'approved' | 'denied') => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    try {
      setUpdating(userId);
      console.log(`Updating community request for user ${userId} to ${communityStatus}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          community_request_status: communityStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Update error:', error);
        toast.error(`Failed to ${communityStatus} community request`);
        return;
      }

      console.log(`Successfully updated community request for user ${userId} to ${communityStatus}`);

      // Update the local state immediately
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === userId 
            ? { ...request, community_request_status: communityStatus, updated_at: new Date().toISOString() }
            : request
        )
      );

      toast.success(`Community request ${communityStatus} successfully`);
    } catch (error) {
      console.error('Error updating community request status:', error);
      toast.error(`Failed to ${communityStatus} community request`);
    } finally {
      setUpdating(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'pending') return request.community_request_status === 'pending';
    if (filter === 'approved') return request.community_request_status === 'approved';
    if (filter === 'denied') return request.community_request_status === 'denied';
    return true;
  });

  const getCommunityStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'denied':
        return (
          <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1">
            <UserX className="w-3 h-3" />
            Denied
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
    total: requests.length,
    pending: requests.filter(r => r.community_request_status === 'pending').length,
    approved: requests.filter(r => r.community_request_status === 'approved').length,
    denied: requests.filter(r => r.community_request_status === 'denied').length
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
          <UserPlus className="w-6 h-6" />
          Community Join Requests
        </CardTitle>
        <CardDescription>Manage community access requests from users</CardDescription>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests ({stats.total})</SelectItem>
                <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
                <SelectItem value="approved">Approved ({stats.approved})</SelectItem>
                <SelectItem value="denied">Denied ({stats.denied})</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={fetchCommunityRequests}
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
              <div className="text-lg font-bold text-red-400">{stats.denied}</div>
              <div className="text-text-secondary">Denied</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {requests.length === 0 ? 'No community requests found.' : `No ${filter} community requests found.`}
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">
                      {request.full_name || request.email}
                    </h3>
                    {getCommunityStatusBadge(request.community_request_status)}
                  </div>
                  <p className="text-sm text-text-secondary mb-1">{request.email}</p>
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                    {request.updated_at !== request.created_at && (
                      <span>Updated: {new Date(request.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {request.community_request_status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateCommunityRequestStatus(request.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={updating === request.id}
                      >
                        {updating === request.id ? (
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
                        onClick={() => updateCommunityRequestStatus(request.id, 'denied')}
                        disabled={updating === request.id}
                      >
                        {updating === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Deny
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  
                  {request.community_request_status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCommunityRequestStatus(request.id, 'denied')}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                      disabled={updating === request.id}
                    >
                      {updating === request.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  )}
                  
                  {request.community_request_status === 'denied' && (
                    <Button
                      size="sm"
                      onClick={() => updateCommunityRequestStatus(request.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={updating === request.id}
                    >
                      {updating === request.id ? (
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
