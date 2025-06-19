
import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getDashboardStats } from '@/utils/survey/dashboardStats';
import { getSurveyTemplates } from '@/utils/survey/templates';
import type { SurveyWithResponses } from '@/types/survey';

export function useDashboardData() {
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState({
    totalSurveys: null as number | null,
    totalRespondents: null as number | null,
    responseRate: null as string | null,
    benchmarkScore: null as string | null
  });
  const [surveys, setSurveys] = useState<SurveyWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentOrganization?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch dashboard stats
        const dashboardStats = await getDashboardStats(currentOrganization.id);
        if (dashboardStats) {
          setStats({
            totalSurveys: dashboardStats.totalSurveys,
            totalRespondents: dashboardStats.totalRespondents,
            responseRate: dashboardStats.responseRate,
            benchmarkScore: dashboardStats.benchmarkScore
          });
        }

        // Fetch recent surveys (limit to 5 most recent)
        const { surveys: recentSurveys } = await getSurveyTemplates(currentOrganization.id, 1, 5);
        if (recentSurveys) {
          setSurveys(recentSurveys);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentOrganization?.id]);

  return {
    stats,
    surveys,
    isLoading
  };
}
