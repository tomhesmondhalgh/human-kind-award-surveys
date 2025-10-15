
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PurchasesManagement from '../components/purchases/PurchasesManagement';
import MyPurchases from '../components/user/MyPurchases';
import { useAdminRole } from '../hooks/useAdminRole';

const Purchases = () => {
  const { isAdmin, isLoading } = useAdminRole();
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
          {isAdmin ? <PurchasesManagement /> : <MyPurchases />}
        </div>
      </div>
    </MainLayout>
  );
};

export default Purchases;
