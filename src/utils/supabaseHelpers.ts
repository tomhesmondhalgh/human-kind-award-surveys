
import { supabase } from '@/integrations/supabase/client';

export const queryTable = async <T>(
  tableName: string,
  select: string = '*',
  filters?: Record<string, any>
) => {
  let query = supabase.from(tableName).select(select);
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  return query;
};
