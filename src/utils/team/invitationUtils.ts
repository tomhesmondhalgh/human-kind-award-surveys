
import { supabase } from '@/integrations/supabase/client';
import { ensureValidSession } from '@/utils/auth/sessionValidator';

interface InvitationData {
  email: string;
  role: string;
  organizationId: string;
}

interface InvitationResult {
  success: boolean;
  invitation?: any;
  error?: string;
}

/**
 * Sends a team invitation with proper session validation
 */
export async function sendTeamInvitation(data: InvitationData): Promise<InvitationResult> {
  try {
    console.log('🚀 === ENHANCED TEAM INVITATION FLOW START ===');
    console.log('📋 Invitation request:', data);

    // PHASE 1: Ensure Valid Session
    console.log('🔍 PHASE 1: Session Validation');
    let session;
    try {
      session = await ensureValidSession();
      console.log('✅ Phase 1 PASSED: Valid session established');
    } catch (error) {
      console.error('❌ Phase 1 FAILED:', error);
      return {
        success: false,
        error: `Authentication required: ${(error as Error).message}`
      };
    }

    // PHASE 2: Verify Organization Permissions
    console.log('🔍 PHASE 2: Organization Permission Verification');
    try {
      const { data: canManage, error: permissionError } = await supabase
        .rpc('user_can_manage_org_membership', {
          user_uuid: session.user.id,
          org_id: data.organizationId
        });

      if (permissionError) {
        console.error('❌ Phase 2 FAILED: Permission check error:', permissionError);
        return {
          success: false,
          error: `Permission check failed: ${permissionError.message}`
        };
      }

      if (!canManage) {
        console.error('❌ Phase 2 FAILED: User lacks admin permissions');
        return {
          success: false,
          error: 'You do not have admin permissions for this organisation. Please contact an administrator.'
        };
      }

      console.log('✅ Phase 2 PASSED: User has admin permissions');
    } catch (error) {
      console.error('💥 Phase 2 Error:', error);
      return {
        success: false,
        error: `Permission verification failed: ${(error as Error).message}`
      };
    }

    // PHASE 3: Create Invitation
    console.log('🔍 PHASE 3: Creating Invitation');
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invitation, error: dbError } = await supabase
        .from('organization_invitations')
        .insert({
          email: data.email,
          organization_id: data.organizationId,
          role: data.role as any,
          token,
          invited_by: session.user.id,
          expires_at: expiresAt.toISOString()
        })
        .select(`
          *,
          organizations!organization_invitations_organization_id_fkey (name)
        `)
        .single();

      if (dbError) {
        console.error('❌ Phase 3 FAILED: Database error:', dbError);
        
        if (dbError.message?.includes('permission denied') || dbError.message?.includes('violates row-level security')) {
          return {
            success: false,
            error: 'Database permission denied - please refresh the page and try again'
          };
        }
        
        return {
          success: false,
          error: `Database error: ${dbError.message}`
        };
      }

      console.log('✅ Phase 3 PASSED: Invitation created');
      
      // PHASE 4: Send Email (optional, non-blocking)
      console.log('🔍 PHASE 4: Sending Email');
      try {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();

        const inviterName = inviterProfile 
          ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague'
          : 'A colleague';

        const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
          body: {
            email: data.email,
            organizationName: invitation.organizations?.name || 'your organization',
            role: data.role,
            inviterName,
            invitationToken: token
          }
        });

        if (emailError) {
          console.warn('⚠️ Phase 4 WARNING: Email sending failed:', emailError);
        } else {
          console.log('✅ Phase 4 PASSED: Email sent successfully');
        }
      } catch (emailError) {
        console.warn('⚠️ Phase 4 WARNING: Email error (non-blocking):', emailError);
      }

      console.log('🎉 === ENHANCED TEAM INVITATION FLOW COMPLETE ===');
      return {
        success: true,
        invitation
      };

    } catch (error) {
      console.error('💥 Phase 3 Error:', error);
      return {
        success: false,
        error: `Invitation creation failed: ${(error as Error).message}`
      };
    }

  } catch (error) {
    console.error('❌ === INVITATION FLOW FAILED ===');
    console.error('💥 Final error:', error);
    return {
      success: false,
      error: `Invitation failed: ${(error as Error).message}`
    };
  }
}
