
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SurveyForm from '../components/surveys/SurveyForm';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const SurveyEditor: React.FC = () => {
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    const id = searchParams.get('id');
    setSurveyId(id);
  }, [searchParams]);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId || !currentOrganization?.id) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('survey_templates')
          .select('*')
          .eq('id', surveyId)
          .eq('organization_id', currentOrganization.id)
          .single();

        if (error) {
          console.error('Error fetching survey:', error);
          setError(error.message);
          toast.error('Failed to load survey');
          return;
        }

        setSurvey(data);
      } catch (err: any) {
        console.error('Error fetching survey:', err);
        setError(err.message);
        toast.error('Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId, currentOrganization?.id]);

  const handleSubmit = async (surveyData: any, customQuestionIds: string[]) => {
    if (!surveyId) {
      toast.error('Survey ID is missing');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('survey_templates')
        .update(surveyData)
        .eq('id', surveyId);

      if (error) {
        console.error('Error updating survey:', error);
        toast.error('Failed to update survey');
        return;
      }

      toast.success('Survey updated successfully');
      navigate('/surveys');
    } catch (err: any) {
      console.error('Error updating survey:', err);
      toast.error('Failed to update survey');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex justify-center items-center h-full">
        <div>Survey not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Survey</h1>
      <SurveyForm
        initialData={survey}
        onSubmit={handleSubmit}
        isPreview={isPreview}
        submitButtonText="Save Changes"
        isEdit={true}
        surveyId={surveyId}
      />
    </div>
  );
};

export default SurveyEditor;
