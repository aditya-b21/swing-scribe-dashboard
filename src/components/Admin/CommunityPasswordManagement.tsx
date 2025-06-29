
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Eye, Users, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AccessLog {
  id: string;
  user_email: string;
  user_id: string;
  accessed_at: string;
  profiles?: {
    full_name?: string;
  };
}

export function CommunityPasswordManagement() {
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    fetchCurrentPassword();
    fetchAccessLogs();
  }, []);

  const fetchCurrentPassword = async () => {
    try {
      setAuthError(false);
      console.log('Fetching current password...');
      
      const { data, error } = await supabase.functions.invoke('get-community-password');
      
      if (error) {
        console.error('Password fetch error:', error);
        if (error.message?.includes('Unauthorized') || error.message?.includes('Admin access required')) {
          setAuthError(true);
          toast.error('Admin access required. Please ensure you are logged in as an admin.');
        } else {
          toast.error('Failed to fetch current password: ' + error.message);
        }
        setCurrentPassword('Error loading');
        return;
      }

      console.log('Password fetch response:', data);
      setCurrentPassword(data?.password ? '••••••••••••••••' : 'Not set');
    } catch (error) {
      console.error('Error fetching password:', error);
      setAuthError(true);
      toast.error('Failed to fetch current password');
      setCurrentPassword('Error loading');
    }
  };

  const fetchAccessLogs = async () => {
    try {
      setLogsLoading(true);
      console.log('Fetching access logs...');
      
      const { data, error } = await supabase.functions.invoke('get-community-access-logs');
      
      if (error) {
        console.error('Access logs fetch error:', error);
        if (!error.message?.includes('Unauthorized')) {
          toast.error('Failed to fetch access logs: ' + error.message);
        }
        setAccessLogs([]);
        return;
      }

      console.log('Access logs response:', data);
      setAccessLogs(data?.logs || []);
    } catch (error) {
      console.error('Error fetching access logs:', error);
      setAccessLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating password...');
      
      const { data, error } = await supabase.functions.invoke('update-community-password', {
        body: { password: newPassword }
      });

      if (error) {
        console.error('Password update error:', error);
        if (error.message?.includes('Unauthorized') || error.message?.includes('Admin access required')) {
          setAuthError(true);
          toast.error('Admin access required. Please ensure you are logged in as an admin.');
        } else {
          toast.error('Failed to update password: ' + error.message);
        }
        return;
      }

      console.log('Password update response:', data);
      toast.success('Community password updated successfully');
      setNewPassword('');
      setAuthError(false);
      await fetchCurrentPassword();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password. Please check your admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Auth Error Banner */}
      {authError && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>Admin authentication required. Please ensure you are logged in with admin credentials.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Management */}
      <Card className="glass-effect shine-animation border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Lock className="w-5 h-5" />
            Community Access Password
          </CardTitle>
          <CardDescription className="text-slate-400">
            Set or update the password required for community access (Default: SwingScribe1234@)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Current Password</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={currentPassword}
                readOnly
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {currentPassword === 'Not set' || currentPassword === 'Error loading' ? 'Not Set' : 'Active'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
            <Input
              id="new-password"
              type="password" 
              placeholder="Enter new community password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-slate-800 border-slate-600 focus:border-slate-400 text-white"
              disabled={authError}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={updatePassword}
              disabled={loading || authError}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold btn-animated btn-glow"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
            
            <Button
              onClick={fetchCurrentPassword}
              variant="outline"
              className="border-slate-600 hover:bg-slate-800 text-slate-300 btn-animated"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Access Logs */}
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5" />
            Community Access Logs
          </CardTitle>
          <CardDescription className="text-slate-400">
            Users who have successfully accessed the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No access logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accessLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600 card-hover">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="font-medium text-white">
                        {log.profiles?.full_name || log.user_email}
                      </p>
                      {log.profiles?.full_name && (
                        <p className="text-sm text-slate-400">{log.user_email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(log.accessed_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-slate-600">
            <Button
              onClick={fetchAccessLogs}
              variant="outline"
              className="border-slate-600 hover:bg-slate-800 text-slate-300 btn-animated btn-scale"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
