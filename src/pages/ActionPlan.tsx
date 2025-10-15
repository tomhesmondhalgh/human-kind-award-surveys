
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { initializeActionPlan, getSectionProgressSummary } from '../utils/actionPlan';
import { resetSectionToTemplate } from '../utils/actionPlan/resetTemplate';
import { ACTION_PLAN_SECTIONS } from '../types/actionPlan';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import DescriptorTable from '../components/action-plan/DescriptorTable';
import BottomNavigation from '../components/action-plan/BottomNavigation';
import ResetTemplateDialog from '../components/action-plan/ResetTemplateDialog';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';

interface SectionProgress {
  section: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  blockedCount: number;
  notApplicableCount: number;
  percentComplete: number;
}

const ActionPlan = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [currentSection, setCurrentSection] = useState(ACTION_PLAN_SECTIONS[0].key);
  const [isInitializing, setIsInitializing] = useState(false);
  const [summaryData, setSummaryData] = useState<SectionProgress[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);

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

  const handleResetSection = async () => {
    if (!currentOrganization) return;
    
    try {
      const result = await resetSectionToTemplate(
        currentOrganization.id,
        currentSectionData?.title || ''
      );
      
      if (result.success) {
        toast.success('Section reset to template successfully');
        await refreshSummary();
      } else {
        toast.error('Failed to reset section');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error resetting section');
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {ACTION_PLAN_SECTIONS.map(section => {
              const sectionData = summaryData.find(s => s.section === section.title);
              return (
                <div 
                  key={section.key}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    currentSection === section.key 
                      ? 'bg-brandPurple-50 border-brandPurple-200 shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setCurrentSection(section.key)}
                >
                  <h3 className="font-medium text-lg mb-2">{section.title}</h3>
                  
                  {sectionData && (
                    <>
                      <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-green-600 h-2.5 rounded-full" 
                            style={{ width: `${sectionData.percentComplete}%` }}
                          ></div>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {sectionData.percentComplete}% Complete
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between px-2 py-1 bg-green-50 rounded">
                          <span>Completed:</span>
                          <span className="font-medium">{sectionData.completedCount}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-blue-50 rounded">
                          <span>In Progress:</span>
                          <span className="font-medium">{sectionData.inProgressCount}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                          <span>Not Started:</span>
                          <span className="font-medium">{sectionData.notStartedCount}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-red-50 rounded">
                          <span>Blocked:</span>
                          <span className="font-medium">{sectionData.blockedCount}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentSectionData?.title}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Template
            </Button>
          </div>
          
          {user && (
            <DescriptorTable
              userId={user.id}
              section={currentSectionData?.title || ''}
              onRefreshSummary={refreshSummary}
            />
          )}
        </div>

        <BottomNavigation
          activeTab={currentSection}
          onTabChange={setCurrentSection}
        />

        <ResetTemplateDialog
          isOpen={showResetDialog}
          onClose={() => setShowResetDialog(false)}
          onConfirm={handleResetSection}
          sectionName={currentSectionData?.title || ''}
        />
      </div>
    </MainLayout>
  );
};

export default ActionPlan;
