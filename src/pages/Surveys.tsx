import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useSurveyTemplates } from '../hooks/useSurveyTemplates';
import { SurveyStatus } from '../utils/types/survey';
import SurveyList from '../components/surveys/SurveyList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { sendSurveyReminder } from '../utils/survey/sendReminder';
import { toast } from 'sonner';

const Surveys: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [selectedStatus, setSelectedStatus] = useState<SurveyStatus | undefined>(undefined);
  
  const {
    templates: surveys,
    loading,
    error
  } = useSurveyTemplates(selectedStatus);

  const handleSendReminder = async (surveyId: string): Promise<void> => {
    const success = await sendSurveyReminder(surveyId);
    if (success) {
      toast.success('Reminder sent successfully');
    }
  };

  const refreshList = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading surveys...</div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const isConnectionError = errorMessage.includes('fetch');
    
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isConnectionError 
              ? 'Unable to connect to the server. Please check your internet connection and try again.'
              : errorMessage
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleStatusChange = (status?: SurveyStatus) => {
    setSelectedStatus(status);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground">
            Create and manage wellbeing surveys for your organisation
          </p>
        </div>
        <Button 
          onClick={() => navigate('/surveys/new')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Survey
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Surveys</CardTitle>
          <CardDescription>
            View and manage all surveys for {currentOrganization?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SurveyList
            surveys={surveys}
            refreshList={refreshList}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Surveys;
