
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { TrendingUp, Settings, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Navbar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAdminAccess = () => {
    navigate('/admin');
  };

  // Check if user is admin based on email
  const isAdmin = user?.email === 'adityabarod807@gmail.com' || user?.email === 'admin@swingscribe.com';

  return (
    <nav className="bg-dark-surface/80 backdrop-blur-lg border-b border-green-500/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-xl font-bold text-gradient">SwingScribe</h1>
              <p className="text-xs text-text-secondary">Trading Journal & Community</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  Welcome back, {profile?.full_name || user.email}
                </span>
                {profile?.is_community_member && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                    Community Member
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  onClick={handleAdminAccess}
                  variant="outline"
                  size="sm"
                  className="border-yellow-500/20 hover:bg-yellow-500/10 text-yellow-400 btn-animated"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-red-500/20 hover:bg-red-500/10 text-red-400 btn-animated"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
