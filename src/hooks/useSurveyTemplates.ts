
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { SurveyStatus } from '@/utils/types/survey';
import { queryTable } from '@/utils/supabaseHelpers';

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
        
        // Build filters for the query
        const filters: Record<string, any> = {
          organization_id: currentOrganization.id
        };
        
        if (status) {
          filters.status = status;
        }

        // Use helper function to query templates
        const { data, error: fetchError } = await queryTable(
          'survey_templates',
          `
            id,
            name,
            date,
            close_date,
            organization_id,
            emails,
            status,
            created_at,
            updated_at
          `,
          filters
        );

        if (fetchError) {
          console.error('Error fetching survey templates:', fetchError);
          throw fetchError;
        }

        console.log(`Fetched ${data?.length || 0} survey templates`);
        setTemplates(data || []);
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
