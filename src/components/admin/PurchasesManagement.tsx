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
      console.log('Fetching purchases data using admin_get_all_payments RPC function...');
      
      // Using the admin_get_all_payments RPC function to fetch all payment records
      // This function now has fixed the column ambiguity by specifying table aliases
      const { data: payments, error } = await supabase
        .rpc('admin_get_all_payments');

      if (error) {
        console.error('Error fetching purchases:', error);
        throw error;
      }

      console.log('Total Payment Records:', payments?.length || 0);
      console.log('First payment record:', payments?.[0] || 'No records found');

      if (!payments || payments.length === 0) {
        console.log('No payment records found or empty array returned');
        setPurchases([]);
        setLoading(false);
        return;
      }

      // Convert to Purchase type (the RPC already includes plan_type and purchase_type)
      const enhancedPayments = payments.map(payment => ({
        ...payment,
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
        plan_type: payment.plan_type || 'unknown',
        purchase_type: payment.purchase_type || 'unknown'
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
