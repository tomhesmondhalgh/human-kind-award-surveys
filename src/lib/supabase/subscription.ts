
// Type definitions for subscription-related functionality
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'free' | 'foundation' | 'progress' | 'premium' | 'enterprise' | 'legacy';
// This is the database-specific plan type, which includes legacy but not enterprise
export type DatabasePlanType = 'free' | 'foundation' | 'progress' | 'premium' | 'legacy';

export interface SubscriptionAccess {
  plan: PlanType;
  isActive: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  purchase_type: 'subscription' | 'one-time' | null;
  duration_months: number | null;
  stripe_price_id: string | null;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all active subscription plans from the database
 */
export async function getPlans(): Promise<Plan[]> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
    
    if (!data) {
      return [];
    }
    
    // Parse features (stored as JSON string in some databases)
    return data.map(plan => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : 
        (typeof plan.features === 'string' ? JSON.parse(plan.features) : [])
    })) as Plan[];
  } catch (error) {
    console.error('Error in getPlans:', error);
    return [];
  }
}

/**
 * Get a user's subscription details
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionAccess | null> {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_subscription', { user_uuid: userId });

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { plan: 'free', isActive: false };
    }

    return { 
      plan: data[0].plan as PlanType, 
      isActive: data[0].is_active 
    };
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Check if a payment should create a subscription and handle it
 */
export async function checkAndCreateSubscription(
  userId: string, 
  planType: PlanType, 
  paymentId: string,
  purchaseType: 'subscription' | 'one-time' = 'subscription'
): Promise<boolean> {
  if (!userId || !planType || !paymentId) {
    console.error('Missing required parameters for subscription creation');
    return false;
  }
  
  try {
    // Get plan details to calculate end date
    const plans = await getPlans();
    const selectedPlan = plans.find(p => 
      p.name.toLowerCase() === planType.toLowerCase());
    
    if (!selectedPlan) {
      console.error(`Plan ${planType} not found`);
      return false;
    }
    
    // Calculate end date for time-limited subscriptions
    let endDate = null;
    if (purchaseType === 'one-time' && selectedPlan.duration_months) {
      const date = new Date();
      date.setMonth(date.getMonth() + selectedPlan.duration_months);
      endDate = date.toISOString();
    }
    
    // Convert enterprise to premium, keep legacy and others as-is
    const dbPlanType: DatabasePlanType = planType === 'enterprise' ? 'premium' : planType as DatabasePlanType;
    
    // Insert subscription record using direct Supabase call
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: dbPlanType,
        payment_method: 'stripe',
        purchase_type: purchaseType,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate
      });
    
    if (error) {
      console.error('Error creating subscription:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in checkAndCreateSubscription:', error);
    return false;
  }
}
