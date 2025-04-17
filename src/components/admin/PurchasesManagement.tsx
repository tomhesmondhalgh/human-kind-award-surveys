
import React, { useState } from 'react';
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { CreditCard, FileText, Search, AlertCircle } from "lucide-react";
import { UpdateInvoiceDialog } from './UpdateInvoiceDialog';
import Pagination from '../surveys/Pagination';
import { useAdminRole } from '../../hooks/useAdminRole';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { PurchasesTable } from './PurchasesTable';
import { usePurchases } from '../../hooks/usePurchases';

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
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const { isAdmin, isLoading: adminCheckLoading } = useAdminRole();
  const { purchases, loading, error, fetchPurchases } = usePurchases(isAdmin && !adminCheckLoading);

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

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

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
              <PurchasesTable
                purchases={currentRecords}
                onUpdateInvoice={handleUpdateInvoice}
                getStatusBadge={getStatusBadge}
                getPaymentMethodIcon={getPaymentMethodIcon}
              />
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
