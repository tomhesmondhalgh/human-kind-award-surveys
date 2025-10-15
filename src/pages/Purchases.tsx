
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageContainer from '../components/layout/PageContainer';
import PurchasesManagement from '../components/purchases/PurchasesManagement';
import MyPurchases from '../components/user/MyPurchases';
import { useAdminRole } from '../hooks/useAdminRole';

const Purchases = () => {
  const { isAdmin, isLoading } = useAdminRole();
  
  return (
    <MainLayout>
      <PageContainer>
        {isAdmin ? <PurchasesManagement /> : <MyPurchases />}
      </PageContainer>
    </MainLayout>
  );
};

export default Purchases;
