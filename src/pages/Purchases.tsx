
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PurchasesManagement from '../components/purchases/PurchasesManagement';
import MyPurchases from '../components/user/MyPurchases';
import { useAdminRole } from '../hooks/useAdminRole';

const Purchases = () => {
  const { isAdmin, isLoading } = useAdminRole();
  
  return (
    <MainLayout>
      {isAdmin ? <PurchasesManagement /> : <MyPurchases />}
    </MainLayout>
  );
};

export default Purchases;
