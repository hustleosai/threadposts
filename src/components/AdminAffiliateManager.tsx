import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, DollarSign, Users, MousePointer, TrendingUp } from 'lucide-react';

interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  commission_rate: number | null;
  total_earnings: number | null;
  pending_balance: number | null;
  stripe_connect_onboarded: boolean | null;
  created_at: string;
}

interface AffiliateEarning {
  id: string;
  affiliate_id: string;
  amount: number;
  created_at: string;
  stripe_payment_id: string | null;
  conversion_id: string | null;
}

interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string | null;
  created_at: string;
  paid_at: string | null;
  stripe_transfer_id: string | null;
}

interface ReferralConversion {
  id: string;
  affiliate_id: string;
  referred_user_id: string | null;
  converted_at: string;
}

export default function AdminAffiliateManager() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPayout, setUpdatingPayout] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [affiliatesRes, earningsRes, payoutsRes, conversionsRes] = await Promise.all([
        supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
        supabase.from('affiliate_earnings').select('*').order('created_at', { ascending: false }),
        supabase.from('affiliate_payouts').select('*').order('created_at', { ascending: false }),
        supabase.from('referral_conversions').select('*').order('converted_at', { ascending: false }),
      ]);

      if (affiliatesRes.error) throw affiliatesRes.error;
      if (earningsRes.error) throw earningsRes.error;
      if (payoutsRes.error) throw payoutsRes.error;
      if (conversionsRes.error) throw conversionsRes.error;

      setAffiliates(affiliatesRes.data || []);
      setEarnings(earningsRes.data || []);
      setPayouts(payoutsRes.data || []);
      setConversions(conversionsRes.data || []);
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      toast({ title: 'Failed to load affiliate data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updatePayoutStatus = async (payoutId: string, newStatus: string, affiliateId: string, amount: number) => {
    setUpdatingPayout(payoutId);
    try {
      const updateData: { status: string; paid_at?: string } = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('affiliate_payouts')
        .update(updateData)
        .eq('id', payoutId);

      if (error) throw error;

      // Send email notification
      const { error: notifyError } = await supabase.functions.invoke('send-payout-notification', {
        body: {
          affiliate_id: affiliateId,
          payout_amount: amount,
          status: newStatus as 'paid' | 'denied',
        },
      });

      if (notifyError) {
        console.error('Failed to send notification:', notifyError);
        toast({ title: `Payout ${newStatus} (notification failed)` });
      } else {
        toast({ title: `Payout ${newStatus} - Email sent` });
      }

      fetchAllData();
    } catch (error) {
      console.error('Error updating payout:', error);
      toast({ title: 'Failed to update payout', variant: 'destructive' });
    } finally {
      setUpdatingPayout(null);
    }
  };

  const getAffiliateCode = (affiliateId: string) => {
    const affiliate = affiliates.find(a => a.id === affiliateId);
    return affiliate?.referral_code || 'Unknown';
  };

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalPendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalPaidOut = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Affiliates</p>
                <p className="text-xl font-bold">{affiliates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Payouts</p>
                <p className="text-xl font-bold">${totalPendingPayouts.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MousePointer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversions</p>
                <p className="text-xl font-bold">{conversions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payouts" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
          <TabsTrigger value="earnings">All Earnings</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        {/* Payout Requests Tab */}
        <TabsContent value="payouts">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
              <CardDescription>Approve or deny affiliate payout requests</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payout requests</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Paid At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-mono">{getAffiliateCode(payout.affiliate_id)}</TableCell>
                        <TableCell className="font-medium">${payout.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              payout.status === 'paid' ? 'default' : 
                              payout.status === 'denied' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {payout.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {payout.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updatePayoutStatus(payout.id, 'paid', payout.affiliate_id, payout.amount)}
                                disabled={updatingPayout === payout.id}
                              >
                                {updatingPayout === payout.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updatePayoutStatus(payout.id, 'denied', payout.affiliate_id, payout.amount)}
                                disabled={updatingPayout === payout.id}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Earnings Tab */}
        <TabsContent value="earnings">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>All Earnings</CardTitle>
              <CardDescription>Complete history of affiliate commissions</CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No earnings recorded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Stripe Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((earning) => (
                      <TableRow key={earning.id}>
                        <TableCell className="font-mono">{getAffiliateCode(earning.affiliate_id)}</TableCell>
                        <TableCell className="font-medium text-green-500">${earning.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(earning.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {earning.stripe_payment_id || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>All Affiliates</CardTitle>
              <CardDescription>Registered affiliate accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {affiliates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No affiliates registered</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Pending Balance</TableHead>
                      <TableHead>Stripe Connected</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell className="font-mono font-medium">{affiliate.referral_code}</TableCell>
                        <TableCell>{(affiliate.commission_rate || 50)}%</TableCell>
                        <TableCell className="text-green-500">${(affiliate.total_earnings || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-yellow-500">${(affiliate.pending_balance || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={affiliate.stripe_connect_onboarded ? 'default' : 'secondary'}>
                            {affiliate.stripe_connect_onboarded ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(affiliate.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Conversions</CardTitle>
              <CardDescription>Successful referral sign-ups</CardDescription>
            </CardHeader>
            <CardContent>
              {conversions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No conversions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate Code</TableHead>
                      <TableHead>Referred User ID</TableHead>
                      <TableHead>Converted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions.map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell className="font-mono">{getAffiliateCode(conversion.affiliate_id)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {conversion.referred_user_id || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(conversion.converted_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
