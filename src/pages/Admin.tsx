
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import PlansManagement from '../components/admin/PlansManagement';
import TestingMode from '../components/admin/TestingMode';
import CustomScriptsManagement from '../components/admin/CustomScriptsManagement';
import { useAdminRole } from '../hooks/useAdminRole';
import { Navigate } from 'react-router-dom';
import { useTestingMode } from '../contexts/TestingModeContext';
import PurchasesManagement from '../components/purchases/PurchasesManagement';
import HubspotIntegration from '../components/admin/HubspotIntegration';
import UsersManagement from '../components/admin/UsersManagement';
import SurveyFeedbackAnalytics from '../components/admin/SurveyFeedbackAnalytics';

const Admin = () => {
  const { isAdmin, isLoading } = useAdminRole();
  const { isTestingMode } = useTestingMode();
  const [activeTab, setActiveTab] = useState('purchases');
  
  const hasAdminAccess = isAdmin;
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </MainLayout>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 flex flex-wrap">
            <TabsTrigger value="purchases">Purchase Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Analytics</TabsTrigger>
            <TabsTrigger value="plans">Plan Management</TabsTrigger>
            <TabsTrigger value="testing">Testing Mode</TabsTrigger>
            <TabsTrigger value="scripts">Custom Scripts</TabsTrigger>
            <TabsTrigger value="hubspot">Hubspot Integration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="purchases">
            <PurchasesManagement />
          </TabsContent>
          
          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>
          
          <TabsContent value="feedback">
            <SurveyFeedbackAnalytics />
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
          
          <TabsContent value="hubspot">
            <HubspotIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;
