import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Crown,
  ChevronDown,
  BarChart3,
  MessageSquare,
  Tag,
  FileText,
  DollarSign,
  CreditCard,
  Settings
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

const adminSubNav = [
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Threads', href: '/admin/threads', icon: MessageSquare },
  { name: 'Images', href: '/admin/images', icon: Image },
  { name: 'Categories', href: '/admin/categories', icon: Tag },
  { name: 'Templates', href: '/admin/templates', icon: FileText },
  { name: 'Affiliates', href: '/admin/affiliates', icon: DollarSign },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'));

  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border hidden lg:block">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="text-xl font-display font-bold">ThreadPosts</span>
            </Link>
            <ThemeToggle />
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {item.isPro && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary bg-primary/10">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </Link>
            ))}

            {/* Admin Submenu */}
            {isAdmin && (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full',
                      isAdminActive
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                    )}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="flex-1 text-left">Admin</span>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      adminOpen && 'rotate-180'
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {adminSubNav.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        location.pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="p-4 border-t border-border bg-card max-h-[70vh] overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {item.isPro && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary bg-primary/10">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </Link>
            ))}
            
            {/* Admin submenu for mobile */}
            {isAdmin && (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full',
                      isAdminActive
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'text-muted-foreground border border-transparent'
                    )}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="flex-1 text-left">Admin</span>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      adminOpen && 'rotate-180'
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {adminSubNav.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        location.pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            
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
