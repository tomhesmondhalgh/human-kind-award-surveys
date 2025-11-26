import { supabase } from '@/integrations/supabase/client';
import { ensureValidSession } from '@/utils/auth/sessionValidator';
import { OrganizationRole } from '@/types/organizations';

interface PermissionCheckResult {
  hasPermission: boolean;
  error?: string;
  details?: any;
}

/**
 * Helper functions for role-based UI permissions
 */
export const canEditContent = (role?: OrganizationRole): boolean => {
  return role === 'admin' || role === 'editor';
};

export const canManageTeam = (role?: OrganizationRole): boolean => {
  return role === 'admin';
};

/**
 * Enhanced permission checking with fallback mechanisms
 */
export class OrganizationPermissionValidator {
  
  /**
   * Check if user can manage organization membership with multiple validation layers
   */
  static async canManageOrgMembership(userId: string, orgId: string): Promise<PermissionCheckResult> {
    console.log('🔒 === ORGANIZATION PERMISSION CHECK START ===');
    console.log('🔍 Checking permission for:', { userId: userId.slice(0, 8), orgId: orgId.slice(0, 8) });

    try {
      // Layer 1: Ensure valid session
      console.log('🔍 Layer 1: Session validation');
      await ensureValidSession();
      console.log('✅ Session valid');

      // Layer 2: Direct membership query (fallback)
      console.log('🔍 Layer 2: Direct membership check');
      const { data: membership, error: membershipError } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (membershipError) {
        console.error('❌ Layer 2 failed:', membershipError);
        return {
          hasPermission: false,
          error: `Membership check failed: ${membershipError.message}`,
          details: { layer: 'direct_membership', error: membershipError }
        };
      }

      const isAdmin = membership?.role === 'admin';
      console.log('🔍 Layer 2 result: membership role =', membership?.role, 'isAdmin =', isAdmin);

      // Layer 3: RPC function validation
      console.log('🔍 Layer 3: RPC function check');
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('user_can_manage_org_membership', {
          user_uuid: userId,
          org_id: orgId
        });

      if (rpcError) {
        console.warn('⚠️ Layer 3 RPC failed, but Layer 2 passed:', rpcError);
        // Use Layer 2 result as fallback
        return {
          hasPermission: isAdmin,
          error: rpcError.message,
          details: { 
            layer: 'fallback_to_direct', 
            directCheck: isAdmin, 
            rpcError 
          }
        };
      }

      console.log('🔍 Layer 3 result: RPC =', rpcResult);

      // Validate consistency
      if (isAdmin !== rpcResult) {
        console.warn('⚠️ Inconsistency detected between Layer 2 and Layer 3');
        console.warn('Direct check:', isAdmin, 'RPC check:', rpcResult);
        // Prefer the more restrictive result for security
        const finalResult = isAdmin && rpcResult;
        return {
          hasPermission: finalResult,
          error: 'Permission check inconsistency detected',
          details: { 
            layer: 'inconsistency_resolution', 
            directCheck: isAdmin, 
            rpcCheck: rpcResult,
            finalResult
          }
        };
      }

      console.log('✅ Permission check successful:', rpcResult);
      console.log('🔒 === ORGANIZATION PERMISSION CHECK END ===');

      return {
        hasPermission: rpcResult,
        details: { 
          layer: 'complete_validation', 
          directCheck: isAdmin, 
          rpcCheck: rpcResult 
        }
      };

    } catch (error) {
      console.error('💥 Permission check failed:', error);
      return {
        hasPermission: false,
        error: `Permission validation failed: ${(error as Error).message}`,
        details: { layer: 'exception', error }
      };
    }
  }

  /**
   * Check if user has specific organization role with fallback
   */
  static async hasOrganizationRole(userId: string, orgId: string, requiredRole: 'admin' | 'editor' | 'viewer'): Promise<PermissionCheckResult> {
    console.log('🔒 === ROLE CHECK START ===');
    console.log('🔍 Checking role:', { userId: userId.slice(0, 8), orgId: orgId.slice(0, 8), requiredRole });

    try {
      // Ensure valid session
      await ensureValidSession();

      // Direct membership query
      const { data: membership, error: membershipError } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single();

      if (membershipError) {
        return {
          hasPermission: false,
          error: `Role check failed: ${membershipError.message}`,
          details: { error: membershipError }
        };
      }

      const userRole = membership?.role;
      
      // Role hierarchy: admin > editor > viewer
      const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
      const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[requiredRole];

      const hasRole = userLevel >= requiredLevel;

      console.log('🔍 Role check result:', { userRole, requiredRole, userLevel, requiredLevel, hasRole });
      console.log('🔒 === ROLE CHECK END ===');

      return {
        hasPermission: hasRole,
        details: { userRole, requiredRole, userLevel, requiredLevel }
      };

    } catch (error) {
      console.error('💥 Role check failed:', error);
      return {
        hasPermission: false,
        error: `Role validation failed: ${(error as Error).message}`,
        details: { error }
      };
    }
  }

  /**
   * Comprehensive organization access validation
   */
  static async validateOrganizationAccess(userId: string, orgId: string, operation: 'invite' | 'survey_create' | 'survey_edit'): Promise<PermissionCheckResult> {
    console.log('🚀 === COMPREHENSIVE ACCESS VALIDATION ===');
    console.log('🔍 Operation:', operation, 'User:', userId.slice(0, 8), 'Org:', orgId.slice(0, 8));

    const requiredRoles = {
      invite: 'admin' as const,
      survey_create: 'editor' as const,
      survey_edit: 'editor' as const
    };

    const requiredRole = requiredRoles[operation];
    
    if (operation === 'invite') {
      return await this.canManageOrgMembership(userId, orgId);
    } else {
      return await this.hasOrganizationRole(userId, orgId, requiredRole);
    }
  }
}

/**
 * Convenience function for checking invitation permissions
 */
export async function canSendInvitations(userId: string, orgId: string): Promise<boolean> {
  const result = await OrganizationPermissionValidator.canManageOrgMembership(userId, orgId);
  if (!result.hasPermission && result.error) {
    console.error('Invitation permission denied:', result.error);
  }
  return result.hasPermission;
}

/**
 * Convenience function for checking survey creation permissions
 */
export async function canCreateSurveys(userId: string, orgId: string): Promise<boolean> {
  const result = await OrganizationPermissionValidator.hasOrganizationRole(userId, orgId, 'editor');
  if (!result.hasPermission && result.error) {
    console.error('Survey creation permission denied:', result.error);
  }
  return result.hasPermission;
}