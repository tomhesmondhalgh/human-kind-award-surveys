
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Badge } from "../ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { CreditCard, FileText, AlertCircle, ListTodo } from "lucide-react";
import { formatCurrency } from '../../lib/utils';
import PageTitle from '../ui/PageTitle';
import { useSubscription } from '../../hooks/useSubscription';

export type Purchase = {
  id: string;
  subscription_id: string;
  payment_method: 'stripe' | 'invoice' | 'manual';
  amount: number;
  currency: string;
  payment_status: 'pending' | 'invoice_raised' | 'payment_made' | 'cancelled' | 'refunded';
  invoice_number?: string;
  billing_school_name?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_address?: string;
  created_at: string;
  plan_type: string;
  purchase_type: string;
};

export type Subscription = {
  id: string;
  plan_type: string;
  status: 'active' | 'canceled' | 'expired' | 'pending';
  start_date: string;
  end_date: string;
  purchase_type: string;
};

const MyPurchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const { user } = useAuth();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();

  const fetchPurchases = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subError) {
        throw subError;
      }

      const active = subscriptions?.find(sub => 
        sub.status === 'active' && 
        sub.purchase_type === 'subscription' &&
        (sub.end_date === null || new Date(sub.end_date) > new Date())
      );
      
      if (active) {
        setActiveSubscription({
          id: active.id,
          plan_type: active.plan_type,
          status: active.status,
          start_date: active.start_date || active.created_at,
          end_date: active.end_date || '',
          purchase_type: active.purchase_type
        });
      }

      if (!subscriptions || subscriptions.length === 0) {
        setPurchases([]);
        setLoading(false);
        return;
      }

      const subscriptionIds = subscriptions.map(sub => sub.id);

      const { data: payments, error: paymentError } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscription:subscriptions (
            id,
            plan_type,
            purchase_type
          )
        `)
        .in('subscription_id', subscriptionIds)
        .order('created_at', { ascending: false });

      if (paymentError) {
        throw paymentError;
      }

      const formattedPurchases = payments.map(item => ({
        ...item,
        plan_type: item.subscription?.plan_type || 'unknown',
        purchase_type: item.subscription?.purchase_type || 'unknown'
      }));

      setPurchases(formattedPurchases);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchases data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const handleCancelSubscription = async () => {
    if (!user || !activeSubscription) return;
    
    setCancellingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: activeSubscription.id,
          userId: user.id
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Your subscription has been scheduled to cancel at the end of the current billing period');
      fetchPurchases();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_made':
        return <Badge className="bg-green-500">Payment Made</Badge>;
      case 'invoice_raised':
        return <Badge className="bg-blue-500">Invoice Raised</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-500">Refunded</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="h-4 w-4 mr-1" />;
      case 'invoice':
        return <FileText className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatPlanName = (planType: string | undefined) => {
    if (!planType) return 'Free';
    return planType.charAt(0).toUpperCase() + planType.slice(1);
  };

  const formatRoleName = (role: string | null) => {
    if (!role) return 'No Role';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="container py-8">
      <PageTitle title="My Purchases" subtitle="View your purchases including credit card payments and invoices" />
      
      {activeSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Subscription</CardTitle>
            <CardDescription>
              Your current subscription details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg font-medium capitalize">{activeSubscription.plan_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-medium">{formatDate(activeSubscription.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renewal Date</p>
                  <p className="text-lg font-medium">
                    {activeSubscription.end_date ? formatDate(activeSubscription.end_date) : 'Ongoing'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="destructive" 
                  onClick={handleCancelSubscription}
                  disabled={cancellingSubscription}
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel at Next Renewal'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            All your purchases including credit card payments and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading purchases data...</div>
          ) : (
            <div className="overflow-x-auto">
              {purchases.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-lg text-muted-foreground">No purchases found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>School/Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {formatDate(purchase.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{purchase.billing_school_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">
                            {purchase.billing_contact_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="capitalize font-medium">{purchase.plan_type}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {purchase.purchase_type}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Use the improved formatCurrency function with automatic detection */}
                          {formatCurrency(purchase.amount, purchase.currency, purchase.amount > 10000)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getPaymentMethodIcon(purchase.payment_method)}
                            <span className="capitalize">{purchase.payment_method}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {purchase.invoice_number || '—'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.payment_status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your current plan details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubscriptionLoading ? (
            <div className="text-center py-4">Loading account information...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-lg">Subscription Plan</h3>
                </div>
                <div className="pl-7">
                  <span className="text-xl font-semibold capitalize">
                    {subscription?.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : 'Free'}
                  </span>
                  <Badge className={`ml-2 ${subscription?.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                    {subscription?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPurchases;
