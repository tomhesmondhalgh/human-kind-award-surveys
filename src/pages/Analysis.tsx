import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { getSurveyResponses, getCustomQuestionResponses, getSurveyTemplate } from '../utils/reportUtils';
import { generatePDF } from '../utils/actionPlan/generatePDF';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, Mail } from 'lucide-react';
import { toast } from 'sonner';

const Analysis = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('surveyId');
  
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [customResponses, setCustomResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
    totalResponses: 0,
    averageScore: 0,
    sentimentBreakdown: {
      positive: 0,
      neutral: 0,
      negative: 0
    }
  });

  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!surveyId) {
        setError('No survey ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch survey template
        const surveyTemplate = await getSurveyTemplate(surveyId);
        if (!surveyTemplate) {
          throw new Error('Survey not found');
        }
        setSurvey(surveyTemplate);

        // Fetch responses
        const surveyResponses = await getSurveyResponses(surveyId);
        if (!surveyResponses) {
          throw new Error('Failed to fetch survey responses');
        }
        setResponses(surveyResponses);

        // Fetch custom question responses for each response
        const allCustomResponses = [];
        for (const response of surveyResponses) {
          const customQuestionResponses = await getCustomQuestionResponses(response.id);
          if (customQuestionResponses) {
            allCustomResponses.push(...customQuestionResponses);
          }
        }
        setCustomResponses(allCustomResponses);

        // Calculate statistics
        calculateStats(surveyResponses);
      } catch (err: any) {
        console.error('Error fetching survey data:', err);
        setError(err.message || 'An error occurred while fetching survey data');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [surveyId]);

  const calculateStats = (responses: any[]) => {
    if (!responses || responses.length === 0) {
      setStats({
        totalResponses: 0,
        averageScore: 0,
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0
        }
      });
      return;
    }

    // Calculate total responses
    const totalResponses = responses.length;

    // Calculate average recommendation score
    const recommendationScores = responses
      .map(r => parseInt(r.recommendation_score))
      .filter(score => !isNaN(score));
    
    const averageScore = recommendationScores.length > 0 
      ? Math.round(recommendationScores.reduce((a, b) => a + b, 0) / recommendationScores.length * 10) / 10
      : 0;

    // Calculate sentiment breakdown (simplified)
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    responses.forEach(response => {
      const score = parseInt(response.recommendation_score);
      if (!isNaN(score)) {
        if (score >= 8) positive++;
        else if (score >= 5) neutral++;
        else negative++;
      }
    });

    setStats({
      totalResponses,
      averageScore,
      sentimentBreakdown: {
        positive: Math.round((positive / totalResponses) * 100),
        neutral: Math.round((neutral / totalResponses) * 100),
        negative: Math.round((negative / totalResponses) * 100)
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      if (!currentOrganization?.id) {
        toast.error('Organization ID is missing');
        return;
      }

      const result = await generatePDF(currentOrganization.id);
      
      if (result.success) {
        toast.success('PDF generated successfully');
      } else {
        toast.error(`Failed to generate PDF: ${result.error}`);
      }
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleEmailReport = async () => {
    try {
      if (!surveyId || !user?.email) {
        toast.error('Missing required information');
        return;
      }

      const { error } = await supabase.functions.invoke('email-survey-report', {
        body: { surveyId, email: user.email }
      });

      if (error) {
        throw error;
      }

      toast.success('Report has been emailed to you');
    } catch (err: any) {
      console.error('Error emailing report:', err);
      toast.error('Failed to email report');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Survey not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{survey.name} Analysis</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleEmailReport}>
            <Mail className="mr-2 h-4 w-4" />
            Email Report
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Survey Overview</CardTitle>
          <CardDescription>
            Created on {new Date(survey.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Total Responses</h3>
              <p className="text-3xl font-bold">{stats.totalResponses}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Average Score</h3>
              <p className="text-3xl font-bold">{stats.averageScore}/10</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Sentiment</h3>
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-green-500 rounded" style={{ width: `${stats.sentimentBreakdown.positive}%` }}></div>
                <div className="h-4 bg-yellow-500 rounded" style={{ width: `${stats.sentimentBreakdown.neutral}%` }}></div>
                <div className="h-4 bg-red-500 rounded" style={{ width: `${stats.sentimentBreakdown.negative}%` }}></div>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>{stats.sentimentBreakdown.positive}% Positive</span>
                <span>{stats.sentimentBreakdown.neutral}% Neutral</span>
                <span>{stats.sentimentBreakdown.negative}% Negative</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">No Responses Yet</h3>
              <p className="text-gray-500">
                There are no responses to this survey yet. Check back later or share the survey link with more people.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Response Details</CardTitle>
              <CardDescription>
                Detailed breakdown of survey responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Response details would go here */}
              <p>Detailed analysis of {responses.length} responses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Questions</CardTitle>
              <CardDescription>
                Responses to custom questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customResponses.length > 0 ? (
                <p>Analysis of {customResponses.length} custom question responses</p>
              ) : (
                <p>No custom question responses available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Analysis;
