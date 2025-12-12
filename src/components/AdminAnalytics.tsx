import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, MessageSquare, TrendingUp, CreditCard, DollarSign, UserPlus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import UserLocationMap from './UserLocationMap';

interface DailyStats {
  date: string;
  users: number;
  threads: number;
  subscriptions: number;
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
  const [conversionData, setConversionData] = useState<{ date: string; rate: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ date: string; mrr: number; newRevenue: number }[]>([]);
  const [totals, setTotals] = useState({
    totalUsers: 0,
    totalThreads: 0,
    activeSubscriptions: 0,
    totalEarnings: 0,
    newUsersToday: 0,
    threadsToday: 0,
    conversionRate: 0,
    newSubscriptionsToday: 0,
    currentMRR: 0,
    projectedARR: 0,
  });
  const [periodComparison, setPeriodComparison] = useState({
    usersGrowth: 0,
    threadsGrowth: 0,
    subscriptionsGrowth: 0,
    earningsGrowth: 0,
    currentPeriodUsers: 0,
    previousPeriodUsers: 0,
    currentPeriodThreads: 0,
    previousPeriodThreads: 0,
    currentPeriodSubs: 0,
    previousPeriodSubs: 0,
    mrrGrowth: 0,
  });
  
  // Subscription price in dollars
  const SUBSCRIPTION_PRICE = 5;

