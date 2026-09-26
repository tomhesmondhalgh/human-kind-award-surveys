
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Add first page
    if (startPage > 1) {
      pageNumbers.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-20"
        >
          1
        </button>
      );
      
      // Add ellipsis if there's a gap
      if (startPage > 2) {
        pageNumbers.push(
          <span key="start-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
            ...
          </span>
        );
      }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
            i === currentPage
              ? 'z-10 bg-brandPurple-50 border-brandPurple-500 text-brandPurple-600'
              : 'text-gray-500 hover:bg-gray-50'
          } focus:z-20`}
          aria-current={i === currentPage ? 'page' : undefined}
        >
          {i}
        </button>
      );
    }
    
    // Add last page
    if (endPage < totalPages) {
      // Add ellipsis if there's a gap
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <span key="end-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
            ...
          </span>
        );
      }
      
      pageNumbers.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-20"
        >
          {totalPages}
        </button>
      );
    }
    
    return pageNumbers;
  };

  return (
    <nav className="flex items-center justify-center" aria-label="Pagination">
      <div className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
            currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="sr-only">Previous</span>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        
        {renderPageNumbers()}
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
            currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="sr-only">Next</span>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
