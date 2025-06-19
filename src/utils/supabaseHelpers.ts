
import { supabase } from '@/integrations/supabase/client';

/**
 * Generic query helper for Supabase tables
 */
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
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return { data: data as T[], error };
};

/**
 * Insert data into a Supabase table
 */
export const insertIntoTable = async <T>(
  tableName: string,
  data: Partial<T>
) => {
  const { data: result, error } = await supabase
    .from(tableName)
    .insert([data])
    .select();
    
  if (error) {
    throw error;
  }
  
  return { data: result, error };
};

/**
 * Update data in a Supabase table
 */
export const updateTable = async <T>(
  tableName: string,
  id: string,
  updates: Partial<T>
) => {
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select();
    
  if (error) {
    throw error;
  }
  
  return { data, error };
};

/**
 * Delete data from a Supabase table
 */
export const deleteFromTable = async (
  tableName: string,
  id: string
) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
    
  if (error) {
    throw error;
  }
  
  return { error };
};
