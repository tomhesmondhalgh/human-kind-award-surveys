
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentSurveysList from '../components/dashboard/RecentSurveysList';
import GettingStartedGuide from '../components/dashboard/GettingStartedGuide';
import PageTitle from '../components/ui/PageTitle';
import { Button } from '../components/ui/button';
import { Plus, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { getDashboardStats, getRecentSurveys, checkForClosedSurveys } from '../utils/surveyUtils';
import { SurveyWithResponses } from '../utils/surveyUtils';
import { useIsMobile } from '../hooks/use-mobile';

const Dashboard = () => {
  console.log('Rendering Dashboard component');
  const [totalSurveys, setTotalSurveys] = useState<number | null>(null);
  const [totalRespondents, setTotalRespondents] = useState<number | null>(null);
  const [responseRate, setResponseRate] = useState<string | null>(null);
  const [benchmarkScore, setBenchmarkScore] = useState<string | null>(null);
  const [recentSurveys, setRecentSurveys] = useState<SurveyWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, session, isAuthenticated } = useAuth();
  const { currentOrganization, isLoading: orgLoading, error: orgError } = useOrganization();
  const isMobile = useIsMobile();

  console.log('Dashboard auth state:', { 
    userId: user?.id, 
    isAuthenticated, 
    hasSession: !!session,
    organizationId: currentOrganization?.id,
    orgLoading,
    orgError
  });

  useEffect(() => {
    console.log('Dashboard useEffect - User:', user?.id || 'no user', 'Session:', !!session, 'Organization:', currentOrganization?.id);
    
    const fetchDashboardData = async () => {
      // Don't start loading if we're still waiting for org context
      if (orgLoading) {
        console.log('Still loading organization context, waiting...');
        return;
      }
      
      setIsLoading(true);
      setDataFetchError(null);
      
      try {
        // Check for authentication issues first
        if (!isAuthenticated || !user) {
          console.log('User not authenticated, skipping data fetch');
          setIsLoading(false);
          return;
        }
        
        // Check for organization issues
        if (orgError) {
          console.error('Organization context error:', orgError);
          setDataFetchError(`Organisation error: ${orgError}`);
          setIsLoading(false);
          return;
        }
        
        if (!currentOrganization) {
          console.log('No current organization, showing empty state');
          setTotalSurveys(0);
          setTotalRespondents(0);
          setResponseRate("0%");
          setBenchmarkScore("0");
          setRecentSurveys([]);
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching dashboard stats...');
        // Fetch dashboard stats with organization ID
        const stats = await getDashboardStats(currentOrganization.id);
        console.log('Dashboard stats received:', stats);
        
        if (stats) {
          setTotalSurveys(stats.totalSurveys);
          setTotalRespondents(stats.totalRespondents);
          setResponseRate(stats.responseRate);
          setBenchmarkScore(stats.benchmarkScore);
        } else {
          console.warn('No dashboard stats returned');
          // Set default values instead of showing error
          setTotalSurveys(0);
          setTotalRespondents(0);
          setResponseRate("0%");
          setBenchmarkScore("0");
        }

        console.log('Fetching recent surveys...');
        // Fetch recent surveys with organization ID
        const surveys = await getRecentSurveys(3, currentOrganization.id);
        console.log('Recent surveys received:', surveys);
        setRecentSurveys(surveys);
        
        // Check for closed surveys when the dashboard loads
        console.log('Checking for closed surveys...');
        checkForClosedSurveys().catch(err => {
          console.error('Error checking for closed surveys:', err);
        });
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDataFetchError('Failed to load dashboard data. Please check your connection.');
        toast.error("Failed to load dashboard data", {
          description: "Please check your connection and try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, session, isAuthenticated, currentOrganization, orgLoading, orgError]);

  const handleRetry = () => {
    if (user?.id && currentOrganization?.id) {
      toast.info("Retrying data fetch...");
      // Force re-fetch by updating a state
      setDataFetchError(null);
      window.location.reload();
    }
  };

  // Show loading state while organization context is loading
  if (orgLoading) {
    return (
      <MainLayout>
        <div className="page-container">
          <div className="text-center py-12" aria-live="polite" aria-busy="true">
            <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mx-auto" role="progressbar"></div>
            <p className="mt-4 text-gray-600">Loading organisation data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-container">
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'} mb-6`}>
          <PageTitle 
            title="Dashboard" 
            subtitle="At a glance overview of your staff wellbeing"
            alignment={isMobile ? "center" : "left"}
            className={isMobile ? "mb-2" : "mb-0"}
          />
          <Button 
            onClick={() => navigate('/new-survey')}
            className={isMobile ? "w-full py-3" : ""}
            disabled={!currentOrganization}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Survey
          </Button>
        </div>

        {dataFetchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Data Loading Error</p>
                <p className="text-sm mt-1">{dataFetchError}</p>
                <button 
                  className="mt-2 text-sm font-medium flex items-center gap-2 text-red-700 hover:text-red-800"
                  onClick={handleRetry}
                >
                  <RotateCcw size={16} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!isAuthenticated && !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Authentication Required</p>
                <p className="text-sm mt-1">Please sign in to view your dashboard.</p>
                <button 
                  className="mt-2 text-sm font-medium underline"
                  onClick={() => navigate('/login')}
                >
                  Go to login
                </button>
              </div>
            </div>
          </div>
        )}

        {orgError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Organisation Loading Error</p>
                <p className="text-sm mt-1">{orgError}</p>
                {orgError.includes('Database configuration') && (
                  <p className="text-sm mt-2 italic">This appears to be a system configuration issue. Please contact support if this persists.</p>
                )}
                <button 
                  className="mt-2 text-sm font-medium underline"
                  onClick={() => window.location.reload()}
                >
                  Reload page
                </button>
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && !currentOrganization && !isLoading && !orgError && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-md mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">No Organisation Selected</p>
                <p className="text-sm mt-1">Please select an organisation to view dashboard data.</p>
                <button 
                  className="mt-2 text-sm font-medium underline"
                  onClick={() => navigate('/team')}
                >
                  Manage Organisations
                </button>
              </div>
            </div>
          </div>
        )}

        <StatsGrid
          totalSurveys={totalSurveys}
          totalRespondents={totalRespondents}
          responseRate={responseRate}
          benchmarkScore={benchmarkScore}
          isLoading={isLoading}
        />

        <GettingStartedGuide />

        <RecentSurveysList surveys={recentSurveys} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
