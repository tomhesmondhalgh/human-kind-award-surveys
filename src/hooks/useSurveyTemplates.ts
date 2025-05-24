
import { useState, useEffect } from 'react';
import { getSurveyTemplatesOptimized } from '@/utils/db/queryOptimizer';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { SurveyStatus } from '@/utils/types/survey';

export const useSurveyTemplates = (status?: SurveyStatus) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user?.id || !currentOrganization?.id) return;
      
      try {
        setLoading(true);
        const data = await getSurveyTemplatesOptimized(currentOrganization.id, status);
        setTemplates(data);
      } catch (err: any) {
        console.error('Error fetching templates:', err);
        setError(err.message);
        toast.error('Failed to load survey templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [user?.id, currentOrganization?.id, status]);

  return { templates, loading, error };
};
