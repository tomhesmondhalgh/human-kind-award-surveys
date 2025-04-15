
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Updated return type to include user in success case
type SignUpResult = 
  | { error: null; success: true; user: User }
  | { error: Error; success: false; user?: undefined };

// Handle sign up with email and password - simplified version
export async function signUpWithEmail(email: string, password: string, userData?: any): Promise<SignUpResult> {
  try {
    console.log('Starting simplified signUpWithEmail process for:', email);
    
    // If userData is provided, it means we're completing the final signup step
    const options = userData ? {
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
      },
    } : {};

    // Create the user account
    console.log('Creating user account with Supabase auth.signUp');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      console.error('Supabase auth.signUp error:', error);
      throw error;
    }
    
    // Ensure we have a user before proceeding
    if (!data.user) {
      console.error('User creation failed: No user returned from auth.signUp');
      throw new Error('Failed to create user account');
    }
    
    console.log('User created successfully:', data.user.id);
    
    // If we have user data, update the profile
    if (userData && data.user) {
      try {
        // Fix: Ensure profile_id is the first parameter and all parameters are present in the correct order
        const { error: profileError } = await supabase.rpc(
          'create_or_update_profile',
          {
            profile_id: data.user.id,
            profile_first_name: userData.firstName || '',
            profile_last_name: userData.lastName || '',
            profile_job_title: userData.jobTitle || '',
            profile_school_name: userData.schoolName || '',
            profile_school_address: userData.schoolAddress || ''
          }
        );

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't block signup if profile creation fails
        }
      } catch (profileError: any) {
        console.error('Exception creating profile:', profileError);
        // Don't block signup if profile creation fails
      }
    }
    
    // If we have user data and HubSpot integration is needed, send it there
    if (userData && data.user && typeof sendUserToHubspot === 'function') {
      try {
        await sendUserToHubspot({
          email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        console.log('User data sent to Hubspot');
      } catch (hubspotError: any) {
        console.error('Failed to send user data to Hubspot:', hubspotError);
        // Don't block signup if Hubspot integration fails
      }
    }

    return { error: null, success: true, user: data.user };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { error: error as Error, success: false };
  }
}

// Optional: keep the Hubspot function if it's needed elsewhere
function sendUserToHubspot(userData: { email: string, firstName: string, lastName: string }) {
  // This function is simplified and would be replaced with your actual Hubspot integration
  console.log('Sending user data to Hubspot:', userData);
  // Implementation would go here
  return Promise.resolve();
}
