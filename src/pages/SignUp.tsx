
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthForm from '../components/auth/AuthForm';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase/client';
import { SignUpFormData } from '../types/auth';

const SIGNUP_VERSION = 'main_signup_component_v1';

const SignUp = () => {
  console.log(`Rendering SignUp component (${SIGNUP_VERSION})`);
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, completeUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    console.log('SignUp component mounted with:');
    console.log('- Current URL:', window.location.href);
    console.log('- Environment:', import.meta.env.MODE);
    console.log('- Route location:', location);
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('invitation');
    
    if (token) {
      setInvitationToken(token);
      fetchInvitationDetails(token);
    }
    
    console.log('SignUp component mounted, pathname:', location.pathname);
  }, [location.search, location.pathname]);

  const fetchInvitationDetails = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, organizations:organization_id(school_name)')
        .eq('token', token)
        .single();

      if (error) throw error;
      if (data) {
        console.log('Invitation details fetched:', data);
        setInvitation(data);
      }
    } catch (err) {
      console.error('Error fetching invitation:', err);
    }
  };

  const handleSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    console.log('Form submitted with data:', data);
    
    try {
      const { error: signUpError, success: signUpSuccess, user } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
      });
      
      if (!signUpSuccess) {
        throw signUpError || new Error('Failed to create account');
      }
      
      // Store user data for profile completion
      if (user) {
        try {
          // Fix: Call the RPC function directly with correct parameter order
          const { error: profileError } = await supabase.rpc('create_or_update_profile', {
            profile_id: user.id,
            profile_first_name: data.firstName,
            profile_last_name: data.lastName,
            profile_job_title: data.jobTitle,
            profile_school_name: data.schoolName,
            profile_school_address: data.schoolAddress || compileCustomAddress(data),
          });
          
          if (profileError) {
            console.error('Error updating profile directly:', profileError);
            // Continue with the flow even if profile update fails
          }
        } catch (directProfileError) {
          console.error('Exception during direct profile update:', directProfileError);
          // Continue with the flow even if profile update fails
        }
      }
      
      // Redirect to email confirmation page instead of automatically logging in
      if (invitationToken) {
        // For invitations, we'll still redirect to the invitation flow
        // but let the user know they need to confirm their email first
        toast.info('Please check your email to confirm your account before accessing your invitation', {
          duration: 6000
        });
        navigate(`/email-confirmation`, { state: { email: data.email } });
      } else {
        // For regular sign ups, redirect to the email confirmation page
        console.log('Signup successful, redirecting to email confirmation page');
        navigate('/email-confirmation', { state: { email: data.email } });
      }
      
      toast.success('Account created successfully!', {
        description: 'Please check your email inbox to confirm your account'
      });
    } catch (err: any) {
      console.error('Signup error details:', err);
      toast.error('Failed to create account', {
        description: err.message || 'Please check your information and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const compileCustomAddress = (data: SignUpFormData) => {
    const addressParts = [
      data.customStreetAddress,
      data.customStreetAddress2,
      data.customCity,
      data.customCounty,
      data.customPostalCode,
      data.customCountry,
    ].filter(Boolean);
    
    return addressParts.join(', ');
  };

  return (
    <MainLayout>
      <div className="page-container">
        <PageTitle 
          title={invitation ? `Join ${invitation.organizations.school_name}` : "Create your account"} 
          subtitle={invitation 
            ? `Complete your account to accept the invitation as ${invitation.role.replace('_', ' ')}`
            : "Sign up to create wellbeing surveys for your staff"
          }
        />
        {invitation && (
          <div className="mb-4 text-sm text-brandPurple-100 rounded-lg p-3 bg-brandPurple-50 border border-brandPurple-100">
            <p>You've been invited to join an organisation. Create your account to continue.</p>
          </div>
        )}
        <AuthForm 
          mode="signup" 
          onSubmit={handleSubmit} 
          isLoading={isLoading}
          invitationData={invitation}
        />
      </div>
    </MainLayout>
  );
};

export default SignUp;
