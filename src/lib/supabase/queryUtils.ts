
import { supabase } from '@/integrations/supabase/client';

// Type-safe wrapper functions for common Supabase operations
export const selectQuery = async <T = any>(
  table: string,
  columns: string = '*',
  filters: Record<string, any> = {}
): Promise<{ data: T[] | null; error: any }> => {
  try {
    let query = supabase.from(table).select(columns);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key as any, value as any);
      }
    });
    
    const { data, error } = await query;
    return { data: data as T[] | null, error };
  } catch (error) {
    console.error(`Error in selectQuery for table ${table}:`, error);
    return { data: null, error };
  }
};

export const selectSingleQuery = async <T = any>(
  table: string,
  columns: string = '*',
  filters: Record<string, any> = {}
): Promise<{ data: T | null; error: any }> => {
  try {
    let query = supabase.from(table).select(columns);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key as any, value as any);
      }
    });
    
    const { data, error } = await query.single();
    return { data: data as T | null, error };
  } catch (error) {
    console.error(`Error in selectSingleQuery for table ${table}:`, error);
    return { data: null, error };
  }
};

export const insertQuery = async <T = any>(
  table: string,
  values: Record<string, any>
): Promise<{ data: T | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(values as any)
      .select()
      .single();
    return { data: data as T | null, error };
  } catch (error) {
    console.error(`Error in insertQuery for table ${table}:`, error);
    return { data: null, error };
  }
};

export const updateQuery = async <T = any>(
  table: string,
  values: Record<string, any>,
  filters: Record<string, any>
): Promise<{ data: T | null; error: any }> => {
  try {
    let query = supabase.from(table).update(values as any);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key as any, value as any);
      }
    });
    
    const { data, error } = await query.select().single();
    return { data: data as T | null, error };
  } catch (error) {
    console.error(`Error in updateQuery for table ${table}:`, error);
    return { data: null, error };
  }
};

export const deleteQuery = async (
  table: string,
  filters: Record<string, any>
): Promise<{ error: any }> => {
  try {
    let query = supabase.from(table).delete();
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key as any, value as any);
      }
    });
    
    const { error } = await query;
    return { error };
  } catch (error) {
    console.error(`Error in deleteQuery for table ${table}:`, error);
    return { error };
  }
};

export const rpcQuery = async <T = any>(
  functionName: string,
  params: Record<string, any> = {}
): Promise<{ data: T | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc(functionName as any, params as any);
    return { data: data as T | null, error };
  } catch (error) {
    console.error(`Error in rpcQuery for function ${functionName}:`, error);
    return { data: null, error };
  }
};
