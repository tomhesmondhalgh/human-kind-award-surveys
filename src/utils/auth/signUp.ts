
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
      console.log('Step 3: Sending admin notification email');
      console.log('Notification data:', {
        email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        jobTitle: userData?.jobTitle || "",
        schoolName: userData?.schoolName || "",
        schoolAddress: userData?.schoolAddress || ""
      });
      
      if (userData && data.user) {
        console.log('Sending admin notification for new signup');
        
        // Get current session first
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        
        // Call the edge function with explicit URL and proper access token
        const response = await fetch('https://bagaaqkmewkuwtudwnqw.supabase.co/functions/v1/send-admin-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            jobTitle: userData.jobTitle || "",
            schoolName: userData.schoolName || "",
            schoolAddress: userData.schoolAddress || ""
          })
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error("Failed to send admin signup notification:", response.status, errorData);
        } else {
          const responseData = await response.json();
          console.log("Admin notified successfully of new signup:", responseData);
        }
      } else {
        console.warn('Skipping admin notification - missing user data or user object');
      }
    } catch (notifyError: any) {
      console.error("Failed to notify admin of signup:", notifyError);
      console.error("Error details:", notifyError.message);
      console.error("Error stack:", notifyError.stack);
    }

    return { error: null, success: true, user: data.user };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { error: error as Error, success: false };
  }
}
