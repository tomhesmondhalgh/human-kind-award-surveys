
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
 * Sends a team invitation with enhanced debugging and JWT token management
 */
export async function sendTeamInvitation(data: InvitationData): Promise<InvitationResult> {
  try {
    console.log('🚀 === ENHANCED TEAM INVITATION FLOW START ===');
    console.log('📋 Invitation request:', data);

    // PHASE 1: Enhanced Session Validation with JWT Debugging
    console.log('🔍 PHASE 1: Enhanced Session Validation & JWT Debugging');
    
    const jwtDebugResult = await debugJWTToken();
    console.log('🔍 JWT Debug Summary:', jwtDebugResult);

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

    // PHASE 2: Force JWT Token Transmission Test
    console.log('🚀 PHASE 2: Force JWT Token Transmission');
    const jwtForceResult = await forceJWTTransmission();
    console.log('🚀 JWT Force Result:', jwtForceResult);

    // Decide which client to use
    const clientToUse = jwtForceResult.success && jwtForceResult.client ? jwtForceResult.client : supabase;
    console.log('🎯 Using client:', jwtForceResult.success ? 'explicit JWT client' : 'default client');

    // PHASE 3: Enhanced Organization Permission Verification
    console.log('🔍 PHASE 3: Enhanced Organization Permission Verification');
    try {
      console.log('🧪 Using enhanced permission validator...');
      
      const permissionResult = await OrganizationPermissionValidator.canManageOrgMembership(
        session.user.id, 
        data.organizationId
      );

      console.log('🧪 Enhanced permission result:', permissionResult);

      if (!permissionResult.hasPermission) {
        console.error('❌ Phase 3 FAILED: Enhanced permission check failed');
        return {
          success: false,
          error: `Permission denied: ${permissionResult.error || 'You do not have admin permissions for this organisation'}. Debug details: ${JSON.stringify(permissionResult.details)}`
        };
      }

      console.log('✅ Phase 3 PASSED: Enhanced permission validation successful');
    } catch (error) {
      console.error('💥 Phase 3 Error:', error);
      return {
        success: false,
        error: `Enhanced permission verification failed: ${(error as Error).message}`
      };
    }

    // PHASE 4: Create Invitation with Enhanced Logging
    console.log('🔍 PHASE 4: Creating Invitation');
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      console.log('🧪 Attempting invitation insert with:', {
        email: data.email,
        organization_id: data.organizationId,
        role: data.role,
        token,
        invited_by: session.user.id,
        expires_at: expiresAt.toISOString(),
        usingClient: jwtForceResult.success ? 'explicit' : 'default'
      });

      const { data: invitation, error: dbError } = await clientToUse
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

      console.log('🧪 Invitation insert result:', {
        success: !dbError,
        invitation,
        dbError,
        errorCode: dbError?.code,
        errorMessage: dbError?.message,
        errorDetails: dbError?.details,
        errorHint: dbError?.hint
      });

      if (dbError) {
        console.error('❌ Phase 4 FAILED: Database error:', dbError);
        
        let errorMessage = `Database error: ${dbError.message}`;
        
        if (dbError.message?.includes('permission denied') || dbError.message?.includes('violates row-level security')) {
          errorMessage += `. JWT Debug: auth.uid() works=${jwtDebugResult.authUidWorks}, Force JWT works=${jwtForceResult.success}`;
          
          // If standard client failed but force JWT might work, suggest retry
          if (!jwtForceResult.success && jwtDebugResult.authUidWorks) {
            errorMessage += '. Try refreshing the page and attempting again.';
          }
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      console.log('✅ Phase 4 PASSED: Invitation created');
      
      // PHASE 5: Send Email (optional, non-blocking)
      console.log('🔍 PHASE 5: Sending Email');
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
          console.warn('⚠️ Phase 5 WARNING: Email sending failed:', emailError);
        } else {
          console.log('✅ Phase 5 PASSED: Email sent successfully');
        }
      } catch (emailError) {
        console.warn('⚠️ Phase 5 WARNING: Email error (non-blocking):', emailError);
      }

      console.log('🎉 === ENHANCED TEAM INVITATION FLOW COMPLETE ===');
      console.log('🎯 Final Debug Summary:', {
        jwtDebugWorked: jwtDebugResult.authUidWorks,
        forceJWTWorked: jwtForceResult.success,
        clientUsed: jwtForceResult.success ? 'explicit' : 'default',
        invitationCreated: true
      });
      
      return {
        success: true,
        invitation
      };

    } catch (error) {
      console.error('💥 Phase 4 Error:', error);
      return {
        success: false,
        error: `Invitation creation failed: ${(error as Error).message}. Debug info: JWT works=${jwtDebugResult.authUidWorks}, Force JWT=${jwtForceResult.success}`
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
