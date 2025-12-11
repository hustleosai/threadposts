import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, MessageSquare, TrendingUp, CreditCard, DollarSign, UserPlus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';

interface DailyStats {
  date: string;
  users: number;
  threads: number;
}

interface PlatformStats {
  platform: string;
  count: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [totals, setTotals] = useState({
    totalUsers: 0,
    totalThreads: 0,
    activeSubscriptions: 0,
    totalEarnings: 0,
    newUsersToday: 0,
    threadsToday: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    try {
      // Fetch all data in parallel
      const [
        usersResult,
        threadsResult,
        subscriptionsResult,
        earningsResult,
        platformResult,
      ] = await Promise.all([
        supabase.from('profiles').select('created_at'),
        supabase.from('thread_history').select('created_at, platform'),
        supabase.from('user_billing').select('subscription_status'),
        supabase.from('affiliate_earnings').select('amount'),
        supabase.from('thread_history').select('platform'),
      ]);

      // Calculate totals
      const totalUsers = usersResult.data?.length || 0;
      const totalThreads = threadsResult.data?.length || 0;
      const activeSubscriptions = subscriptionsResult.data?.filter(
        s => s.subscription_status === 'active' || s.subscription_status === 'trialing'
      ).length || 0;
      const totalEarnings = earningsResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Calculate today's stats
      const today = startOfDay(new Date());
      const newUsersToday = usersResult.data?.filter(
        u => new Date(u.created_at) >= today
      ).length || 0;
      const threadsToday = threadsResult.data?.filter(
        t => new Date(t.created_at) >= today
      ).length || 0;

      setTotals({
        totalUsers,
        totalThreads,
        activeSubscriptions,
        totalEarnings,
        newUsersToday,
        threadsToday,
      });

      // Build daily stats for the chart
      const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData: DailyStats[] = dateInterval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const usersOnDay = usersResult.data?.filter(u => {
          const created = new Date(u.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length || 0;

        const threadsOnDay = threadsResult.data?.filter(t => {
          const created = new Date(t.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length || 0;

        return {
          date: format(date, 'MMM dd'),
          users: usersOnDay,
          threads: threadsOnDay,
        };
      });

      setDailyStats(dailyData);

      // Calculate platform distribution
      const platformCounts: Record<string, number> = {};
      platformResult.data?.forEach(t => {
        const platform = t.platform || 'unknown';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });

      const platformData = Object.entries(platformCounts).map(([platform, count]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        count,
      }));

      setPlatformStats(platformData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-xl font-bold">{totals.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserPlus className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New Today</p>
                <p className="text-xl font-bold">{totals.newUsersToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Threads</p>
                <p className="text-xl font-bold">{totals.totalThreads.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Threads Today</p>
                <p className="text-xl font-bold">{totals.threadsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Subs</p>
                <p className="text-xl font-bold">{totals.activeSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold">${totals.totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">User Growth</CardTitle>
            <CardDescription>New user signups over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    fill="url(#userGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Thread Generation Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Thread Generation</CardTitle>
            <CardDescription>Threads created over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="threads" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Platform Distribution</CardTitle>
          <CardDescription>Threads generated by platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[250px] w-full md:w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {platformStats.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {platformStats.map((platform, index) => (
                <div key={platform.platform} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {platform.platform}: <span className="font-medium text-foreground">{platform.count}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
