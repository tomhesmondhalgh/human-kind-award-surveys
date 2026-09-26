
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sendUserToHubspot } from './hubspot';
import type { UserProfileData } from '@/types/auth';

type SignUpResult = 
  | { error: null; success: true; user: User }
  | { error: Error; success: false; user?: undefined };

export async function signUpWithEmail(email: string, password: string, userData?: UserProfileData, skipOrgCreation: boolean = false, invitationToken?: string): Promise<SignUpResult> {
  try {
    console.log('Starting signUpWithEmail process for:', email);
    
    // The handle_new_user database trigger creates the profile, the organisation
    // (when org_name is set) and accepts the invitation (when invitation_token is set).
    // Doing it there means none of it depends on having a session, which doesn't exist
    // until the user confirms their email.
    const organizationName = skipOrgCreation
      ? undefined
      : userData?.organizationName || userData?.schoolName || `${userData?.firstName || 'My'}'s Organisation`;

    const options = {
      data: {
        first_name: userData?.firstName || '',
        last_name: userData?.lastName || '',
        job_title: userData?.jobTitle || '',
        school_name: userData?.schoolName || '',
        school_address: userData?.schoolAddress || '',
        ...(organizationName && {
          org_name: organizationName,
          org_address: userData?.schoolAddress || '',
          org_urn: userData?.schoolURN || '',
        }),
        ...(skipOrgCreation && invitationToken && { invitation_token: invitationToken }),
      },
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
      // The handle_new_user trigger failed, most likely because an organisation with this
      // school URN already exists. Depending on version, Supabase Auth reports either the
      // raw constraint error or a generic one.
      const message = error.message?.toLowerCase() || '';
      if (message.includes('organizations_urn_key') || message.includes('database error saving new user')) {
        throw new Error(
          "We couldn't set up your account. If your school already uses the platform, ask its administrator to invite you; otherwise please contact support."
        );
      }

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
        await sendUserToHubspot(data.user.id);
        hubspotSuccess = true;
        console.log('Successfully added user to HubSpot');
      } catch (hubspotError) {
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
    
    return { error: null, success: true, user: data.user };
  } catch (error) {
    console.error('Error signing up:', error);
    return { error: error as Error, success: false };
  }
}
