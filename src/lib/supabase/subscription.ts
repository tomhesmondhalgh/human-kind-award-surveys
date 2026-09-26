// Type definitions for subscription-related functionality
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'free' | 'foundation' | 'progress' | 'premium' | 'enterprise' | 'legacy';
// This is the database-specific plan type, which includes legacy but not enterprise
export type DatabasePlanType = 'free' | 'foundation' | 'progress' | 'premium' | 'legacy';

// Access levels: a plan includes everything available to lower levels.
// Legacy customers get the same access as Foundation.
export const PLAN_LEVELS: Record<PlanType, number> = {
  free: 0,
  foundation: 1,
  legacy: 1,
  progress: 2,
  premium: 3,
  enterprise: 4,
};

export function planIncludes(plan: PlanType, requiredPlan: PlanType): boolean {
  return PLAN_LEVELS[plan] >= PLAN_LEVELS[requiredPlan];
}

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

// Subscriptions are created only by the stripe-webhook edge function (and
// redeem_code); the browser can't insert them.
