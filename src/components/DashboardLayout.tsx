import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  Layout, 
  Image, 
  Clock, 
  Users, 
  LogOut,
  Menu,
  X,
  Shield,
  Crown
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Generator', href: '/dashboard', icon: Zap, isPro: false },
  { name: 'Templates', href: '/templates', icon: Layout, isPro: true },
  { name: 'Images', href: '/images', icon: Image, isPro: true },
  { name: 'History', href: '/history', icon: Clock, isPro: false },
  { name: 'Affiliate', href: '/affiliate', icon: Users, isPro: false },
];

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: Shield },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allNavigation = isAdmin ? [...navigation, ...adminNavigation] : navigation;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border hidden lg:block">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="text-xl font-display font-bold">ThreadPosts</span>
            </Link>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {allNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  item.name === 'Admin' && 'border border-primary/30'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {'isPro' in item && item.isPro && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary bg-primary/10">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
          
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 truncate">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  {isAdmin && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary bg-primary/10 shrink-0">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display font-bold">ThreadPosts</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="p-4 border-t border-border bg-card">
            {allNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground',
                  item.name === 'Admin' && 'border border-primary/30'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {'isPro' in item && item.isPro && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary bg-primary/10">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </Link>
            ))}
            <Button variant="ghost" className="w-full justify-start mt-4" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
