
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
      console.log('Admin login attempt with:', {
        username: credentials.username,
        passwordLength: credentials.password.length,
        masterKeyLength: credentials.masterKey.length
      });

      if (
        credentials.username.trim() === ADMIN_CREDENTIALS.username &&
        credentials.password.trim() === ADMIN_CREDENTIALS.password &&
        credentials.masterKey.trim() === ADMIN_CREDENTIALS.masterKey
      ) {
        localStorage.setItem('admin_authenticated', 'true');
        console.log('Admin authentication successful');
        onLogin();
        toast.success('Admin login successful');
      } else {
        console.log('Admin authentication failed - credentials mismatch');
        console.log('Expected:', ADMIN_CREDENTIALS);
        console.log('Received:', {
          username: credentials.username.trim(),
          password: credentials.password.trim(),
          masterKey: credentials.masterKey.trim()
        });
        toast.error('Invalid admin credentials. Please check your username, password, and master key.');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-effect shine-animation">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-gray-300" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Access</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your admin credentials to continue
            <br />
            <small className="text-xs text-gray-500 mt-2 block">
              Username: admin | Password: SwingScribe2024! | Master Key: SWING_ADMIN_2024
            </small>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="bg-card-bg border-gray-600 focus:border-gray-400 text-white placeholder:text-gray-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="bg-card-bg border-gray-600 focus:border-gray-400 text-white placeholder:text-gray-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="masterKey" className="text-gray-300">Master Key</Label>
              <Input
                id="masterKey"
                type="password"
                placeholder="Enter master key"
                value={credentials.masterKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, masterKey: e.target.value }))}
                className="bg-card-bg border-gray-600 focus:border-gray-400 text-white placeholder:text-gray-500"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold btn-animated"
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
