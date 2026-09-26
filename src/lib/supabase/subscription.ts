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
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Admin-only interface that includes sensitive Stripe data
export interface AdminPlan extends Plan {
  stripe_price_id: string | null;
}

/**
 * Fetch all active subscription plans from the database
 */
export async function getPlans(): Promise<Plan[]> {
  try {
    const { data, error } = await supabase
      .from('public_plans')
      .select('*')
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching plans:', error);
      throw error;
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

    if (!data || data.length === 0) {
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

// Subscriptions are created only by the stripe-webhook edge function (and
// redeem_code); the browser can't insert them.
