
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { SurveyWithResponses } from '../utils/surveyUtils';

export const useDashboardData = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [totalSurveys, setTotalSurveys] = useState<number | null>(null);
  const [totalRespondents, setTotalRespondents] = useState<number | null>(null);
  const [responseRate, setResponseRate] = useState<string | null>(null);
  const [benchmarkScore, setBenchmarkScore] = useState<string | null>(null);
  const [recentSurveys, setRecentSurveys] = useState<SurveyWithResponses[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentOrganization?.id) return;

      try {
        setIsLoading(true);

        // Fetch surveys count
        const { count: surveysCount } = await supabase
          .from('survey_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id);

        setTotalSurveys(surveysCount || 0);

        // Fetch total respondents
        const { data: responses } = await supabase
          .from('survey_responses')
          .select('survey_template_id, survey_templates!inner(organization_id)')
          .eq('survey_templates.organization_id', currentOrganization.id);

        setTotalRespondents(responses?.length || 0);

        // Calculate response rate (simplified - would need more complex logic for actual rate)
        const rate = surveysCount && surveysCount > 0 ? 
          Math.round(((responses?.length || 0) / (surveysCount * 10)) * 100) : 0;
        setResponseRate(`${rate}%`);

        // Calculate benchmark score (average recommendation score)
        const { data: recommendations } = await supabase
          .from('survey_responses')
          .select('recommendation_score, survey_templates!inner(organization_id)')
          .eq('survey_templates.organization_id', currentOrganization.id)
          .not('recommendation_score', 'is', null);

        if (recommendations && recommendations.length > 0) {
          const scores = recommendations
            .map(r => parseInt(r.recommendation_score))
            .filter(score => !isNaN(score));
          
          const avgScore = scores.length > 0 ? 
            Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
          setBenchmarkScore(avgScore.toString());
        } else {
          setBenchmarkScore('0');
        }

        // Fetch recent surveys
        const { data: surveysData } = await supabase
          .from('survey_templates')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (surveysData) {
          const surveysWithResponses = await Promise.all(
            surveysData.map(async (survey) => {
              const { count } = await supabase
                .from('survey_responses')
                .select('*', { count: 'exact', head: true })
                .eq('survey_template_id', survey.id);

              return {
                ...survey,
                responses: count || 0
              } as SurveyWithResponses;
            })
          );

          setRecentSurveys(surveysWithResponses);
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
    totalSurveys,
    totalRespondents,
    responseRate,
    benchmarkScore,
    recentSurveys,
    isLoading
  };
};
