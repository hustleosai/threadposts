import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, 
  MessageSquare, 
  Settings, 
  Loader2, 
  Shield, 
  Search,
  Trash2,
  Crown,
  ShieldPlus,
  ShieldMinus,
  Image,
  Tag,
  FileText,
  DollarSign,
  CreditCard,
  BarChart3
} from 'lucide-react';
import AdminImageModeration from '@/components/AdminImageModeration';
import AdminCategoryManager from '@/components/AdminCategoryManager';
import AdminTemplateManager from '@/components/AdminTemplateManager';
import AdminAffiliateManager from '@/components/AdminAffiliateManager';
import AdminSubscriptionManager from '@/components/AdminSubscriptionManager';
import AdminAnalytics from '@/components/AdminAnalytics';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ThreadHistory {
  id: string;
  user_id: string;
  topic: string;
  platform: string;
  content: string;
  created_at: string;
  is_favorite: boolean | null;
}

interface UserRole {
  id?: string;
  user_id: string;
  role: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [threads, setThreads] = useState<ThreadHistory[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [threadSearch, setThreadSearch] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchThreads();
      fetchUserRoles();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchThreads = async () => {
    setLoadingThreads(true);
    try {
      const { data, error } = await supabase
        .from('thread_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast.error('Failed to load threads');
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const isUserAdmin = (userId: string) => {
    return userRoles.some(r => r.user_id === userId && r.role === 'admin');
  };

  const grantAdminRole = async (userId: string) => {
    // Prevent removing your own admin role
    if (isUserAdmin(userId)) {
      toast.error('User already has admin role');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;
      await fetchUserRoles();
      toast.success('Admin role granted');
    } catch (error) {
      console.error('Error granting admin role:', error);
      toast.error('Failed to grant admin role');
    }
  };

  const revokeAdminRole = async (userId: string) => {
    // Prevent removing your own admin role
    if (userId === user?.id) {
      toast.error("You cannot revoke your own admin role");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
      await fetchUserRoles();
      toast.success('Admin role revoked');
    } catch (error) {
      console.error('Error revoking admin role:', error);
      toast.error('Failed to revoke admin role');
    }
  };

  const getUserRole = (userId: string) => {
    const roles = userRoles.filter(r => r.user_id === userId);
    return roles.map(r => r.role);
  };

  const deleteThread = async (threadId: string) => {
    try {
      const { error } = await supabase
        .from('thread_history')
        .delete()
        .eq('id', threadId);

      if (error) throw error;
      setThreads(threads.filter(t => t.id !== threadId));
      toast.success('Thread deleted');
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete thread');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredThreads = threads.filter(t =>
    t.topic.toLowerCase().includes(threadSearch.toLowerCase()) ||
    t.platform.toLowerCase().includes(threadSearch.toLowerCase())
  );

  if (adminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, threads, and app settings</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Threads</p>
                  <p className="text-2xl font-bold">{threads.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{userRoles.filter(r => r.role === 'admin').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="bg-secondary flex-wrap">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="threads" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Threads
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="h-4 w-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Affiliates
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userProfile) => (
                        <TableRow key={userProfile.id}>
                          <TableCell className="font-medium">{userProfile.email || 'N/A'}</TableCell>
                          <TableCell>{userProfile.full_name || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {getUserRole(userProfile.user_id).map(role => (
                                <Badge 
                                  key={role} 
                                  variant={role === 'admin' ? 'default' : 'secondary'}
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(userProfile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {isUserAdmin(userProfile.user_id) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeAdminRole(userProfile.user_id)}
                                disabled={userProfile.user_id === user?.id}
                                className="text-destructive hover:text-destructive"
                              >
                                <ShieldMinus className="h-4 w-4 mr-1" />
                                Revoke Admin
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => grantAdminRole(userProfile.user_id)}
                                className="text-primary hover:text-primary"
                              >
                                <ShieldPlus className="h-4 w-4 mr-1" />
                                Grant Admin
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Threads Tab */}
          <TabsContent value="threads">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Thread Management</CardTitle>
                <CardDescription>View and manage all generated threads</CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search threads..."
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingThreads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Favorite</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredThreads.map((thread) => (
                        <TableRow key={thread.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {thread.topic}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{thread.platform}</Badge>
                          </TableCell>
                          <TableCell>
                            {thread.is_favorite ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(thread.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteThread(thread.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredThreads.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No threads found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <AdminImageModeration />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <AdminCategoryManager />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <AdminTemplateManager />
          </TabsContent>

          {/* Affiliates Tab */}
          <TabsContent value="affiliates">
            <AdminAffiliateManager />
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <AdminSubscriptionManager />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>App Settings</CardTitle>
                <CardDescription>Configure application settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Subscription</h3>
                  <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                    <p className="text-sm"><strong>Product:</strong> ThreadPosts Pro</p>
                    <p className="text-sm"><strong>Price:</strong> $5/month</p>
                    <p className="text-sm"><strong>Price ID:</strong> price_1SczUKDfNHMKrGiAGJyzqRNW</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Affiliate Program</h3>
                  <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                    <p className="text-sm"><strong>Commission Rate:</strong> 50%</p>
                    <p className="text-sm"><strong>Minimum Payout:</strong> $25</p>
                    <p className="text-sm"><strong>Attribution:</strong> Lifetime</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">AI Configuration</h3>
                  <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                    <p className="text-sm"><strong>Model:</strong> Gemini 2.5 Flash</p>
                    <p className="text-sm"><strong>Provider:</strong> Lovable AI Gateway</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
