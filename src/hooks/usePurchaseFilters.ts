
import { useState, useMemo, useCallback } from 'react';
import { Purchase } from '../types/purchases';

export interface PurchaseFilters {
  searchQuery: string;
  currentPage: number;
  pageSize: number;
}

export function usePurchaseFilters(
  purchases: Purchase[],
  totalCount: number,
  initialFilters: Partial<PurchaseFilters> = {}
) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  const [currentPage, setCurrentPage] = useState(initialFilters.currentPage || 1);
  const [pageSize, setPageSize] = useState(initialFilters.pageSize || 10);

  // Reset to first page when search changes
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handler for changing page size
  const handlePageSizeChange = useCallback((value: string) => {
    const newSize = parseInt(value, 10);
    setPageSize(newSize);
    setCurrentPage(1);  // Reset to first page when changing page size
  }, []);

  // Calculate filtered purchases based on search query
  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    
    const query = searchQuery.toLowerCase();
    return purchases.filter(purchase => {
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
  }, [purchases, searchQuery]);

  // Calculate total pages
  const totalPages = useMemo(() => 
    Math.ceil((searchQuery ? filteredPurchases.length : totalCount) / pageSize),
  [filteredPurchases.length, totalCount, searchQuery, pageSize]);

  return {
    // Filters
    searchQuery,
    updateSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    handlePageSizeChange,
    
    // Results
    filteredPurchases,
    totalPages,
    isFiltering: !!searchQuery.trim()
  };
}
