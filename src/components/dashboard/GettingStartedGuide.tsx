import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, List, Rocket } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { getOnboardingProgress } from './onboardingProgress';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: {
    text: string;
    link: string;
  };
  completed?: boolean;
}

interface GettingStartedGuideProps {
  totalSurveys: number | null;
  totalRespondents: number | null;
}

// Step completion comes from the organisation's real data, not from clicks.
const GettingStartedGuide = ({ totalSurveys, totalRespondents }: GettingStartedGuideProps) => {
  const { currentOrganization } = useOrganization();
  const [open, setOpen] = useState(true);
  const [hasLiveSurvey, setHasLiveSurvey] = useState(false);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    let cancelled = false;
    supabase
      .from('survey_templates')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', currentOrganization.id)
      .in('status', ['Sent', 'Completed'])
      .then(({ count, error }) => {
        if (error) {
          console.error('Error checking for published surveys:', error);
          return;
        }
        if (!cancelled) setHasLiveSurvey((count ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganization?.id]);

  const done = getOnboardingProgress({
    totalSurveys: totalSurveys ?? 0,
    hasLiveSurvey,
    totalRespondents: totalRespondents ?? 0,
  });

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'create-survey',
      title: 'Create your first survey',
      description: 'Start by creating a survey to gather feedback from your staff.',
      icon: <List className="h-5 w-5 text-brandPurple-600" />,
      action: {
        text: 'Create Survey',
        link: '/survey-editor'
      },
      completed: done.createSurvey
    },
    {
      id: 'send-survey',
      title: 'Publish and share your survey',
      description: 'Publish your survey, then share the link or QR code with staff, or send email invitations.',
      icon: <Rocket className="h-5 w-5 text-orange-500" />,
      action: {
        text: 'View Surveys',
        link: '/surveys'
      },
      completed: done.shareSurvey
    },
    {
      id: 'view-results',
      title: 'Analyse your results',
      description: 'Once responses come in, review and analyse the data.',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      action: {
        text: 'Go to Analysis',
        link: '/analysis'
      },
      completed: done.getResponses
    },
    {
      id: 'explore-resources',
      title: 'Explore support resources',
      description: 'Discover helpful guides and resources to improve staff wellbeing.',
      icon: <BookOpen className="h-5 w-5 text-blue-500" />,
      action: {
        text: 'View Resources',
        link: '/improve'
      }
    }
  ];

  // Calculate overall progress
  const progress = done.percent;
  
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-8">
      <Card className="border-brandPurple-100 bg-gradient-to-r from-white to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl text-gray-800">
              Getting Started
              {progress === 100 && (
                <span className="ml-2 text-sm font-normal text-green-600">
                  (Completed!)
                </span>
              )}
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {open ? 'Hide' : 'Show'}
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {onboardingSteps.map((step) => (
                <div 
                  key={step.id}
                  className={`p-4 rounded-lg border ${
                    step.completed 
                      ? 'bg-green-50 border-green-100' 
                      : 'bg-white border-gray-100 hover:border-brandPurple-200 transition-colors'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {step.icon}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900 flex items-center">
                        {step.title}
                        {step.completed && (
                          <CheckCircle className="ml-2 h-4 w-4 text-green-600" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 mb-3">
                        {step.description}
                      </p>
                      <Button 
                        variant={step.completed ? "outline" : "default"}
                        size="sm"
                        asChild
                      >
                        <Link to={step.action.link}>
                          {step.completed ? `Done: ${step.action.text}` : step.action.text}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default GettingStartedGuide;
