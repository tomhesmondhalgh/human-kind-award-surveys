import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sendUserToHubspot } from './hubspot';

// Handle profile completion
export async function completeUserProfile(userId: string, userData: any) {
  try {
    // Update user metadata with profile information
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        job_title: userData.jobTitle,
        school_name: userData.schoolName,
        school_address: userData.schoolAddress,
      },
    });

    if (metadataError) {
      throw metadataError;
    }

    // Fix: Ensure profile_id is the first parameter and all parameters are in the correct order
    const { error: profileError } = await supabase.rpc('create_or_update_profile', {
      profile_id: userId,
      profile_first_name: userData.firstName,
      profile_last_name: userData.lastName,
      profile_job_title: userData.jobTitle,
      profile_school_name: userData.schoolName,
      profile_school_address: userData.schoolAddress,
    });

    if (profileError) {
      throw profileError;
    }
    
    // Send welcome email to the user
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          schoolName: userData.schoolName,
        },
      });
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the signup if the welcome email fails
    }
    
    // Send admin notification email
    try {
      await supabase.functions.invoke('send-admin-notification', {
        body: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          jobTitle: userData.jobTitle,
          schoolName: userData.schoolName,
          schoolAddress: userData.schoolAddress,
        },
      });
      console.log('Admin notification email sent successfully');
    } catch (adminEmailError) {
      console.error('Error sending admin notification email:', adminEmailError);
      // Don't fail the signup if the admin notification email fails
    }
    
    // Send user data to Hubspot
    try {
      await sendUserToHubspot(userData);
      console.log('User profile data sent to Hubspot');
    } catch (hubspotError) {
      console.error('Error sending user profile to Hubspot:', hubspotError);
      // Don't fail the signup if Hubspot integration fails
    }

    toast({
      title: 'Success',
      description: 'Profile updated successfully!'
    });
    
    return { error: null, success: true };
  } catch (error) {
    console.error('Error completing user profile:', error);
    return { error: error as Error, success: false };
  }
}

// Function to update user email
export async function updateUserEmail(newEmail: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      throw error;
    }

    toast({
      title: 'Success',
      description: 'Please check your new email inbox for a confirmation link.'
    });
    return { error: null, success: true };
  } catch (error) {
    console.error('Error updating email:', error);
    return { error: error as Error, success: false };
  }
}

// Function to update user details (name, etc.)
export async function updateUserDetails(userData: { firstName?: string; lastName?: string; }) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
      },
    });

    if (error) {
      throw error;
    }

    return { error: null, success: true };
  } catch (error) {
    console.error('Error updating user details:', error);
    return { error: error as Error, success: false };
  }
}
