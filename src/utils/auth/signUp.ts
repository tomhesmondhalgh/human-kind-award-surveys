import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sendUserToHubspot } from './hubspot';
import { toast } from 'sonner';

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
    
    if (userData && data.user) {
      try {
        await sendUserToHubspot({
          email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        console.log('User data sent to Hubspot');
      } catch (hubspotError: any) {
        console.error('Failed to send user data to Hubspot:', hubspotError);
        console.warn('Hubspot integration failed but continuing with signup');
      }
    }

    try {
      if (userData && data.user) {
        const response = await fetch("https://bagaaqkmewkuwtudwnqw.functions.supabase.co/send-admin-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            jobTitle: userData.jobTitle || "",
            schoolName: userData.schoolName || "",
            schoolAddress: userData.schoolAddress || ""
          }),
        });
        if (!response.ok) {
          console.error("Failed to send admin signup notification email:", await response.text());
        } else {
          console.log("Admin notified successfully of new signup");
        }
      }
    } catch (notifyError: any) {
      console.error("Failed to notify admin of signup:", notifyError);
    }

    return { error: null, success: true, user: data.user };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { error: error as Error, success: false };
  }
}
