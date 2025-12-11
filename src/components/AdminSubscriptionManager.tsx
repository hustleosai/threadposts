import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, 
  Search, 
  RefreshCw,
  XCircle,
  RotateCcw,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Subscription {
  id: string;
  status: string;
  customerEmail: string | null;
  customerId: string;
  currentPeriodEnd: string;
  currentPeriodStart: string;
  cancelAtPeriodEnd: boolean;
  created: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  created: string;
  refunded: boolean;
}

export default function AdminSubscriptionManager() {
  const { session } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; subscription: Subscription | null; immediate: boolean }>({
    open: false,
    subscription: null,
    immediate: false,
  });
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; subscription: Subscription | null; payments: Payment[]; loading: boolean }>({
    open: false,
    subscription: null,
    payments: [],
    loading: false,
  });
  const [refundLoading, setRefundLoading] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { action: 'list' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCancelSubscription = async (subscriptionId: string, immediate: boolean) => {
    setActionLoading(subscriptionId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { 
          action: immediate ? 'cancelImmediately' : 'cancel',
          subscriptionId 
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast.success(data.message);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setActionLoading(null);
      setCancelDialog({ open: false, subscription: null, immediate: false });
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    setActionLoading(subscriptionId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { action: 'reactivate', subscriptionId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast.success(data.message);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error('Failed to reactivate subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const openRefundDialog = async (subscription: Subscription) => {
    setRefundDialog({ open: true, subscription, payments: [], loading: true });
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { action: 'getPayments', subscriptionId: subscription.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setRefundDialog(prev => ({ ...prev, payments: data.payments || [], loading: false }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
      setRefundDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRefund = async (paymentIntentId: string) => {
    setRefundLoading(paymentIntentId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { action: 'refund', paymentIntentId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast.success(data.message);
      // Refresh payments list
      if (refundDialog.subscription) {
        openRefundDialog(refundDialog.subscription);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    } finally {
      setRefundLoading(null);
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="outline" className="text-orange-500 border-orange-500">Canceling</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Trialing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>View and manage all user subscriptions</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or subscription ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {sub.customerEmail || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(sub.created).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelDialog({ open: true, subscription: sub, immediate: false })}
                            disabled={actionLoading === sub.id}
                            className="text-orange-500 hover:text-orange-600"
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRefundDialog(sub)}
                            disabled={actionLoading === sub.id}
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Refund
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelDialog({ open: true, subscription: sub, immediate: true })}
                            disabled={actionLoading === sub.id}
                            className="text-destructive hover:text-destructive"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Cancel Now
                          </Button>
                        </>
                      )}
                      {sub.cancelAtPeriodEnd && sub.status === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRefundDialog(sub)}
                            disabled={actionLoading === sub.id}
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Refund
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivateSubscription(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="text-green-500 hover:text-green-600"
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reactivate
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {subscriptions.length === 0 ? 'No subscriptions found' : 'No matching subscriptions'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelDialog.immediate ? 'Cancel Subscription Immediately?' : 'Cancel Subscription?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog.immediate ? (
                <>
                  This will <strong>immediately cancel</strong> the subscription for {cancelDialog.subscription?.customerEmail}. 
                  The user will lose access right away. This action cannot be undone.
                </>
              ) : (
                <>
                  This will cancel the subscription for {cancelDialog.subscription?.customerEmail} at the end of their 
                  billing period ({cancelDialog.subscription ? new Date(cancelDialog.subscription.currentPeriodEnd).toLocaleDateString() : ''}).
                  They will retain access until then.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialog.subscription && handleCancelSubscription(cancelDialog.subscription.id, cancelDialog.immediate)}
              className={cancelDialog.immediate ? 'bg-destructive hover:bg-destructive/90' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {cancelDialog.immediate ? 'Cancel Immediately' : 'Cancel at Period End'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Select a payment to refund for {refundDialog.subscription?.customerEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {refundDialog.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : refundDialog.payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No payments found for this subscription</p>
            ) : (
              <div className="space-y-3">
                {refundDialog.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="font-medium">
                        ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.created).toLocaleDateString()}
                      </p>
                    </div>
                    {payment.refunded ? (
                      <Badge variant="outline" className="text-muted-foreground">Refunded</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRefund(payment.id)}
                        disabled={refundLoading === payment.id}
                      >
                        {refundLoading === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Refund'
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(prev => ({ ...prev, open: false }))}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}