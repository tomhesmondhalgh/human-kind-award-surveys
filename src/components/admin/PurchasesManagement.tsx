
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
      // Note: Using `.from('payment_history').select('*')` without a filter will return all records
      // If there's a Row Level Security policy on this table, we need to use a service role or RPC
      const { data: payments, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscription:subscriptions (
            id,
            plan_type,
            purchase_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Total Payment Records:', payments?.length);

      // For each payment, if subscription data is missing, attempt to fetch it directly
      const enhancedPayments = await Promise.all(payments.map(async (payment) => {
        if (payment.subscription) {
          return {
            ...payment,
            plan_type: payment.subscription.plan_type,
            purchase_type: payment.subscription.purchase_type
          };
        }
        
        // If subscription reference is missing but we have the subscription_id, try to fetch it directly
        if (payment.subscription_id) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('plan_type, purchase_type')
            .eq('id', payment.subscription_id)
            .maybeSingle();
            
          if (subData) {
            return {
              ...payment,
              plan_type: subData.plan_type,
              purchase_type: subData.purchase_type
            };
          }
        }
        
        // Fall back to intelligent defaults based on payment method
        return {
          ...payment,
          plan_type: payment.payment_method === 'stripe' ? 'foundation' : 'unknown',
          purchase_type: payment.payment_method === 'stripe' ? 'subscription' : 'unknown'
        };
      }));

      setPurchases(enhancedPayments);
      console.log('Enhanced Payment Records:', enhancedPayments.length);
    } catch (error) {
      console.error('Error fetching purchases:', error);
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
