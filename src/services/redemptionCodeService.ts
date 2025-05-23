
import { supabase } from '../integrations/supabase/client';

export type RedemptionCode = {
  id: string;
  code: string;
  plan_type: string;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number;
  current_uses: number;
  created_at: string;
  updated_at: string;
};

export type RedemptionCodeCreate = {
  code: string;
  plan_type: string;
  max_uses?: number;
  expires_at?: string | null;
};

/**
 * Verify and redeem a code for the current user
 */
export async function verifyRedemptionCode(code: string): Promise<{ success: boolean; message: string; planType?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-redemption-code', {
      body: { code }
    });

    if (error) {
      console.error('Error verifying redemption code:', error);
      throw new Error(error.message || 'Failed to verify redemption code');
    }

    return {
      success: data.success,
      message: data.message || 'Code redeemed successfully',
      planType: data.planType
    };
  } catch (error) {
    console.error('Error in verifyRedemptionCode:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify redemption code'
    };
  }
}

/**
 * Admin functions for managing redemption codes
 */
export const AdminRedemptionCodeService = {
  /**
   * Get all redemption codes (admin only)
   */
  async getAllCodes(): Promise<RedemptionCode[]> {
    const { data, error } = await supabase
      .from('redemption_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching redemption codes:', error);
      throw new Error('Failed to fetch redemption codes');
    }

    return data || [];
  },

  /**
   * Create a new redemption code (admin only)
   */
  async createCode(codeData: RedemptionCodeCreate): Promise<RedemptionCode> {
    const { data, error } = await supabase
      .from('redemption_codes')
      .insert({
        code: codeData.code,
        plan_type: codeData.plan_type,
        max_uses: codeData.max_uses || 1,
        expires_at: codeData.expires_at || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating redemption code:', error);
      throw new Error(error.message || 'Failed to create redemption code');
    }

    return data;
  },

  /**
   * Update a redemption code (admin only)
   */
  async updateCode(id: string, codeData: Partial<RedemptionCodeCreate> & { is_active?: boolean }): Promise<RedemptionCode> {
    const { data, error } = await supabase
      .from('redemption_codes')
      .update({
        code: codeData.code,
        plan_type: codeData.plan_type,
        max_uses: codeData.max_uses,
        expires_at: codeData.expires_at,
        is_active: codeData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating redemption code:', error);
      throw new Error('Failed to update redemption code');
    }

    return data;
  },

  /**
   * Delete a redemption code (admin only)
   */
  async deleteCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('redemption_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting redemption code:', error);
      throw new Error('Failed to delete redemption code');
    }
  },

  /**
   * Get redemptions for a specific code (admin only)
   */
  async getRedemptions(codeId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('redemptions')
      .select(`
        *,
        user:user_id (
          email:auth.users!id(email),
          profile:profiles!id(first_name, last_name, school_name)
        )
      `)
      .eq('code_id', codeId);

    if (error) {
      console.error('Error fetching redemptions:', error);
      throw new Error('Failed to fetch redemptions');
    }

    return data || [];
  }
};
