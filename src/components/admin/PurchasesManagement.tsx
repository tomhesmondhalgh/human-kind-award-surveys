
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
import { Pencil, CreditCard, FileText, Search, AlertCircle } from "lucide-react";
import { UpdateInvoiceDialog } from './UpdateInvoiceDialog';
import { formatCurrency } from '../../lib/utils';
import Pagination from '../surveys/Pagination';
import { useAdminRole } from '../../hooks/useAdminRole';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

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
  const [error, setError] = useState<string | null>(null);
  const recordsPerPage = 10;
  const { isAdmin, isLoading: adminCheckLoading } = useAdminRole();

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching ALL purchases data as admin...');
      console.log('Current user admin status:', isAdmin);
      
      // First, try RPC function for admin payments
      const { data: functionData, error: functionError } = await supabase
        .rpc('admin_get_all_payments');
      
      if (functionError) {
        console.error('Error with admin_get_all_payments function:', functionError);
        setError(`Database function error: ${functionError.message}`);
        
        // If the function error is related to permissions, show a specific message
        if (functionError.message.includes('permission denied') || 
            functionError.message.includes('not authorized')) {
          setError('You do not have permission to access payment data. Please check your admin status.');
        }
      }
      
      if (functionData && functionData.length > 0) {
        console.log('Successfully retrieved payments via RPC function, count:', functionData.length);
        console.log('First payment details:', functionData[0]);
        setPurchases(functionData);
        setLoading(false);
        return;
      } else {
        console.log('RPC function returned no data');
        if (!functionError) {
          setError('The payment retrieval function returned no results. This might indicate a permission issue or empty payment records.');
        }
      }
      
      console.log('RPC approach failed or returned no data, trying comprehensive direct query...');
      
      // Comprehensive direct query across tables
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscriptions (
            plan_type,
            purchase_type
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentError) {
        console.error('Error fetching comprehensive payment data:', paymentError);
        setError(`Direct query error: ${paymentError.message}`);
        throw paymentError;
      }

      console.log('Total payments retrieved from direct query:', paymentData?.length || 0);
      if (paymentData && paymentData.length > 0) {
        console.log('First payment in direct query:', paymentData[0]);
      } else {
        console.log('Direct query returned no data');
        if (!error) {
          setError('No payment records were found in the database.');
        }
      }

      // Enhanced mapping of payment data
      const enhancedPayments = paymentData.map(payment => ({
        ...payment,
        plan_type: payment.subscriptions?.plan_type || 'unknown',
        purchase_type: payment.subscriptions?.purchase_type || 'unknown'
      }));

      setPurchases(enhancedPayments);
    } catch (error) {
      console.error('Critical error in fetchPurchases:', error);
      if (!error) {
        setError(`Failed to load ALL purchases data: ${error.message}`);
      }
      toast.error('Failed to load ALL purchases data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminCheckLoading) {
      fetchPurchases();
    }
  }, [adminCheckLoading]);

  // Refresh when admin status is confirmed
  useEffect(() => {
    if (isAdmin && !adminCheckLoading) {
      fetchPurchases();
    }
  }, [isAdmin, adminCheckLoading]);

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

  // Function to refresh data
  const handleRefresh = () => {
    fetchPurchases();
    toast.info('Refreshing purchase data...');
  };

  if (adminCheckLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchases Management</CardTitle>
          <CardDescription>Checking admin permissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Verifying admin status...</div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchases Management</CardTitle>
          <CardDescription>Admin access required</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have admin privileges to view purchase data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchases Management</CardTitle>
        <CardDescription>
          View and manage all purchases including credit card payments and invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 flex justify-between items-center">
          <div className="relative flex-grow mr-2">
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
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading purchases data...</div>
        ) : (
          <>
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
