
// Supabase integration helpers with strategic type assertions
import { supabase } from '@/integrations/supabase/client';

/**
 * Generic query helper that handles Supabase type complexity
 * Uses strategic 'as any' to bypass complex auto-generated types
 */
export const queryTable = async <T>(
  tableName: string,
  selectFields: string = '*',
  filters?: Record<string, any>
): Promise<{ data: T[] | null; error: any }> => {
  let query = supabase.from(tableName).select(selectFields);
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key as any, value as any);
    });
  }
  
  const { data, error } = await query;
  return { data: data as T[] | null, error };
};

/**
 * Generic insert helper
 */
export const insertIntoTable = async <T>(
  tableName: string,
  insertData: Record<string, any>
): Promise<{ data: T | null; error: any }> => {
  const { data, error } = await supabase
    .from(tableName)
    .insert(insertData as any)
    .select()
    .single();
  
  return { data: data as T | null, error };
};

/**
 * Generic update helper
 */
export const updateTable = async <T>(
  tableName: string,
  updateData: Record<string, any>,
  id: string
): Promise<{ data: T | null; error: any }> => {
  const { data, error } = await supabase
    .from(tableName)
    .update(updateData as any)
    .eq('id' as any, id as any)
    .select()
    .single();
  
  return { data: data as T | null, error };
};

/**
 * Generic delete helper
 */
export const deleteFromTable = async (
  tableName: string,
  id: string
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id' as any, id as any);
  
  return { error };
};

/**
 * Helper for queries with 'in' filters
 */
export const queryTableWithIn = async <T>(
  tableName: string,
  selectFields: string = '*',
  columnName: string,
  values: any[]
): Promise<{ data: T[] | null; error: any }> => {
  const { data, error } = await supabase
    .from(tableName)
    .select(selectFields)
    .in(columnName as any, values as any);
  
  return { data: data as T[] | null, error };
};
