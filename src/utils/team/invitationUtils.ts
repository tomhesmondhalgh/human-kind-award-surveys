
import { supabase } from '@/integrations/supabase/client';
import { functionErrorMessage } from '@/utils/functionError';

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
 * Sends a team invitation using secure Edge Function approach
 */
export async function sendTeamInvitation(data: InvitationData): Promise<InvitationResult> {
  try {
    console.log('🚀 Starting team invitation for:', data.email);

    // Get current session to ensure we have a valid token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('❌ No valid session:', sessionError);
      return {
        success: false,
        error: 'Authentication session expired. Please log in again.'
      };
    }

    console.log('✅ Valid session found, sending invitation');

    // Call the secure edge function (authorization handled automatically by Supabase client)
    const { data: result, error } = await supabase.functions.invoke('send-team-invitation-v2', {
      body: {
        email: data.email,
        role: data.role,
        organizationId: data.organizationId
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      
      // The function's own message is in the JSON reply on error.context.
      const detailedError = await functionErrorMessage(error, 'Failed to send invitation');

      return {
        success: false,
        error: detailedError
      };
    }

    if (!result || !result.success) {
      console.error('❌ Invitation failed:', result?.error || 'Unknown error');
      return {
        success: false,
        error: result?.error || 'Failed to send invitation'
      };
    }

    console.log('✅ Invitation sent successfully');
    return {
      success: true,
      invitation: result.invitation
    };

  } catch (error) {
    console.error('❌ Invitation failed:', error);
    return {
      success: false,
      error: `Invitation failed: ${(error as Error).message}`
    };
  }
}
