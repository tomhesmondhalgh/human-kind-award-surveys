
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Input } from "../ui/input";
import { Pencil, CreditCard, FileText, Search } from "lucide-react";
import { UpdateInvoiceDialog } from './UpdateInvoiceDialog';
import { formatCurrency } from '../../lib/utils';
import Pagination from '../surveys/Pagination';

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

const PurchasesManagement = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      console.log('Fetching all purchases data as admin...');
      
      // Approach 1: Try using the admin_get_all_payments function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('admin_get_all_payments');
      
      if (functionError) {
        console.error('Error with admin_get_all_payments function:', functionError);
        // Don't throw error yet, try backup approach
      }
      
      if (functionData && functionData.length > 0) {
        console.log('Successfully retrieved payments via RPC function, count:', functionData.length);
        setPurchases(functionData);
        setLoading(false);
        return;
      }
      
      console.log('RPC approach failed or returned no data, trying direct query approach...');
      
      // Approach 2: Direct query as a backup
      // First, fetch the payment history
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentError) {
        console.error('Error fetching payment history:', paymentError);
        toast.error('Failed to load purchases data');
        setLoading(false);
        return;
      }

      console.log('Payment history records found:', paymentData?.length || 0);
      
      if (!paymentData || paymentData.length === 0) {
        console.log('No payment records found');
        setPurchases([]);
        setLoading(false);
        return;
      }

      // Next, fetch subscription data for all the payments
      const subscriptionIds = paymentData
        .map(payment => payment.subscription_id)
        .filter(Boolean); // Remove any nulls
      
      console.log('Fetching subscriptions for IDs:', subscriptionIds);
      
      // If there are no subscription IDs, we can skip this step
      let subscriptionData: any[] = [];
      if (subscriptionIds.length > 0) {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('id, plan_type, purchase_type')
          .in('id', subscriptionIds);

        if (subError) {
          console.error('Error fetching subscriptions:', subError);
          // Continue anyway, we'll just have missing data
        } else {
          subscriptionData = subData || [];
          console.log('Subscription records found:', subscriptionData.length);
        }
      }

      // Create a map for quick lookup
      const subscriptionMap = new Map();
      subscriptionData.forEach(sub => {
        subscriptionMap.set(sub.id, {
          plan_type: sub.plan_type,
          purchase_type: sub.purchase_type
        });
      });

      // Combine the data
      const enhancedPayments = paymentData.map(payment => {
        const subInfo = subscriptionMap.get(payment.subscription_id) || {};
        
        return {
          id: payment.id,
          subscription_id: payment.subscription_id,
          payment_method: payment.payment_method,
          amount: payment.amount,
          currency: payment.currency || 'GBP',
          payment_status: payment.payment_status || 'pending',
          invoice_number: payment.invoice_number,
          billing_school_name: payment.billing_school_name,
          billing_contact_name: payment.billing_contact_name,
          billing_contact_email: payment.billing_contact_email,
          billing_address: payment.billing_address,
          created_at: payment.created_at,
          plan_type: subInfo.plan_type || 'unknown',
          purchase_type: subInfo.purchase_type || 'unknown'
        };
      });

      setPurchases(enhancedPayments);
      console.log('Enhanced Payment Records:', enhancedPayments.length);
    } catch (error) {
      console.error('Error in fetchPurchases:', error);
      toast.error('Failed to load purchases data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleUpdateInvoice = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setUpdateDialogOpen(true);
  };

  const handleInvoiceUpdated = () => {
    setUpdateDialogOpen(false);
    setSelectedPurchase(null);
    fetchPurchases();
    toast.success('Payment record updated successfully');
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

  const filteredPurchases = purchases.filter(purchase => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (purchase.billing_school_name || '').toLowerCase().includes(searchLower) ||
      (purchase.billing_contact_name || '').toLowerCase().includes(searchLower) ||
      (purchase.billing_contact_email || '').toLowerCase().includes(searchLower) ||
      (purchase.invoice_number || '').toLowerCase().includes(searchLower) ||
      purchase.plan_type.toLowerCase().includes(searchLower) ||
      purchase.payment_method.toLowerCase().includes(searchLower) ||
      purchase.payment_status.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredPurchases.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredPurchases.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchases Management</CardTitle>
        <CardDescription>
          View and manage all purchases including credit card payments and invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading purchases data...</div>
        ) : (
          <>
            <div className="mb-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school, contact, invoice number, plan, or status..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        {searchQuery ? 'No purchases match your search criteria' : 'No purchases found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentRecords.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {new Date(purchase.created_at).toLocaleDateString('en-GB')}
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
                        <TableCell>{formatCurrency(purchase.amount, purchase.currency)}</TableCell>
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
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUpdateInvoice(purchase)}
                            className="flex items-center"
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredPurchases.length > recordsPerPage && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>

      {selectedPurchase && (
        <UpdateInvoiceDialog
          open={updateDialogOpen}
          onClose={() => setUpdateDialogOpen(false)}
          purchase={selectedPurchase}
          onUpdated={handleInvoiceUpdated}
        />
      )}
    </Card>
  );
};

export default PurchasesManagement;
