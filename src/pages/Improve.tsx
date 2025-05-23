import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Save, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { toast } from 'sonner';
import { initializeActionPlan, getSectionProgressSummary, generatePDF } from '../utils/actionPlanUtils';
import { ACTION_PLAN_SECTIONS } from '../types/actionPlan';
import DescriptorTable from '../components/action-plan/DescriptorTable';
import SectionSummary from '../components/action-plan/SectionSummary';
import BottomNavigation from '../components/action-plan/BottomNavigation';
import ScreenOrientationOverlay from '../components/ui/ScreenOrientationOverlay';
import { useOrientation } from '../hooks/useOrientation';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

const Improve = () => {
  const { user } = useAuth();
  const { currentOrganization, isLoading: isOrgLoading, error: orgError } = useOrganization();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const { orientation, isMobile } = useOrientation();
  const { hasAccess, isLoading: isSubscriptionLoading } = useSubscription();
  const [hasFoundationPlan, setHasFoundationPlan] = useState<boolean | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Store the initialization state in sessionStorage to prevent re-initialization on tab changes
  useEffect(() => {
    const initState = sessionStorage.getItem('actionPlanInitialized');
    if (initState === 'true') {
      console.log('Action plan already initialized according to sessionStorage');
      setHasInitialized(true);
    }
  }, []);

  useEffect(() => {
    async function checkAccess() {
      try {
        if (hasAccess) {
          console.log('Checking user access to foundation plan');
          const canAccess = await hasAccess('foundation');
          console.log('User access to foundation plan:', canAccess);
          setHasFoundationPlan(canAccess);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasFoundationPlan(false);
      }
    }
    if (!isSubscriptionLoading) {
      checkAccess();
    }
  }, [hasAccess, isSubscriptionLoading]);

  useEffect(() => {
    if (currentOrganization && !hasInitialized && hasFoundationPlan === true) {
      console.log('Initializing action plan for organization:', currentOrganization.id);
      initializeActionPlanData();
    } else if (hasInitialized && hasFoundationPlan === true && currentOrganization) {
      console.log('Action plan already initialized, fetching summary data only');
      fetchSummaryData();
      setIsLoading(false);
    }
  }, [currentOrganization, hasInitialized, hasFoundationPlan]);

  const initializeActionPlanData = async () => {
    if (!currentOrganization) {
      setInitError('No organization found. Please ensure you are a member of an organization.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setInitError(null);
    try {
      console.log('Starting action plan initialization...');
      const result = await initializeActionPlan(currentOrganization.id);
      
      if (result.success) {
        console.log('Action plan initialized successfully');
        await fetchSummaryData();
        // Mark as initialized in both state and sessionStorage
        setHasInitialized(true);
        sessionStorage.setItem('actionPlanInitialized', 'true');
      } else {
        console.error("Failed to initialize action plan:", result.error);
        setInitError(`Initialization failed: ${result.error}`);
        toast.error("Failed to initialize action plan");
      }
    } catch (error) {
      console.error("Error initializing action plan:", error);
      setInitError(`Initialization error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to initialize action plan");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummaryData = async () => {
    if (!currentOrganization) return;
    
    try {
      console.log('Fetching summary data...');
      const result = await getSectionProgressSummary(currentOrganization.id);
      if (result.success && result.data) {
        console.log('Summary data fetched successfully', result.data);
        setSummaryData(result.data);
      } else {
        console.error('Failed to fetch summary data:', result.error);
        toast.error('Failed to load summary data');
      }
    } catch (error) {
      console.error('Error fetching summary data:', error);
      toast.error('Failed to load summary data');
    }
  };

  const handleExportPDF = async () => {
    if (!user || !currentOrganization) return;
    setIsGeneratingPDF(true);
    try {
      const result = await generatePDF(currentOrganization.id);
      if (result.success) {
        toast.success('PDF exported successfully');
      } else {
        toast.error(`PDF export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF export failed');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleRetryInitialization = () => {
    if (currentOrganization) {
      setInitError(null);
      initializeActionPlanData();
    }
  };

  const shouldShowOverlay = isMobile && orientation === 'portrait' && !overlayDismissed;
  const isSubscriptionChecking = isSubscriptionLoading || hasFoundationPlan === null;

  return (
    <MainLayout>
      {shouldShowOverlay && (
        <ScreenOrientationOverlay onDismiss={() => setOverlayDismissed(true)} />
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <PageTitle
            title="Wellbeing Action Plan"
            subtitle="Track and improve staff wellbeing using this action planning tool"
            alignment="left"
          />
          
          {hasFoundationPlan && currentOrganization && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={isLoading || isGeneratingPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
              </Button>
            </div>
          )}
        </div>
        
        {isSubscriptionChecking ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="mb-4">Checking subscription...</div>
            </div>
          </div>
        ) : !hasFoundationPlan ? (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Upgrade to Access the Action Plan</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              The Wellbeing Action Plan is available with Foundation, Progress, and Premium plans. 
              Upgrade today to access powerful tools for planning and tracking staff wellbeing improvements.
            </p>
            
            <Button onClick={() => navigate('/upgrade')} size="lg" className="px-8">
              View Upgrade Options <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : isOrgLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="mb-4">Loading organization...</div>
              <div className="text-sm text-gray-500">Please wait while we set up your workspace</div>
            </div>
          </div>
        ) : orgError ? (
          <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-yellow-700">Organization Access Required</h2>
            <p className="text-gray-700 mb-6">{orgError}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/team')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                Retry Loading
              </Button>
            </div>
          </div>
        ) : !currentOrganization ? (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No Organization Found</h2>
            <p className="text-gray-600 mb-6">
              You need to be a member of an organization to access the Action Plan.
            </p>
            <Button onClick={() => navigate('/team')} className="px-8">
              <Plus className="h-4 w-4 mr-2" />
              Create or Join Organization
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="mb-4">Loading action plan...</div>
              <div className="text-sm text-gray-500">This may take a moment</div>
            </div>
          </div>
        ) : initError ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-700">Error Loading Action Plan</h2>
            <p className="text-gray-700 mb-6">{initError}</p>
            <Button onClick={handleRetryInitialization} variant="destructive">
              Retry
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full mb-6 overflow-x-auto flex flex-nowrap justify-start">
              <TabsTrigger value="summary" className="flex-shrink-0">
                Summary
              </TabsTrigger>
              {ACTION_PLAN_SECTIONS.map(section => (
                <TabsTrigger key={section.key} value={section.key} className="flex-shrink-0">
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="summary" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryData.map(section => (
                  <SectionSummary
                    key={section.key}
                    title={section.title}
                    totalCount={section.totalCount}
                    completedCount={section.completedCount}
                    inProgressCount={section.inProgressCount}
                    notStartedCount={section.notStartedCount}
                    blockedCount={section.blockedCount}
                    notApplicableCount={section.notApplicableCount}
                    percentComplete={section.percentComplete}
                  />
                ))}
              </div>
            </TabsContent>
            
            {ACTION_PLAN_SECTIONS.map(section => (
              <TabsContent key={section.key} value={section.key} className="mt-6 overflow-x-auto">
                {currentOrganization && (
                  <DescriptorTable
                    userId={currentOrganization.id}
                    section={section.title}
                    onRefreshSummary={fetchSummaryData}
                  />
                )}
              </TabsContent>
            ))}
            
            <BottomNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
};

export default Improve;
