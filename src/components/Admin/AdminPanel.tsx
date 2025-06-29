
import { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { UserManagement } from './UserManagement';
import { CommunityManagement } from './CommunityManagement';
import { CommunityRequestsManagement } from './CommunityRequestsManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, MessageSquare, UserPlus, LogOut } from 'lucide-react';
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
        <Card className="glass-effect border-white/20">
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
                className="border-white/20 hover:bg-white/5"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="community-requests" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Community Requests
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Community Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
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
