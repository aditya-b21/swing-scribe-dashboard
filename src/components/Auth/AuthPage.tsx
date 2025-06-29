
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, User, Crown, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'SwingScribe2024!',
  masterKey: 'SWING_ADMIN_2024'
};

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  const [adminCredentials, setAdminCredentials] = useState({
    username: '',
    password: '',
    masterKey: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signIn(formData.email, formData.password);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signUp(formData.email, formData.password, formData.fullName);
      toast.success('Account created successfully! Please check your email for verification.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (
        adminCredentials.username === ADMIN_CREDENTIALS.username &&
        adminCredentials.password === ADMIN_CREDENTIALS.password &&
        adminCredentials.masterKey === ADMIN_CREDENTIALS.masterKey
      ) {
        localStorage.setItem('admin_authenticated', 'true');
        navigate('/admin');
        toast.success('Admin login successful');
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error) {
      toast.error('Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-effect shine-animation">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Crown className="w-12 h-12 text-gray-300" />
          </div>
          <CardTitle className="text-2xl text-white">SwingScribe</CardTitle>
          <CardDescription className="text-gray-400">Your Premium Trading Journal & Community</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-card-bg border border-gray-600">
              <TabsTrigger value="signin" className="btn-animated text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="btn-animated text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">Sign Up</TabsTrigger>
              <TabsTrigger value="admin" className="btn-animated text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-card-bg border-gray-600 pl-10 focus:border-gray-400 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-card-bg border-gray-600 pl-10 focus:border-gray-400 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold btn-animated"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="bg-card-bg border-gray-600 pl-10 focus:border-gray-400 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-card-bg border-gray-600 pl-10 focus:border-gray-400 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-card-bg border-gray-600 pl-10 focus:border-gray-400 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold btn-animated"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="flex justify-center mb-4">
                  <Shield className="w-8 h-8 text-gray-300" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-username" className="text-gray-300">Username</Label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="Enter admin username"
                    value={adminCredentials.username}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-card-bg border-gray-600 focus:border-gray-400 text-white placeholder:text-gray-500"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-gray-300">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={adminCredentials.password}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-card-bg border-gray-600 focus:border-gray-400 text-white placeholder:text-gray-500"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-masterkey" className="text-gray-300">Master Key</Label>
                  <Input
                    id="admin-masterkey"
                    type="password"
                    placeholder="Enter master key"
                    value={adminCredentials.masterKey}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, masterKey: e.target.value }))}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
