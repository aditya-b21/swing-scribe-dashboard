
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AdminLoginProps {
  onLogin: () => void;
}

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'SwingScribe2024!',
  masterKey: 'SWING_ADMIN_2024'
};

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    masterKey: ''
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (
        credentials.username === ADMIN_CREDENTIALS.username &&
        credentials.password === ADMIN_CREDENTIALS.password &&
        credentials.masterKey === ADMIN_CREDENTIALS.masterKey
      ) {
        localStorage.setItem('admin_authenticated', 'true');
        onLogin();
        toast.success('Admin login successful');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-effect border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-accent-gold" />
          </div>
          <CardTitle className="text-2xl text-gradient">Admin Access</CardTitle>
          <CardDescription>Secure admin panel authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="bg-white/5 border-white/20"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="bg-white/5 border-white/20"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="masterKey">Master Key</Label>
              <Input
                id="masterKey"
                type="password"
                value={credentials.masterKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, masterKey: e.target.value }))}
                className="bg-white/5 border-white/20"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full gradient-gold text-dark-bg font-semibold"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
