
import { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { UserManagement } from './UserManagement';
import { CommunityManagement } from './CommunityManagement';
import { CommunityRequestsManagement } from './CommunityRequestsManagement';
import { AllUsersManagement } from './AllUsersManagement';
import { CommunityPasswordManagement } from './CommunityPasswordManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, MessageSquare, UserPlus, LogOut, UsersIcon, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('admin_authenticated') === 'true'
  );
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    navigate('/auth');
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg p-4">
      <div className="container mx-auto space-y-6">
        <Card className="glass-effect shine-animation">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-accent-gold" />
                <div>
                  <CardTitle className="text-3xl text-gradient">Admin Panel</CardTitle>
                  <p className="text-text-secondary">SwingScribe Administration</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-500/20 hover:bg-red-500/10 text-red-400 btn-animated"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="all-users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card-bg border border-gold/20">
            <TabsTrigger value="all-users" className="flex items-center gap-2 btn-animated text-accent-gold">
              <UsersIcon className="w-4 h-4" />
              <span className="hidden sm:inline">All Users</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 btn-animated text-accent-gold">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">User Management</span>
            </TabsTrigger>
            <TabsTrigger value="community-password" className="flex items-center gap-2 btn-animated text-accent-gold">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Community Password</span>
            </TabsTrigger>
            <TabsTrigger value="community-requests" className="flex items-center gap-2 btn-animated text-accent-gold">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Community Requests</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2 btn-animated text-accent-gold">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Community Management</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-users">
            <AllUsersManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="community-password">
            <CommunityPasswordManagement />
          </TabsContent>

          <TabsContent value="community-requests">
            <CommunityRequestsManagement />
          </TabsContent>

          <TabsContent value="community">
            <CommunityManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
