
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Regular user auth state
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Admin auth state
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    masterKey: ''
  });

  const handleUserSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(userForm.email, userForm.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message);
        }
      } else {
        toast.success('Signed in successfully!');
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (userForm.password !== userForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (userForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(userForm.email, userForm.password);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        toast.success('Account created! Please check your email to confirm your account.');
        setUserForm({ email: '', password: '', confirmPassword: '' });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check admin credentials (credentials are hardcoded for security)
    if (
      adminForm.username === 'admin' &&
      adminForm.password === 'SwingScribe2024!' &&
      adminForm.masterKey === 'SWING_ADMIN_2024'
    ) {
      localStorage.setItem('admin_authenticated', 'true');
      toast.success('Admin login successful!');
      navigate('/admin');
    } else {
      setError('Invalid admin credentials. Please check your username, password, and master key.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gradient mb-2">SwingScribe</h1>
        <p className="text-text-secondary">Professional Trading Journal & Community</p>
      </div>

      <Card className="w-full max-w-md glass-effect border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gradient">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account or join our community</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5">
              <TabsTrigger value="signin" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Sign Up
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            {error && (
              <Alert className="mt-4 border-red-500/20 bg-red-500/10">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="signin">
              <form onSubmit={handleUserSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-gold text-dark-bg"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleUserSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password (min. 6 characters)"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-gold text-dark-bg"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Admin Access Required
                  </h4>
                  <p className="text-xs text-blue-300">
                    Enter your admin credentials to access the administration panel.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-username">Username</Label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="Enter admin username"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="master-key">Master Key</Label>
                  <Input
                    id="master-key"
                    type="password"
                    placeholder="Enter master key"
                    value={adminForm.masterKey}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, masterKey: e.target.value }))}
                    className="bg-white/5 border-white/20"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {loading ? 'Authenticating...' : 'Admin Login'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-sm text-text-secondary">
        <p>Join thousands of traders improving their performance</p>
      </div>
    </div>
  );
}
