import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import AffiliateLeaderboard from '@/components/AffiliateLeaderboard';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  ExternalLink,
  BarChart3,
  Image,
  Mail,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
  History,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface AffiliateData {
  id: string;
  referral_code: string;
  commission_rate: number;
  min_payout_threshold: number;
  total_earnings: number;
  pending_balance: number;
  stripe_connect_onboarded: boolean;
  stripe_connect_id: string | null;
}

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

interface ConnectStatus {
  onboarded: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

interface Earning {
  id: string;
  amount: number;
  created_at: string;
}

interface Deduction {
  id: string;
  amount: number;
  reason: string;
  customer_email: string | null;
  created_at: string;
}

export default function Affiliate() {
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [stats, setStats] = useState<AffiliateStats>({ totalClicks: 0, totalConversions: 0, conversionRate: 0 });
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    fetchAffiliateData();
  }, [user]);

  useEffect(() => {
    // Check for Stripe Connect return
    const stripeStatus = searchParams.get('stripe');
    if (stripeStatus === 'success') {
      toast.success('Stripe Connect setup completed!');
      checkConnectStatus();
    } else if (stripeStatus === 'refresh') {
      toast.info('Please complete Stripe Connect setup');
      handleConnectStripe();
    }
  }, [searchParams]);

  const fetchAffiliateData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { data: affiliateData, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (affiliateData) {
      setAffiliate(affiliateData);
      
      // Fetch stats
      const { count: clicks } = await supabase
        .from('referral_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateData.id);
      
      const { count: conversions } = await supabase
        .from('referral_conversions')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateData.id);
      
      const totalClicks = clicks || 0;
      const totalConversions = conversions || 0;
      
      setStats({
        totalClicks,
        totalConversions,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
      });

      // Fetch earnings history
      const { data: earningsData } = await supabase
        .from('affiliate_earnings')
        .select('id, amount, created_at')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setEarnings(earningsData || []);

      // Fetch deductions history
      const { data: deductionsData } = await supabase
        .from('affiliate_deductions')
        .select('id, amount, reason, customer_email, created_at')
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setDeductions(deductionsData || []);

      // Check connect status if they have a Stripe Connect ID
      if (affiliateData.stripe_connect_id) {
        checkConnectStatus();
      }
    }
    
    setLoading(false);
  };

  const checkConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!error && data) {
        setConnectStatus(data);
        // Refresh affiliate data if status changed
        if (data.onboarded && affiliate && !affiliate.stripe_connect_onboarded) {
          fetchAffiliateData();
        }
      }
    } catch (err) {
      console.error('Error checking connect status:', err);
    }
  };

  const becomeAffiliate = async () => {
    if (!user) return;
    
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        referral_code: code,
        commission_rate: 50,
        min_payout_threshold: 25,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to create affiliate account');
    } else {
      setAffiliate(data);
      toast.success('Welcome to the affiliate program!');
      
      // Send welcome email
      supabase.functions.invoke('send-affiliate-welcome', {
        body: { referral_code: code },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      }).catch((err) => console.error('Failed to send welcome email:', err));
    }
  };

  const handleConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error starting Stripe Connect:', err);
      toast.error('Failed to start Stripe Connect setup');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    setPayoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-payout', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Payout of $${data.amount.toFixed(2)} initiated!`);
        fetchAffiliateData();
      } else {
        throw new Error(data?.error || 'Payout failed');
      }
    } catch (err: any) {
      console.error('Error requesting payout:', err);
      toast.error(err.message || 'Failed to request payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const referralLink = affiliate ? `${window.location.origin}?ref=${affiliate.referral_code}` : '';
  const canRequestPayout = affiliate && 
    affiliate.stripe_connect_onboarded && 
    Number(affiliate.pending_balance) >= Number(affiliate.min_payout_threshold);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!affiliate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <Users className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h1 className="text-3xl font-display font-bold mb-4">Join Our Affiliate Program</h1>
          <p className="text-muted-foreground mb-8">
            Earn 50% commission on every sale you refer. Get paid automatically via Stripe when you reach $25.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-primary">50%</p>
                <p className="text-sm text-muted-foreground">Commission</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-primary">$25</p>
                <p className="text-sm text-muted-foreground">Min Payout</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-primary">Lifetime</p>
                <p className="text-sm text-muted-foreground">Attribution</p>
              </CardContent>
            </Card>
          </div>
          <Button onClick={becomeAffiliate} className="gradient-primary" size="lg">
            Become an Affiliate
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Track your referrals and earnings</p>
        </div>

        {/* Stripe Connect Status Banner */}
        {!affiliate.stripe_connect_onboarded && (
          <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/30">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-semibold">Complete Stripe Setup</h3>
                  <p className="text-sm text-muted-foreground">Connect your Stripe account to receive payouts</p>
                </div>
              </div>
              <Button 
                onClick={handleConnectStripe}
                disabled={connectLoading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {connectLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Connect Stripe
              </Button>
            </CardContent>
          </Card>
        )}

        {affiliate.stripe_connect_onboarded && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-500">Stripe Connected</h3>
                  <p className="text-sm text-muted-foreground">You're all set to receive payouts</p>
                </div>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-500">
                Active
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">{stats.totalClicks}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-2xl font-bold">{stats.totalConversions}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Balance</p>
                  <p className="text-2xl font-bold">${Number(affiliate.pending_balance).toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <AffiliateLeaderboard 
          currentAffiliateId={affiliate.id} 
          currentReferralCode={affiliate.referral_code} 
        />

        {/* Referral Link */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="font-mono text-sm" />
              <Button onClick={copyReferralLink} variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link to earn {affiliate.commission_rate}% (${(5 * 0.5).toFixed(2)}) on every subscription.
            </p>
          </CardContent>
        </Card>

        {/* Marketing Tools */}
        <Tabs defaultValue="banners" className="space-y-4">
          <TabsList>
            <TabsTrigger value="banners">
              <Image className="h-4 w-4 mr-2" />
              Banners
            </TabsTrigger>
            <TabsTrigger value="social">
              <FileText className="h-4 w-4 mr-2" />
              Social Posts
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Templates
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="banners">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-primary to-purple-500 p-6 rounded-lg text-center">
                    <p className="text-lg font-bold text-primary-foreground">ThreadPosts</p>
                    <p className="text-sm text-primary-foreground/80">Generate Viral Threads in Seconds</p>
                    <p className="text-xs mt-2 text-primary-foreground/60">300x250</p>
                  </div>
                  <div className="bg-gradient-to-r from-primary to-purple-500 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary-foreground">ThreadPosts</p>
                      <p className="text-xs text-primary-foreground/80">Try Free</p>
                    </div>
                    <Button size="sm" variant="secondary">Start</Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Right-click to save banners or contact support for custom sizes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="social">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="text-sm">
                    🧵 Want to create viral threads in seconds?
                    <br /><br />
                    I've been using ThreadPosts to generate engaging content for Twitter, LinkedIn, and more.
                    <br /><br />
                    Try it free: {referralLink}
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                    navigator.clipboard.writeText(`🧵 Want to create viral threads in seconds?\n\nI've been using ThreadPosts to generate engaging content for Twitter, LinkedIn, and more.\n\nTry it free: ${referralLink}`);
                    toast.success('Copied!');
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="email">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Subject: The tool that changed my content game</p>
                  <p className="text-sm text-muted-foreground">
                    Hey [Name],
                    <br /><br />
                    I wanted to share something that's been a game-changer for my social media content.
                    <br /><br />
                    ThreadPosts uses AI to generate viral threads in seconds. It's helped me grow my audience significantly.
                    <br /><br />
                    Check it out: {referralLink}
                    <br /><br />
                    Best,<br />
                    [Your Name]
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                    navigator.clipboard.writeText(`Subject: The tool that changed my content game\n\nHey [Name],\n\nI wanted to share something that's been a game-changer for my social media content.\n\nThreadPosts uses AI to generate viral threads in seconds. It's helped me grow my audience significantly.\n\nCheck it out: ${referralLink}\n\nBest,\n[Your Name]`);
                    toast.success('Copied!');
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transaction History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 && deductions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {/* Combine and sort earnings and deductions */}
                {[
                  ...earnings.map(e => ({ ...e, type: 'earning' as const })),
                  ...deductions.map(d => ({ ...d, type: 'deduction' as const }))
                ]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 20)
                  .map((item) => (
                    <div 
                      key={`${item.type}-${item.id}`}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.type === 'deduction' 
                          ? 'bg-destructive/10 border-destructive/30' 
                          : 'bg-green-500/10 border-green-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === 'deduction' ? (
                          <MinusCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <PlusCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {item.type === 'deduction' 
                              ? (item as Deduction).reason
                              : 'Commission earned'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                            {item.type === 'deduction' && (item as Deduction).customer_email && (
                              <span> • {(item as Deduction).customer_email}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <p className={`font-bold ${
                        item.type === 'deduction' ? 'text-destructive' : 'text-green-500'
                      }`}>
                        {item.type === 'deduction' ? '-' : '+'}${Number(item.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Payout Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="font-semibold">Total Earnings</p>
                <p className="text-2xl font-bold text-primary">${Number(affiliate.total_earnings).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Pending Balance</p>
                <p className="text-2xl font-bold">${Number(affiliate.pending_balance).toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Minimum payout threshold: ${affiliate.min_payout_threshold}. 
              {!affiliate.stripe_connect_onboarded && (
                <span className="text-orange-500"> Connect your Stripe account to receive payouts.</span>
              )}
            </p>
            <div className="flex gap-2">
              {!affiliate.stripe_connect_onboarded ? (
                <Button onClick={handleConnectStripe} disabled={connectLoading} className="gradient-primary">
                  {connectLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  Connect Stripe Account
                </Button>
              ) : (
                <Button 
                  onClick={handleRequestPayout} 
                  disabled={payoutLoading || !canRequestPayout}
                  className="gradient-primary"
                >
                  {payoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  Request Payout
                </Button>
              )}
            </div>
            {affiliate.stripe_connect_onboarded && !canRequestPayout && Number(affiliate.pending_balance) > 0 && (
              <p className="text-sm text-muted-foreground">
                You need ${(Number(affiliate.min_payout_threshold) - Number(affiliate.pending_balance)).toFixed(2)} more to reach the minimum payout threshold.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
