
import React from 'react';
import PurchasesManagement from '../components/purchases/PurchasesManagement';
import MyPurchases from '../components/user/MyPurchases';
import { useAdminRole } from '../hooks/useAdminRole';

const Purchases = () => {
  const { isAdmin, isLoading } = useAdminRole();
  
  return (
    <>
      {isAdmin ? <PurchasesManagement /> : <MyPurchases />}
    </>
  );
};

export default Purchases;
