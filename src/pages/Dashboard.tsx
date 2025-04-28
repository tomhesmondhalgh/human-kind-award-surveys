
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentSurveysList from '../components/dashboard/RecentSurveysList';
import GettingStartedGuide from '../components/dashboard/GettingStartedGuide';
import PageTitle from '../components/ui/PageTitle';
import { Button } from '../components/ui/button';
import { Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
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
  const isMobile = useIsMobile();

  console.log('Dashboard auth state:', { 
    userId: user?.id, 
    isAuthenticated, 
    hasSession: !!session
  });

  useEffect(() => {
    console.log('Dashboard useEffect - User:', user?.id || 'no user', 'Session:', !!session);
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setDataFetchError(null);
      
      try {
        console.log('Fetching dashboard stats...');
        // Fetch dashboard stats
        const stats = await getDashboardStats();
        console.log('Dashboard stats received:', stats);
        
        if (stats) {
          setTotalSurveys(stats.totalSurveys);
          setTotalRespondents(stats.totalRespondents);
          setResponseRate(stats.responseRate);
          setBenchmarkScore(stats.benchmarkScore);
        } else {
          console.warn('No dashboard stats returned');
          toast.error("Failed to load dashboard stats", {
            description: "Please try again later."
          });
        }

        console.log('Fetching recent surveys...');
        // Fetch recent surveys
        const surveys = await getRecentSurveys(3, user?.id);
        console.log('Recent surveys received:', surveys);
        setRecentSurveys(surveys);
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

    if (user?.id) {
      fetchDashboardData();
      
      // Check for closed surveys when the dashboard loads
      console.log('Checking for closed surveys...');
      checkForClosedSurveys().catch(err => {
        console.error('Error checking for closed surveys:', err);
      });
    } else {
      console.log('No user ID available, skipping data fetch');
      if (!isLoading) {
        // Only set loading to false if we've already determined there's no user
        // This prevents flickering when authentication is still being determined
        setIsLoading(false);
      }
    }
  }, [user, session]);

  const handleRetry = () => {
    if (user?.id) {
      toast.info("Retrying data fetch...");
      // Force re-fetch by creating a new user object reference
      const tempUser = { ...user };
      // @ts-ignore - Intentionally triggering re-render
      window.dashboardRefetchTrigger = tempUser;
      window.location.reload();
    }
  };

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
          >
            <Plus className="mr-2 h-4 w-4" />
            New Survey
          </Button>
        </div>

        {dataFetchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-6">
            <p>{dataFetchError}</p>
            <button 
              className="mt-2 text-sm font-medium flex items-center gap-2 text-red-700 hover:text-red-800"
              onClick={handleRetry}
            >
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        )}

        {!user && !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md mb-6">
            <p>Authentication issue detected. Please try signing out and back in.</p>
            <button 
              className="mt-2 text-sm font-medium underline"
              onClick={() => navigate('/login')}
            >
              Go to login
            </button>
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
