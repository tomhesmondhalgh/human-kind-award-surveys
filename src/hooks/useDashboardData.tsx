
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { getDashboardStats } from '../utils/survey/dashboardStats';
import { getAllSurveyTemplates } from '../utils/survey/templates';
import { countSurveyResponses } from '../utils/survey/responses';
import { SurveyWithResponses } from '../utils/surveyUtils';

export const useDashboardData = () => {
  const { user, isAuthenticated, authCheckComplete } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [stats, setStats] = useState({
    totalSurveys: null as number | null,
    totalRespondents: null as number | null,
    responseRate: null as string | null,
    benchmarkScore: null as string | null
  });
  
  const [surveys, setSurveys] = useState<SurveyWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('Dashboard data hook - Auth state:', {
      isAuthenticated,
      authCheckComplete,
      userId: user?.id,
      organizationId: currentOrganization?.id
    });

    if (!authCheckComplete) {
      console.log('Auth check not complete, waiting...');
      return;
    }

    if (!isAuthenticated || !user) {
      console.log('User not authenticated, setting loading to false');
      setIsLoading(false);
      return;
    }

    if (!currentOrganization?.id) {
      console.log('No organization found, setting empty data');
      setStats({
        totalSurveys: 0,
        totalRespondents: 0,
        responseRate: "0%",
        benchmarkScore: "0"
      });
      setSurveys([]);
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching dashboard data for organization:', currentOrganization.id);

        // Fetch dashboard statistics
        const dashboardStats = await getDashboardStats(currentOrganization.id);
        
        if (dashboardStats) {
          setStats({
            totalSurveys: dashboardStats.totalSurveys,
            totalRespondents: dashboardStats.totalRespondents,
            responseRate: dashboardStats.responseRate,
            benchmarkScore: dashboardStats.benchmarkScore
          });
        } else {
          console.warn('No dashboard stats returned');
          setStats({
            totalSurveys: 0,
            totalRespondents: 0,
            responseRate: "0%",
            benchmarkScore: "0"
          });
        }

        // Fetch recent surveys
        const surveyTemplates = await getAllSurveyTemplates(currentOrganization.id);
        
        // Get response counts for each survey
        const surveysWithResponses = await Promise.all(
          surveyTemplates.slice(0, 5).map(async (template) => {
            const responseCount = await countSurveyResponses(template.id);
            return {
              ...template,
              responses: responseCount
            };
          })
        );
        
        setSurveys(surveysWithResponses as SurveyWithResponses[]);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err as Error);
        
        // Set default values on error
        setStats({
          totalSurveys: 0,
          totalRespondents: 0,
          responseRate: "0%",
          benchmarkScore: "0"
        });
        setSurveys([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isAuthenticated, authCheckComplete, currentOrganization?.id]);

  return {
    stats,
    surveys,
    isLoading,
    error,
    hasOrganization: !!currentOrganization?.id
  };
};
