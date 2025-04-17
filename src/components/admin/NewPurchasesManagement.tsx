
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AlertCircle, Search, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useAdminPurchaseRecords, PurchaseRecord } from '../../hooks/useAdminPurchaseRecords';
import { NewPurchasesTable } from './NewPurchasesTable';
import { NewUpdatePurchaseDialog } from './NewUpdatePurchaseDialog';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "../ui/pagination";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const NewPurchasesManagement = () => {
  // States for managing purchases data
  const { 
    purchases, 
    loading, 
    error, 
    isAdmin, 
    adminCheckComplete, 
    refreshPurchases,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize
  } = useAdminPurchaseRecords();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseRecord[]>([]);

  // State for update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filter purchases based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPurchases(purchases);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = purchases.filter(purchase => {
      return (
        (purchase.billing_school_name || '').toLowerCase().includes(query) ||
        (purchase.billing_contact_name || '').toLowerCase().includes(query) ||
        (purchase.billing_contact_email || '').toLowerCase().includes(query) ||
        (purchase.invoice_number || '').toLowerCase().includes(query) ||
        purchase.plan_type.toLowerCase().includes(query) ||
        purchase.payment_method.toLowerCase().includes(query) ||
        purchase.payment_status.toLowerCase().includes(query)
      );
    });
    
    setFilteredPurchases(filtered);
  }, [purchases, searchQuery]);

  // Handler for opening the update dialog
  const handleUpdatePurchase = (purchase: PurchaseRecord) => {
    setSelectedPurchase(purchase);
    setUpdateDialogOpen(true);
  };

  // Handler for after a purchase is updated
  const handlePurchaseUpdated = () => {
    setUpdateDialogOpen(false);
    setSelectedPurchase(null);
    refreshPurchases();
    toast.success('Purchase record updated successfully');
  };

  // Handler for changing page
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  // Handler for refreshing data
  const handleRefresh = () => {
    refreshPurchases();
    toast.info('Refreshing purchase data...');
  };

  // Handler for changing page size
  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    setPageSize(newSize);
    setCurrentPage(1);  // Reset to first page when changing page size
  };

  // Render pagination UI
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      pages.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => handlePageChange(1)}>
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      if (startPage > 2) {
        pages.push(
          <PaginationItem key="ellipsis-start">
            <span className="flex h-9 w-9 items-center justify-center">...</span>
          </PaginationItem>
        );
      }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={i === currentPage}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <PaginationItem key="ellipsis-end">
            <span className="flex h-9 w-9 items-center justify-center">...</span>
          </PaginationItem>
        );
      }
      
      pages.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {pages}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Show loading state while checking admin status
  if (!adminCheckComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchases Management</CardTitle>
          <CardDescription>Checking permissions...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Show access denied if user is not an admin
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

        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="relative flex-grow w-full md:w-auto md:mr-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by school, contact, invoice number, plan, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">Show:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleRefresh} className="flex items-center ml-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading purchases data...</p>
          </div>
        ) : (
          <>
            <NewPurchasesTable
              purchases={filteredPurchases}
              onUpdatePurchase={handleUpdatePurchase}
            />
            
            <div className="mt-4 flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-muted-foreground mb-2 md:mb-0">
                Showing {purchases.length} of {totalCount} records
                {searchQuery && filteredPurchases.length !== purchases.length && 
                  ` (filtered from ${purchases.length} records)`}
              </div>
              
              {renderPagination()}
            </div>
            
            {filteredPurchases.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No purchases match your search criteria" : "No purchases found"}
              </div>
            )}
          </>
        )}
      </CardContent>

      {selectedPurchase && (
        <NewUpdatePurchaseDialog
          open={updateDialogOpen}
          onClose={() => setUpdateDialogOpen(false)}
          purchase={selectedPurchase}
          onUpdated={handlePurchaseUpdated}
        />
      )}
    </Card>
  );
};

export default NewPurchasesManagement;
