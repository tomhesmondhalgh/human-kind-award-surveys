
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentSurveysList from '../components/dashboard/RecentSurveysList';
import GettingStartedGuide from '../components/dashboard/GettingStartedGuide';
import PageTitle from '../components/ui/PageTitle';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats, getRecentSurveys, checkForClosedSurveys } from '../utils/surveyUtils';
import { SurveyWithResponses } from '../utils/surveyUtils';
import { useIsMobile } from '../hooks/use-mobile';

const Dashboard = () => {
  const [totalSurveys, setTotalSurveys] = useState<number | null>(null);
  const [totalRespondents, setTotalRespondents] = useState<number | null>(null);
  const [responseRate, setResponseRate] = useState<string | null>(null);
  const [benchmarkScore, setBenchmarkScore] = useState<string | null>(null);
  const [recentSurveys, setRecentSurveys] = useState<SurveyWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch dashboard stats
        const stats = await getDashboardStats();
        if (stats) {
          setTotalSurveys(stats.totalSurveys);
          setTotalRespondents(stats.totalRespondents);
          setResponseRate(stats.responseRate);
          setBenchmarkScore(stats.benchmarkScore);
        } else {
          toast.error("Failed to load dashboard stats", {
            description: "Please try again later."
          });
        }

        // Fetch recent surveys
        const surveys = await getRecentSurveys(3, user?.id);
        setRecentSurveys(surveys);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data", {
          description: "Please check your connection and try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Check for closed surveys when the dashboard loads
    if (user) {
      checkForClosedSurveys();
    }
  }, [user]);

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