  // Memoized fetch function for realtime updates
  const fetchAnalyticsQuiet = useCallback(async () => {
    const days = parseInt(dateRange);
    const currentStart = startOfDay(subDays(new Date(), days));
    const currentEnd = endOfDay(new Date());
    const previousStart = startOfDay(subDays(new Date(), days * 2));
    const previousEnd = endOfDay(subDays(new Date(), days + 1));

    try {
      const [
        usersResult,
        threadsResult,
        subscriptionsResult,
        earningsResult,
        platformResult,
      ] = await Promise.all([
        supabase.from('profiles').select('created_at'),
        supabase.from('thread_history').select('created_at, platform'),
        supabase.from('user_billing').select('subscription_status, created_at, updated_at'),
        supabase.from('affiliate_earnings').select('amount, created_at'),
        supabase.from('thread_history').select('platform'),
      ]);

      const isInRange = (dateStr: string, start: Date, end: Date) => {
        const date = new Date(dateStr);
        return date >= start && date <= end;
      };

      const currentPeriodUsers = usersResult.data?.filter(u => isInRange(u.created_at, currentStart, currentEnd)).length || 0;
      const currentPeriodThreads = threadsResult.data?.filter(t => isInRange(t.created_at, currentStart, currentEnd)).length || 0;
      const currentPeriodSubs = subscriptionsResult.data?.filter(s => 
        s.subscription_status === 'active' && isInRange(s.updated_at, currentStart, currentEnd)
      ).length || 0;
      const currentPeriodEarnings = earningsResult.data?.filter(e => isInRange(e.created_at, currentStart, currentEnd))
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const previousPeriodUsers = usersResult.data?.filter(u => isInRange(u.created_at, previousStart, previousEnd)).length || 0;
      const previousPeriodThreads = threadsResult.data?.filter(t => isInRange(t.created_at, previousStart, previousEnd)).length || 0;
      const previousPeriodSubs = subscriptionsResult.data?.filter(s => 
        s.subscription_status === 'active' && isInRange(s.updated_at, previousStart, previousEnd)
      ).length || 0;
      const previousPeriodEarnings = earningsResult.data?.filter(e => isInRange(e.created_at, previousStart, previousEnd))
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const calcGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const currentPeriodMRR = currentPeriodSubs * SUBSCRIPTION_PRICE;
      const previousPeriodMRR = previousPeriodSubs * SUBSCRIPTION_PRICE;

      setPeriodComparison({
        usersGrowth: calcGrowth(currentPeriodUsers, previousPeriodUsers),
        threadsGrowth: calcGrowth(currentPeriodThreads, previousPeriodThreads),
        subscriptionsGrowth: calcGrowth(currentPeriodSubs, previousPeriodSubs),
        earningsGrowth: calcGrowth(currentPeriodEarnings, previousPeriodEarnings),
        currentPeriodUsers,
        previousPeriodUsers,
        currentPeriodThreads,
        previousPeriodThreads,
        currentPeriodSubs,
        previousPeriodSubs,
        mrrGrowth: calcGrowth(currentPeriodMRR, previousPeriodMRR),
      });

      const totalUsers = usersResult.data?.length || 0;
      const totalThreads = threadsResult.data?.length || 0;
      const activeSubscriptions = subscriptionsResult.data?.filter(
        s => s.subscription_status === 'active'
      ).length || 0;
      const totalPaidUsers = subscriptionsResult.data?.filter(
        s => s.subscription_status === 'active' || s.subscription_status === 'canceled'
      ).length || 0;
      const totalEarnings = earningsResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      const conversionRate = totalUsers > 0 ? (totalPaidUsers / totalUsers) * 100 : 0;

      const today = startOfDay(new Date());
      const newUsersToday = usersResult.data?.filter(
        u => new Date(u.created_at) >= today
      ).length || 0;
      const threadsToday = threadsResult.data?.filter(
        t => new Date(t.created_at) >= today
      ).length || 0;
      const newSubscriptionsToday = subscriptionsResult.data?.filter(
        s => s.subscription_status === 'active' && new Date(s.updated_at) >= today
      ).length || 0;

      const currentMRR = activeSubscriptions * SUBSCRIPTION_PRICE;
      const projectedARR = currentMRR * 12;

      setTotals({
        totalUsers,
        totalThreads,
        activeSubscriptions,
        totalEarnings,
        newUsersToday,
        threadsToday,
        conversionRate,
        newSubscriptionsToday,
        currentMRR,
        projectedARR,
      });

      const dateInterval = eachDayOfInterval({ start: currentStart, end: currentEnd });
      const dailyData: DailyStats[] = dateInterval.map(date => {
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

        const subscriptionsOnDay = subscriptionsResult.data?.filter(s => {
          const updated = new Date(s.updated_at);
          return s.subscription_status === 'active' && updated >= dayStart && updated <= dayEnd;
        }).length || 0;

        return {
          date: format(date, 'MMM dd'),
          users: usersOnDay,
          threads: threadsOnDay,
          subscriptions: subscriptionsOnDay,
        };
      });

      setDailyStats(dailyData);

      let cumulativeUsers = 0;
      let cumulativeSubscriptions = 0;
      const conversionTrend = dateInterval.map(date => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        cumulativeUsers += usersResult.data?.filter(u => {
          const created = new Date(u.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length || 0;

        cumulativeSubscriptions += subscriptionsResult.data?.filter(s => {
          const updated = new Date(s.updated_at);
          return s.subscription_status === 'active' && updated >= dayStart && updated <= dayEnd;
        }).length || 0;

        const rate = cumulativeUsers > 0 ? (cumulativeSubscriptions / cumulativeUsers) * 100 : 0;

        return {
          date: format(date, 'MMM dd'),
          rate: Math.round(rate * 10) / 10,
        };
      });

      setConversionData(conversionTrend);

      let runningMRR = 0;
      const revenueTrend = dateInterval.map(date => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const newSubs = subscriptionsResult.data?.filter(s => {
          const updated = new Date(s.updated_at);
          return s.subscription_status === 'active' && updated >= dayStart && updated <= dayEnd;
        }).length || 0;

        runningMRR += newSubs * SUBSCRIPTION_PRICE;

        return {
          date: format(date, 'MMM dd'),
          mrr: runningMRR,
          newRevenue: newSubs * SUBSCRIPTION_PRICE,
        };
      });

      setRevenueData(revenueTrend);

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
    }
  }, [dateRange, SUBSCRIPTION_PRICE]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      await fetchAnalyticsQuiet();
      setLoading(false);
    };
    loadAnalytics();
  }, [fetchAnalyticsQuiet]);

  // Subscribe to realtime updates for all analytics-related tables
  useEffect(() => {
    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchAnalyticsQuiet()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thread_history' },
        () => fetchAnalyticsQuiet()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_billing' },
        () => fetchAnalyticsQuiet()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'affiliate_earnings' },
        () => fetchAnalyticsQuiet()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalyticsQuiet]);

  // Listen for user deletion events (legacy support)
  useEffect(() => {
    const handleUserDeleted = () => {
      fetchAnalyticsQuiet();
    };
    
    window.addEventListener('user-deleted', handleUserDeleted);
    return () => window.removeEventListener('user-deleted', handleUserDeleted);
  }, [fetchAnalyticsQuiet]);


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

      {/* User Location Map */}
      <UserLocationMap />

      {/* Revenue Analytics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Analytics</CardTitle>
          <CardDescription>Monthly Recurring Revenue (MRR) and growth trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-3xl font-bold text-emerald-500">${totals.currentMRR.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Current MRR</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-3xl font-bold text-foreground">${totals.projectedARR.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Projected ARR</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-3xl font-bold text-foreground">{totals.activeSubscriptions}</p>
              <p className="text-sm text-muted-foreground">Active Subscribers</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <div className={`flex items-center justify-center gap-1 text-2xl font-bold ${periodComparison.mrrGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {periodComparison.mrrGrowth >= 0 ? (
                  <ArrowUpRight className="h-6 w-6" />
                ) : (
                  <ArrowDownRight className="h-6 w-6" />
                )}
                {Math.abs(periodComparison.mrrGrowth).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">MRR Growth</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
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
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`,
                    name === 'mrr' ? 'Cumulative MRR' : 'New Revenue'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="hsl(142 76% 36%)"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                  name="mrr"
                />
                <Bar 
                  dataKey="newRevenue" 
                  fill="hsl(var(--primary))" 
                  radius={[2, 2, 0, 0]}
                  name="newRevenue"
                  opacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Period Comparison</CardTitle>
          <CardDescription>
            Last {dateRange} days vs previous {dateRange} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Users Growth */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">New Users</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${periodComparison.usersGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {periodComparison.usersGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(periodComparison.usersGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{periodComparison.currentPeriodUsers}</span>
                <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriodUsers}</span>
              </div>
            </div>

            {/* Threads Growth */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">New Threads</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${periodComparison.threadsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {periodComparison.threadsGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(periodComparison.threadsGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{periodComparison.currentPeriodThreads}</span>
                <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriodThreads}</span>
              </div>
            </div>

            {/* Subscriptions Growth */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">New Subscriptions</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${periodComparison.subscriptionsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {periodComparison.subscriptionsGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(periodComparison.subscriptionsGrowth).toFixed(1)}%
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{periodComparison.currentPeriodSubs}</span>
                <span className="text-sm text-muted-foreground">vs {periodComparison.previousPeriodSubs}</span>
              </div>
            </div>

            {/* Earnings Growth */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Earnings Growth</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${periodComparison.earningsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {periodComparison.earningsGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(periodComparison.earningsGrowth).toFixed(1)}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground">vs previous period</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          <CardDescription>Signup to subscription conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-3xl font-bold text-foreground">{totals.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Signups</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-3xl font-bold text-foreground">{totals.activeSubscriptions}</p>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center border border-primary/20">
              <p className="text-3xl font-bold text-primary">{totals.conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionData}>
                <defs>
                  <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
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
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value}%`, 'Conversion Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
