
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../components/ui/sidebar';
import { Separator } from '../components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../components/ui/breadcrumb';
import AppSidebar from '../components/admin/AppSidebar';
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
import RedemptionCodesManagement from '../components/admin/RedemptionCodesManagement';

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

  const getTabTitle = (tab: string) => {
    const tabTitles = {
      purchases: 'Purchase Management',
      users: 'User Management', 
      feedback: 'Feedback Analytics',
      redemption: 'Redemption Codes',
      plans: 'Plan Management',
      testing: 'Testing Mode',
      scripts: 'Custom Scripts',
      hubspot: 'Hubspot Integration'
    };
    return tabTitles[tab as keyof typeof tabTitles] || 'Admin Panel';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'purchases':
        return <PurchasesManagement />;
      case 'users':
        return <UsersManagement />;
      case 'feedback':
        return <SurveyFeedbackAnalytics />;
      case 'redemption':
        return <RedemptionCodesManagement />;
      case 'plans':
        return <PlansManagement />;
      case 'testing':
        return <TestingMode />;
      case 'scripts':
        return <CustomScriptsManagement />;
      case 'hubspot':
        return <HubspotIntegration />;
      default:
        return <PurchasesManagement />;
    }
  };

  return (
    <MainLayout>
      <div className="-mx-5 sm:-mx-20">
        <SidebarProvider defaultOpen={true}>
          <div className="min-h-[calc(100vh-5rem)] flex w-full">
            <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/admin">
                          Admin Panel
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{getTabTitle(activeTab)}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="min-h-[calc(100vh-16rem)] flex-1 rounded-xl bg-muted/50 md:min-h-min">
                  <div className="p-6">
                    {renderContent()}
                  </div>
                </div>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </MainLayout>
  );
};

export default Admin;
