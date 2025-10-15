import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8 ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
