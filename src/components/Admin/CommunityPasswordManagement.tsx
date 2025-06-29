
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Eye, Users, Clock, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    fetchCurrentPassword();
    fetchAccessLogs();
  }, []);

  const fetchCurrentPassword = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-community-password');
      if (error) throw error;
      setCurrentPassword(data?.password ? '••••••••' : 'Not set');
    } catch (error) {
      console.error('Error fetching password:', error);
    }
  };

  const fetchAccessLogs = async () => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase.functions.invoke('get-community-access-logs');
      if (error) throw error;
      setAccessLogs(data?.logs || []);
    } catch (error) {
      console.error('Error fetching access logs:', error);
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
      const { error } = await supabase.functions.invoke('update-community-password', {
        body: { password: newPassword }
      });

      if (error) throw error;

      toast.success('Community password updated successfully');
      setNewPassword('');
      await fetchCurrentPassword();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Password Management */}
      <Card className="glass-effect shine-animation">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Lock className="w-5 h-5" />
            Community Access Password
          </CardTitle>
          <CardDescription className="text-text-secondary">
            Set or update the password required for community access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Current Password</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={currentPassword}
                readOnly
                className="bg-card-bg border-gray-600 text-white"
              />
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                {currentPassword === 'Not set' ? 'Not Set' : 'Active'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-gray-300">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new community password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-card-bg border-gray-600 focus:border-gray-400 text-white"
            />
          </div>

          <Button
            onClick={updatePassword}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold btn-animated btn-glow"
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
        </CardContent>
      </Card>

      {/* Access Logs */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5" />
            Community Access Logs
          </CardTitle>
          <CardDescription className="text-text-secondary">
            Users who have successfully accessed the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-text-secondary">No access logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accessLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-card-bg rounded-lg border border-gray-600 card-hover">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">
                        {log.profiles?.full_name || log.user_email}
                      </p>
                      {log.profiles?.full_name && (
                        <p className="text-sm text-text-secondary">{log.user_email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(log.accessed_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-600">
            <Button
              onClick={fetchAccessLogs}
              variant="outline"
              className="border-gray-600 hover:bg-card-bg text-gray-300 btn-animated btn-scale"
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
