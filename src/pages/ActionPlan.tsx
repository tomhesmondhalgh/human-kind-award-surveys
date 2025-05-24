
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { initializeActionPlan, getSectionProgressSummary } from '../utils/actionPlan';
import { ACTION_PLAN_SECTIONS } from '../types/actionPlan';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import SectionSummary from '../components/action-plan/SectionSummary';
import DescriptorTable from '../components/action-plan/DescriptorTable';
import BottomNavigation from '../components/action-plan/BottomNavigation';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const ActionPlan = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [currentSection, setCurrentSection] = useState(ACTION_PLAN_SECTIONS[0].key);
  const [isInitializing, setIsInitializing] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const currentSectionData = ACTION_PLAN_SECTIONS.find(s => s.key === currentSection);

  useEffect(() => {
    const initializePlan = async () => {
      if (!user || !currentOrganization) return;

      const cachedInitialization = sessionStorage.getItem('actionPlanInitialized');
      if (cachedInitialization === currentOrganization.id) {
        console.log('Action plan already initialized for this session');
        return;
      }

      setIsInitializing(true);
      try {
        console.log('Initializing action plan for organization:', currentOrganization.id);
        const result = await initializeActionPlan(currentOrganization.id);
        
        if (result.success) {
          console.log('Action plan initialized successfully');
          sessionStorage.setItem('actionPlanInitialized', currentOrganization.id);
        } else {
          console.error('Failed to initialize action plan:', result.error);
          toast.error('Failed to initialize action plan');
        }
      } catch (error) {
        console.error('Error initializing action plan:', error);
        toast.error('Error initializing action plan');
      } finally {
        setIsInitializing(false);
      }
    };

    initializePlan();
  }, [user, currentOrganization]);

  const refreshSummary = async () => {
    if (!currentOrganization) return;

    setIsLoadingSummary(true);
    try {
      console.log('Refreshing summary for organization:', currentOrganization.id);
      const result = await getSectionProgressSummary(currentOrganization.id);
      
      if (result.success && result.data) {
        setSummaryData(result.data);
      } else {
        console.error('Failed to refresh summary:', result.error);
        toast.error('Failed to refresh progress summary');
      }
    } catch (error) {
      console.error('Error refreshing summary:', error);
      toast.error('Error refreshing progress summary');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    refreshSummary();
  }, [currentOrganization]);

  if (!currentOrganization) {
    return (
      <MainLayout>
        <div className="page-container bg-white">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No Organisation Selected</h2>
            <p className="text-gray-600 mb-6">Please select an organisation to access action plans.</p>
            <Link 
              to="/team" 
              className="bg-brandPurple-500 hover:bg-brandPurple-600 text-white font-medium py-2 px-6 rounded-md transition-all duration-200 inline-block"
            >
              Manage Organisations
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isInitializing) {
    return (
      <MainLayout>
        <div className="page-container bg-white">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up your action plan...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-container bg-white min-h-screen pb-24">
        <PageTitle 
          title="Action Plan" 
          subtitle={`Manage wellbeing action plan for ${currentOrganization.name}`}
        />

        {isLoadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <SectionSummary 
            summaryData={summaryData}
            currentSection={currentSection}
            onSectionChange={setCurrentSection}
          />
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">
            {currentSectionData?.title}
          </h2>
          
          {user && (
            <DescriptorTable
              userId={user.id}
              section={currentSectionData?.title || ''}
              onRefreshSummary={refreshSummary}
            />
          )}
        </div>

        <BottomNavigation
          sections={ACTION_PLAN_SECTIONS}
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
        />
      </div>
    </MainLayout>
  );
};

export default ActionPlan;
