
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
        
        let query = supabase
          .from('survey_templates')
          .select(`
            id,
            name,
            date,
            close_date,
            organization_id,
            emails,
            status,
            created_at,
            updated_at
          `)
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error: fetchError } = await query;

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
