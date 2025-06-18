
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, Edit3, Archive, Calendar, Users, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Survey {
  id: string;
  name: string;
  date: string;
  close_date?: string;
  status: string;
  emails?: string;
  created_at: string;
}

interface SurveyListProps {
  surveys: Survey[];
  onArchive?: (surveyId: string) => void;
  onRefresh?: () => void;
}

const SurveyList: React.FC<SurveyListProps> = ({ surveys, onArchive, onRefresh }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleViewResults = (surveyId: string) => {
    navigate(`/analysis?survey=${surveyId}`);
  };

  const handleEditSurvey = (surveyId: string) => {
    navigate(`/survey-editor?id=${surveyId}`);
  };

  const handleArchiveSurvey = async (surveyId: string) => {
    try {
      const { error } = await supabase
        .from('survey_templates')
        .update({ status: 'Archived' } as any)
        .eq('id', surveyId);

      if (error) throw error;

      toast.success('Survey archived successfully');
      if (onArchive) onArchive(surveyId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error archiving survey:', error);
      toast.error('Failed to archive survey');
    }
  };

  const handleCopyLink = async (surveyId: string) => {
    const surveyUrl = `${window.location.origin}/survey/${surveyId}`;
    
    try {
      await navigator.clipboard.writeText(surveyUrl);
      toast.success('Survey link copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const getEmailCount = (emails: string | undefined) => {
    if (!emails) return 0;
    return emails.split(',').filter(email => email.trim()).length;
  };

  if (surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-lg mb-2">No surveys found</p>
          <p className="text-sm">Create your first survey to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {surveys.map((survey) => (
        <Card key={survey.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{survey.name}</CardTitle>
              <Badge className={getStatusColor(survey.status)}>
                {survey.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {new Date(survey.date).toLocaleDateString()}</span>
                </div>
                {survey.close_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Closes: {new Date(survey.close_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{getEmailCount(survey.emails)} recipients</span>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {survey.status !== 'Archived' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResults(survey.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View Results
                    </Button>
                    
                    {survey.status !== 'Completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSurvey(survey.id)}
                        className="flex items-center gap-1"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(survey.id)}
                      className="flex items-center gap-1"
                    >
                      <Link className="h-4 w-4" />
                      Copy Link
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveSurvey(survey.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SurveyList;
