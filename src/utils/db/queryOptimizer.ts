
import { supabase } from '@/integrations/supabase/client';
import { SurveyStatus } from '../types/survey';
import { getCacheItem, setCacheItem } from '../cache/cacheUtils';

/**
 * Optimized survey responses query that uses our new indexes
 * and selects only necessary fields with caching
 */
export const getSurveyResponsesOptimized = async (surveyId: string) => {
  console.log('Fetching optimized survey responses for:', surveyId);
  
  // Check cache first
  const cacheKey = `survey_responses_${surveyId}`;
  const cachedData = getCacheItem<{data: any[], count: number}>(cacheKey);
  
  if (cachedData) {
    console.log('Using cached survey responses');
    return cachedData;
  }
  
  const { data, error, count } = await supabase
    .from('survey_responses')
    .select(`
      id,
      role,
      leadership_prioritize,
      manageable_workload,
      work_life_balance,
      health_state,
      valued_member,
      support_access,
      confidence_in_role,
      org_pride,
      recommendation_score,
      leaving_contemplation,
      doing_well,
      improvements,
      created_at
    `, { count: 'exact' })
    .eq('survey_template_id', surveyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching survey responses:', error);
    throw error;
  }

  const result = { data, count };
  
  // Cache the result for 5 minutes
  setCacheItem(cacheKey, result, 300);
  
  return result;
};

/**
 * Optimized payment history query that leverages our new indexes
 * and includes subscription details in a single query with caching
 */
export const getPaymentHistoryOptimized = async (userId: string, limit = 10, page = 1) => {
  console.log('Fetching optimized payment history for:', userId);
  
  // Check cache first
  const cacheKey = `payment_history_${userId}_${limit}_${page}`;
  const cachedData = getCacheItem<any[]>(cacheKey);
  
  if (cachedData) {
    console.log('Using cached payment history');
    return cachedData;
  }
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: payments, error } = await supabase
    .from('payment_history')
    .select(`
      id,
      amount,
      currency,
      payment_status,
      payment_method,
      created_at,
      subscription_id,
      billing_school_name,
      invoice_number,
      subscriptions (
        plan_type,
        purchase_type
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }

  // Cache the result for 5 minutes
  setCacheItem(cacheKey, payments, 300);
  
  return payments;
};

/**
 * Optimized custom questions query that combines related data
 * in a single efficient query with caching
 */
export const getCustomQuestionsOptimized = async (surveyId: string) => {
  console.log('Fetching optimized custom questions for:', surveyId);

  // Check cache first
  const cacheKey = `custom_questions_${surveyId}`;
  const cachedData = getCacheItem<any[]>(cacheKey);
  
  if (cachedData) {
    console.log('Using cached custom questions');
    return cachedData;
  }
  
  const { data, error } = await supabase
    .from('survey_questions')
    .select(`
      id,
      custom_questions:question_id (
        id,
        text,
        type,
        options
      )
    `)
    .eq('survey_id', surveyId);

  if (error) {
    console.error('Error fetching custom questions:', error);
    throw error;
  }

  const questions = data?.map(item => item.custom_questions) || [];
  
  // Cache the result for 10 minutes
  setCacheItem(cacheKey, questions, 600);
  
  return questions;
};

/**
 * Optimized survey templates query that uses our new compound index
 * on status and date with caching
 */
export const getSurveyTemplatesOptimized = async (userId: string, status?: SurveyStatus) => {
  console.log('Fetching optimized survey templates for:', userId);
  
  // Check cache first
  const cacheKey = `survey_templates_${userId}_${status || 'all'}`;
  const cachedData = getCacheItem<any[]>(cacheKey);
  
  if (cachedData) {
    console.log('Using cached survey templates');
    return cachedData;
  }
  
  let query = supabase
    .from('survey_templates')
    .select(`
      id,
      name,
      date,
      close_date,
      status,
      emails,
      created_at,
      survey_responses (count)
    `)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching survey templates:', error);
    throw error;
  }
  
  // Cache the result for 2 minutes
  setCacheItem(cacheKey, data, 120);
  
  return data;
};
