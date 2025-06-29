import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { TrendingUp, Shield, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signUp(email, password);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Please check your email to verify.');
    }
    
    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const masterKey = formData.get('masterKey') as string;

    try {
      if (
        username === 'admin' &&
        password === 'SwingScribe2024!' &&
        masterKey === 'SWING_ADMIN_2024'
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block space-y-8"
        >
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gradient">SwingScribe</h1>
            <p className="text-xl text-text-secondary">
              Professional Indian Stock Market Trading Dashboard
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent-gold/20">
                <TrendingUp className="w-6 h-6 text-accent-gold" />
              </div>
              <div>
                <h3 className="font-semibold">Trade Journal</h3>
                <p className="text-text-secondary">Track all your swing trades with detailed analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent-gold/20">
                <BarChart3 className="w-6 h-6 text-accent-gold" />
              </div>
              <div>
                <h3 className="font-semibold">Setup Tracker</h3>
                <p className="text-text-secondary">Monitor VCP, Rocket Base, and IPO setups</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent-gold/20">
                <Shield className="w-6 h-6 text-accent-gold" />
              </div>
              <div>
                <h3 className="font-semibold">Performance Analytics</h3>
                <p className="text-text-secondary">Weekly insights and trading calculators</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right side - Auth Forms */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="glass-effect border-white/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to SwingScribe</CardTitle>
              <CardDescription>Access your trading dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-gold text-dark-bg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-gold text-dark-bg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="admin">
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="flex items-center gap-2 mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <Shield className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500">Admin Access Only</span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-username">Username</Label>
                      <Input
                        id="admin-username"
                        name="username"
                        type="text"
                        defaultValue="admin"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        name="password"
                        type="password"
                        defaultValue="SwingScribe2024!"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-masterKey">Master Key</Label>
                      <Input
                        id="admin-masterKey"
                        name="masterKey"
                        type="password"
                        defaultValue="SWING_ADMIN_2024"
                        required
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gradient-gold text-dark-bg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Accessing...' : 'Access Admin Panel'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
