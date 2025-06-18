
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackAnalytics {
  userId: string;
  userName: string;
  schoolName: string;
  surveyId: string;
  surveyName: string;
  responseCount: number;
  avgScore: number;
  negativeFeedbackCount: number;
  feedbackRatio: number;
}

export function useSurveyFeedbackAnalytics(threshold: number = 5) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<FeedbackAnalytics[]>([]);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        
        // Get all surveys with organization and creator information
        const { data: surveys, error: surveyError } = await supabase
          .from('survey_templates')
          .select(`
            id,
            name,
            organization_id,
            organizations:organization_id (
              name
            )
          `)
          .order('created_at', { ascending: false });
          
        if (surveyError) {
          throw new Error(`Failed to fetch surveys: ${surveyError.message}`);
        }
        
        if (!surveys || surveys.length === 0) {
          setAnalytics([]);
          return;
        }
        
        // Process each survey to get feedback analytics
        const feedbackData: FeedbackAnalytics[] = [];
        
        await Promise.all(surveys.map(async (survey) => {
          try {
            // Ensure survey has required properties
            if (!survey || typeof survey !== 'object' || !('id' in survey)) {
              console.warn('Invalid survey object:', survey);
              return;
            }

            // Get responses for this survey
            const { data: responses, error: responseError } = await supabase
              .from('survey_responses')
              .select(`
                recommendation_score,
                valued_member,
                leadership_prioritize,
                manageable_workload,
                work_life_balance,
                health_state,
                support_access,
                confidence_in_role,
                org_pride
              `)
              .eq('survey_template_id', survey.id);
              
            if (responseError) {
              console.error(`Error fetching responses for survey ${survey.id}:`, responseError);
              return;
            }
            
            if (!responses || responses.length === 0) {
              return;
            }
            
            // Calculate metrics
            let negativeFeedbackCount = 0;
            let totalScore = 0;
            let scoreCount = 0;
            
            responses.forEach(response => {
              // Ensure response is an object
              if (!response || typeof response !== 'object') {
                return;
              }

              // Count negative feedback (strongly disagree or disagree) across wellbeing questions
              const wellbeingFields = [
                'valued_member', 'leadership_prioritize', 'manageable_workload',
                'work_life_balance', 'health_state', 'support_access',
                'confidence_in_role', 'org_pride'
              ];
              
              wellbeingFields.forEach(field => {
                if (field in response && 
                    (response[field as keyof typeof response] === 'Disagree' || 
                     response[field as keyof typeof response] === 'Strongly Disagree')) {
                  negativeFeedbackCount++;
                }
              });
              
              // Process recommendation score
              if ('recommendation_score' in response && response.recommendation_score) {
                const recScore = parseInt(response.recommendation_score as string);
                if (!isNaN(recScore)) {
                  totalScore += recScore;
                  scoreCount++;
                }
              }
            });
            
            const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
            const feedbackRatio = responses.length > 0 ? 
              (negativeFeedbackCount / (responses.length * 8)) : 0;
            
            // If this survey has significant negative feedback, add it to the results
            if (responses.length >= threshold && (feedbackRatio > 0.25 || avgScore < 6)) {
              // Safe property access for organization
              const organization = ('organizations' in survey && survey.organizations) ? survey.organizations as any : null;
              
              feedbackData.push({
                userId: ('organization_id' in survey) ? survey.organization_id as string : '',
                userName: 'Organization Admin',
                schoolName: organization?.name || 'Unknown Organisation',
                surveyId: ('id' in survey) ? survey.id as string : '',
                surveyName: ('name' in survey) ? survey.name as string : 'Unknown Survey',
                responseCount: responses.length,
                avgScore: Math.round(avgScore * 10) / 10,
                negativeFeedbackCount,
                feedbackRatio: Math.round(feedbackRatio * 100)
              });
            }
          } catch (err) {
            console.error(`Error processing survey ${('id' in survey) ? survey.id : 'unknown'}:`, err);
          }
        }));
        
        // Sort by feedback ratio (highest negative feedback first)
        feedbackData.sort((a, b) => b.feedbackRatio - a.feedbackRatio);
        
        setAnalytics(feedbackData);
        
      } catch (err) {
        console.error('Error fetching survey feedback analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch feedback analytics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [threshold]);
  
  return {
    analytics,
    isLoading,
    error,
    refresh: () => {
      setIsLoading(true);
      setError(null);
    }
  };
}
