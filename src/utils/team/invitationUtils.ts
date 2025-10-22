
import { supabase } from '@/integrations/supabase/client';
import { ensureValidSession } from '@/utils/auth/sessionValidator';
import { OrganizationPermissionValidator } from '@/utils/organizationPermissions';

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
 * Enhanced JWT token debugging utility
 */
async function debugJWTToken() {
  console.log('🔍 === JWT TOKEN DEBUGGING START ===');
  
  try {
    // Get current session with full details
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('📊 Session data:', {
      hasSession: !!sessionData.session,
      hasAccessToken: !!sessionData.session?.access_token,
      tokenLength: sessionData.session?.access_token?.length,
      expiresAt: sessionData.session?.expires_at,
      tokenStart: sessionData.session?.access_token?.substring(0, 20) + '...',
      error: sessionError
    });

    // Check if token is in localStorage
    const storedToken = localStorage.getItem('sb-bagaaqkmewkuwtudwnqw-auth-token');
    console.log('💾 Stored token exists:', !!storedToken);
    
    if (storedToken) {
      try {
        const parsedToken = JSON.parse(storedToken);
        console.log('💾 Stored token details:', {
          hasAccessToken: !!parsedToken.access_token,
          expiresAt: parsedToken.expires_at,
          tokenMatches: parsedToken.access_token === sessionData.session?.access_token
        });
      } catch (e) {
        console.error('💾 Failed to parse stored token:', e);
      }
    }

    // Test auth.uid() function directly
    console.log('🧪 Testing auth.uid() function...');
    const { data: userData, error: uidError } = await supabase.auth.getUser();
    const uidTest = userData?.user?.email;
    
    console.log('🧪 Auth UID test result:', {
      success: !uidError,
      email: uidTest,
      error: uidError
    });

    // Check Supabase client headers
    const headers = (supabase as any).auth.headers || {};
    console.log('📡 Supabase client headers:', headers);

    return {
      hasValidSession: !!sessionData.session && !sessionError,
      hasValidToken: !!sessionData.session?.access_token,
      authUidWorks: !uidError && !!uidTest,
      sessionData,
      uidTest,
      uidError
    };

  } catch (error) {
    console.error('💥 JWT debugging failed:', error);
    return {
      hasValidSession: false,
      hasValidToken: false,
      authUidWorks: false,
      error
    };
  } finally {
    console.log('🔍 === JWT TOKEN DEBUGGING END ===');
  }
}

/**
 * Force explicit JWT token transmission
 */
async function forceJWTTransmission() {
  console.log('🚀 === FORCING JWT TRANSMISSION ===');
  
  try {
    // Get fresh session
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session?.access_token) {
      throw new Error('No access token available');
    }

    // Create a new supabase client instance with explicit headers
    const { createClient } = await import('@supabase/supabase-js');
    const explicitClient = createClient(
      'https://bagaaqkmewkuwtudwnqw.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2FhcWttZXdrdXd0dWR3bnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NjQwMzIsImV4cCI6MjA1NjI0MDAzMn0.Eu_xDUDDk188oE0dB7W7KJ4oWjB6nQNuUBBnZUMrsvE',
      {
        auth: {
          persistSession: false, // Don't persist to avoid conflicts
        },
        global: {
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2FhcWttZXdrdXd0dWR3bnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NjQwMzIsImV4cCI6MjA1NjI0MDAzMn0.Eu_xDUDDk188oE0dB7W7KJ4oWjB6nQNuUBBnZUMrsvE'
          }
        }
      }
    );

    console.log('🚀 Testing with explicit JWT client...');
    
        // Test auth.uid() with explicit client
        const { data: explicitUserData, error: explicitUidError } = await explicitClient.auth.getUser();
        const explicitUidTest = explicitUserData?.user?.email;
    
    console.log('🚀 Explicit client auth test:', {
      success: !explicitUidError,
      email: explicitUidTest,
      error: explicitUidError
    });

    return {
      success: !explicitUidError,
      client: explicitClient,
      testResult: explicitUidTest,
      error: explicitUidError
    };

  } catch (error) {
    console.error('💥 Force JWT transmission failed:', error);
    return {
      success: false,
      error
    };
  }
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
      return {
        success: false,
        error: error.message || 'Failed to send invitation'
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
