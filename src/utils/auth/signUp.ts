
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sendUserToHubspot } from './hubspot';
import { toast } from '@/services/toastService';

type SignUpResult = 
  | { error: null; success: true; user: User }
  | { error: Error; success: false; user?: undefined };

export async function signUpWithEmail(email: string, password: string, userData?: any, skipOrgCreation: boolean = false, invitationToken?: string): Promise<SignUpResult> {
  try {
    console.log('Starting signUpWithEmail process for:', email);
    
    const options = userData ? {
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        job_title: userData.jobTitle,
        school_name: userData.schoolName,
        school_address: userData.schoolAddress
      },
      emailRedirectTo: `${window.location.origin}/login`
    } : {
      emailRedirectTo: `${window.location.origin}/login`
    };

    console.log('Step 1: Creating user account with Supabase auth.signUp');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      console.error('Supabase auth.signUp error:', error);
      
      // Check for duplicate email scenarios
      if (error.message?.toLowerCase().includes('user already registered') ||
          error.message?.toLowerCase().includes('already exists') ||
          error.message?.toLowerCase().includes('duplicate') ||
          error.status === 422) {
        throw new Error('DUPLICATE_EMAIL');
      }
      
      throw error;
    }
    
    // Check for duplicate email via identities array (alternative method)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.warn('Duplicate email detected via identities check');
      throw new Error('DUPLICATE_EMAIL');
    }
    
    if (!data.user) {
      console.error('User creation failed: No user returned from auth.signUp');
      throw new Error('Failed to create user account');
    }
    
    console.log('User created successfully:', data.user.id);
    
    // Add user to HubSpot with retry mechanism
    let hubspotSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!hubspotSuccess && retryCount < maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1} to add user to HubSpot`);
        await sendUserToHubspot({
          email,
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          jobTitle: userData?.jobTitle || '',
          schoolName: userData?.schoolName || '',
          schoolAddress: userData?.schoolAddress || ''
        });
        hubspotSuccess = true;
        console.log('Successfully added user to HubSpot');
      } catch (hubspotError: any) {
        console.error(`HubSpot integration attempt ${retryCount + 1} failed:`, hubspotError);
        retryCount++;
        
        if (retryCount === maxRetries) {
          console.error('All HubSpot integration attempts failed');
          // Don't block signup if HubSpot fails
          console.warn('Continuing with signup despite HubSpot failure');
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }
    
    // Profile creation is CRITICAL - retry with exponential backoff
    let profileCreated = false;
    let profileRetries = 0;
    const maxProfileRetries = 3;

    while (!profileCreated && profileRetries < maxProfileRetries) {
      try {
        console.log(`Attempt ${profileRetries + 1} to create user profile`);
        const { error: profileError } = await supabase.rpc(
          'create_or_update_profile',
          {
            profile_id: data.user.id,
            profile_first_name: userData?.firstName || '',
            profile_last_name: userData?.lastName || '',
            profile_job_title: userData?.jobTitle || '',
            profile_school_name: userData?.schoolName || '',
            profile_school_address: userData?.schoolAddress || ''
          }
        );
        
        if (profileError) {
          throw profileError;
        }
        
        profileCreated = true;
        console.log('✅ Profile created successfully');
      } catch (profileError: any) {
        profileRetries++;
        console.error(`❌ Profile creation attempt ${profileRetries} failed:`, profileError);
        
        if (profileRetries === maxProfileRetries) {
          console.error('🚨 CRITICAL: Profile creation failed after all retries');
          // Profile creation is essential - abort signup
          throw new Error(
            'Failed to create user profile. Please try again or contact support.'
          );
        }
        
        // Wait before retry (exponential backoff: 1s, 2s, 4s)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, profileRetries - 1) * 1000));
      }
    }

    // Set up user organization - REQUIRED for a functional account (unless invited)
    if (skipOrgCreation) {
      console.log('⏭️ Skipping organization creation (user invited to existing org)');
    } else {
      console.log('Setting up user organization (required step)');
      
      const organizationName = userData?.organizationName || 
                              userData?.schoolName || 
                              `${userData?.firstName}'s Organisation`;
      
      const { data: orgId, error: orgError } = await supabase.rpc(
        'setup_user_organization',
        {
          user_uuid: data.user.id,
          org_name: organizationName,
          org_address: userData?.schoolAddress || '',
          org_urn: userData?.schoolURN || null
        }
      );
      
      if (orgError) {
        console.error('CRITICAL: Failed to create organization for new user:', orgError);
        
        // Organization creation is essential - throw error to prevent incomplete signup
        throw new Error(
          orgError.message?.includes('duplicate') || orgError.code === '23505'
            ? 'An organization with this name already exists'
            : 'Failed to set up organization. Please try again or contact support.'
        );
      }
      
      if (!orgId) {
        console.error('CRITICAL: Organization RPC returned no ID');
        throw new Error('Failed to set up organization. Please try again or contact support.');
      }
      
      console.log('Created user organization successfully:', orgId);
    }

    // Accept invitation immediately if token provided
    if (skipOrgCreation && invitationToken) {
      console.log('📧 Accepting invitation via RPC during signup');
      
      try {
        const { data: acceptResult, error: acceptError } = await supabase.rpc(
          'accept_invitation_during_signup',
          {
            user_uuid: data.user.id,
            invitation_token: invitationToken
          }
        );
        
        if (acceptError) {
          console.error('❌ RPC error accepting invitation:', acceptError);
          console.log('💾 Invitation will need to be accepted after email confirmation');
        } else if (acceptResult && typeof acceptResult === 'object' && 'success' in acceptResult && acceptResult.success) {
          console.log('✅ Invitation accepted successfully during signup:', acceptResult);
        } else {
          console.warn('⚠️ Invitation acceptance returned:', acceptResult);
        }
      } catch (invitationError) {
        console.error('💥 Exception accepting invitation:', invitationError);
      }
    } else if (skipOrgCreation) {
      console.log('⚠️ Organization creation skipped but no invitation token provided');
    }

    return { error: null, success: true, user: data.user };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { error: error as Error, success: false };
  }
}
