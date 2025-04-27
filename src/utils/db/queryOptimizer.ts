
import { supabase } from '@/integrations/supabase/client';
import { SurveyStatus } from '../types/survey';

/**
 * Optimized survey responses query that uses our new indexes
 * and selects only necessary fields
 */
export const getSurveyResponsesOptimized = async (surveyId: string) => {
  console.log('Fetching optimized survey responses for:', surveyId);
  
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

  return { data, count };
};

/**
 * Optimized payment history query that leverages our new indexes
 * and includes subscription details in a single query
 */
export const getPaymentHistoryOptimized = async (userId: string, limit = 10, page = 1) => {
  console.log('Fetching optimized payment history for:', userId);
  
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

  return payments;
};

/**
 * Optimized custom questions query that combines related data
 * in a single efficient query
 */
export const getCustomQuestionsOptimized = async (surveyId: string) => {
  console.log('Fetching optimized custom questions for:', surveyId);

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

  return data?.map(item => item.custom_questions) || [];
};

/**
 * Optimized survey templates query that uses our new compound index
 * on status and date
 */
export const getSurveyTemplatesOptimized = async (userId: string, status?: SurveyStatus) => {
  console.log('Fetching optimized survey templates for:', userId);
  
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

  return data;
};

