
import { supabase } from '@/integrations/supabase/client';
import { withDatabaseSession, withApiSession } from './sessionGuards';

/**
 * Session-aware database operations wrapper
 * Automatically validates sessions before database operations
 */
export class SessionAwareDb {
  
  /**
   * Session-validated select operation
   */
  static select = withDatabaseSession(async (table: string, query?: any) => {
    console.log(`🔍 Session-validated SELECT from ${table}`);
    
    let dbQuery = (supabase as any).from(table).select(query?.select || '*');
    
    if (query?.eq) {
      Object.entries(query.eq).forEach(([column, value]) => {
        dbQuery = dbQuery.eq(column, value);
      });
    }
    
    if (query?.filter) {
      Object.entries(query.filter).forEach(([column, value]) => {
        dbQuery = dbQuery.filter(column, 'eq', value);
      });
    }
    
    if (query?.order) {
      dbQuery = dbQuery.order(query.order.column, { ascending: query.order.ascending ?? true });
    }
    
    if (query?.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }
    
    const { data, error } = await dbQuery;
    
    if (error) throw error;
    return data;
  });

  /**
   * Session-validated insert operation
   */
  static insert = withDatabaseSession(async (table: string, data: any) => {
    console.log(`➕ Session-validated INSERT into ${table}`);
    
    const { data: result, error } = await (supabase as any)
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return result;
  });

  /**
   * Session-validated update operation
   */
  static update = withDatabaseSession(async (table: string, data: any, where: any) => {
    console.log(`✏️ Session-validated UPDATE in ${table}`);
    
    let query = (supabase as any).from(table).update(data);
    
    Object.entries(where).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    const { data: result, error } = await query.select();
    
    if (error) throw error;
    return result;
  });

  /**
   * Session-validated delete operation
   */
  static delete = withDatabaseSession(async (table: string, where: any) => {
    console.log(`🗑️ Session-validated DELETE from ${table}`);
    
    let query = (supabase as any).from(table).delete();
    
    Object.entries(where).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    const { error } = await query;
    
    if (error) throw error;
    return true;
  });

  /**
   * Session-validated RPC call
   */
  static rpc = withApiSession(async (functionName: string, params?: any) => {
    console.log(`⚡ Session-validated RPC call: ${functionName}`);
    
    const { data, error } = await (supabase as any).rpc(functionName, params);
    
    if (error) throw error;
    return data;
  });

  /**
   * Get current user with session validation
   */
  static getCurrentUser = withDatabaseSession(async () => {
    console.log('👤 Getting current user with session validation');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    return user;
  });
}

/**
 * Convenience functions for common operations
 */
export const sessionDb = {
  // User-specific operations
  getUserProfile: (userId: string) => 
    SessionAwareDb.select('profiles', { eq: { id: userId } }),
  
  updateUserProfile: (userId: string, updates: any) =>
    SessionAwareDb.update('profiles', updates, { id: userId }),
  
  // Organization operations
  getUserOrganizations: (userId: string) =>
    SessionAwareDb.select('organization_memberships', { 
      eq: { user_id: userId },
      select: '*, organization:organizations(*)'
    }),
  
  // Survey operations
  getUserSurveys: (organizationId: string) =>
    SessionAwareDb.select('survey_templates', { 
      eq: { organization_id: organizationId },
      order: { column: 'created_at', ascending: false }
    }),
  
  createSurvey: (surveyData: any) =>
    SessionAwareDb.insert('survey_templates', surveyData),
  
  updateSurvey: (surveyId: string, updates: any) =>
    SessionAwareDb.update('survey_templates', updates, { id: surveyId }),
  
  deleteSurvey: (surveyId: string) =>
    SessionAwareDb.delete('survey_templates', { id: surveyId }),
};
