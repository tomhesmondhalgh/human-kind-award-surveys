
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import PlansManagement from '../components/admin/PlansManagement';
import TestingMode from '../components/admin/TestingMode';
import CustomScriptsManagement from '../components/admin/CustomScriptsManagement';
import { useAdminRole } from '../hooks/useAdminRole';
import { Navigate } from 'react-router-dom';
import { useTestingMode } from '../contexts/TestingModeContext';
import NewPurchasesManagement from '../components/admin/NewPurchasesManagement';

const Admin = () => {
  const { isAdmin, isLoading } = useAdminRole();
  const { isTestingMode } = useTestingMode();
  const [activeTab, setActiveTab] = useState('purchases');
  
  // Determine if user has admin access
  const hasAdminAccess = isAdmin;
  
  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </MainLayout>
    );
  }

  // Not an admin - redirect to dashboard
  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="purchases">Purchase Management</TabsTrigger>
            <TabsTrigger value="plans">Plan Management</TabsTrigger>
            <TabsTrigger value="testing">Testing Mode</TabsTrigger>
            <TabsTrigger value="scripts">Custom Scripts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="purchases">
            <NewPurchasesManagement />
          </TabsContent>
          
          <TabsContent value="plans">
            <PlansManagement />
          </TabsContent>
          
          <TabsContent value="testing">
            <TestingMode />
          </TabsContent>
          
          <TabsContent value="scripts">
            <CustomScriptsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;
