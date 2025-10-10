
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sendUserToHubspot } from './hubspot';
import { toast } from '@/services/toastService';

type SignUpResult = 
  | { error: null; success: true; user: User }
  | { error: Error; success: false; user?: undefined };

export async function signUpWithEmail(email: string, password: string, userData?: any): Promise<SignUpResult> {
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
    } : {};

    console.log('Step 1: Creating user account with Supabase auth.signUp');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      console.error('Supabase auth.signUp error:', error);
      throw error;
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
    
    try {
      console.log('Setting up user profile');
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
        console.error('Error creating profile:', profileError);
        console.warn('Profile creation failed but continuing with signup');
      } else {
        console.log('Created user profile successfully');
      }
    } catch (profileError) {
      console.error('Exception during profile creation:', profileError);
      console.warn('Profile creation failed but continuing with signup');
    }

    // Set up user organization
    try {
      console.log('Setting up user organization');
      
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
        console.error('Error creating organization:', orgError);
        console.warn('Organization creation failed but continuing with signup');
      } else {
        console.log('Created user organization successfully:', orgId);
      }
    } catch (orgError) {
      console.error('Exception during organization creation:', orgError);
      console.warn('Organization creation failed but continuing with signup');
    }

    return { error: null, success: true, user: data.user };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { error: error as Error, success: false };
  }
}
