import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  ExternalLink,
  BarChart3,
  Image,
  Mail,
  FileText
} from 'lucide-react';

interface AffiliateData {
  id: string;
  referral_code: string;
  commission_rate: number;
  min_payout_threshold: number;
  total_earnings: number;
  pending_balance: number;
  stripe_connect_onboarded: boolean;
}

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

export default function Affiliate() {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [stats, setStats] = useState<AffiliateStats>({ totalClicks: 0, totalConversions: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliateData();
  }, [user]);

  const fetchAffiliateData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Check if user is already an affiliate
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
    }
    
    setLoading(false);
  };

  const becomeAffiliate = async () => {
    if (!user) return;
    
    // Generate referral code
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
    }
  };

  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const referralLink = affiliate ? `${window.location.origin}?ref=${affiliate.referral_code}` : '';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
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
              Share this link to earn {affiliate.commission_rate}% on every subscription.
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
                    <p className="text-lg font-bold text-primary-foreground">ThreadMaster</p>
                    <p className="text-sm text-primary-foreground/80">Generate Viral Threads in Seconds</p>
                    <p className="text-xs mt-2 text-primary-foreground/60">300x250</p>
                  </div>
                  <div className="bg-gradient-to-r from-primary to-purple-500 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary-foreground">ThreadMaster</p>
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
                    I've been using ThreadMaster to generate engaging content for Twitter, LinkedIn, and more.
                    <br /><br />
                    Try it free: {referralLink}
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                    navigator.clipboard.writeText(`🧵 Want to create viral threads in seconds?\n\nI've been using ThreadMaster to generate engaging content for Twitter, LinkedIn, and more.\n\nTry it free: ${referralLink}`);
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
                    ThreadMaster uses AI to generate viral threads in seconds. It's helped me grow my audience significantly.
                    <br /><br />
                    Check it out: {referralLink}
                    <br /><br />
                    Best,<br />
                    [Your Name]
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                    navigator.clipboard.writeText(`Subject: The tool that changed my content game\n\nHey [Name],\n\nI wanted to share something that's been a game-changer for my social media content.\n\nThreadMaster uses AI to generate viral threads in seconds. It's helped me grow my audience significantly.\n\nCheck it out: ${referralLink}\n\nBest,\n[Your Name]`);
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
              Payouts are processed automatically when your balance reaches ${affiliate.min_payout_threshold}. 
              {!affiliate.stripe_connect_onboarded && (
                <span className="text-warning"> Connect your Stripe account to receive payouts.</span>
              )}
            </p>
            {!affiliate.stripe_connect_onboarded && (
              <Button className="gradient-primary">
                Connect Stripe Account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
