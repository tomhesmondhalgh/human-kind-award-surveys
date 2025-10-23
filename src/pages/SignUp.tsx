import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthForm from '../components/auth/AuthForm';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/services/toastService';
import { supabase } from '@/integrations/supabase/client';
import { SignUpFormData } from '../types/auth';

const SIGNUP_VERSION = 'main_signup_component_v1.2';

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
    console.log('SignUp: Component mounted, checking for invitation token...');
    
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token') || params.get('invitation');
    
    console.log('SignUp: Token parameter from URL:', tokenParam);
    
    if (tokenParam) {
      console.log('SignUp: Setting invitation token:', tokenParam);
      setInvitationToken(tokenParam);
      fetchInvitationDetails(tokenParam);
    }
    
    console.log('SignUp component mounted, pathname:', location.pathname);
  }, [location.search, location.pathname]);

  const fetchInvitationDetails = async (token: string) => {
    try {
      console.log('SignUp: Fetching invitation details for token:', token);
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*, organizations(id, name)')
        .eq('token', token)
        .is('accepted_at', null)
        .single();
      
      if (error) {
        console.error('SignUp: Error fetching invitation:', error);
        toast.error('Invalid invitation link');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        console.log('SignUp: Invitation has expired');
        toast.error('This invitation has expired');
        return;
      }
      
      console.log('SignUp: Invitation details fetched:', data);
      setInvitation(data);
    } catch (err) {
      console.error('SignUp: Error fetching invitation:', err);
      toast.error('Error loading invitation details');
    }
  };

  const handleSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    console.log('Form submitted with data:', data);
    
    try {
      // Ensure all necessary data is included
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        jobTitle: data.jobTitle || '',
        schoolName: data.schoolName || '',
        schoolAddress: data.schoolAddress || compileCustomAddress(data),
      };
      
      console.log('Signup data being sent:', userData);
      
      const { error: signUpError, success: signUpSuccess, user } = await signUp(data.email, data.password, userData);
      
      if (!signUpSuccess) {
        throw signUpError || new Error('Failed to create account');
      }

      console.log('SignUp: Account created successfully, user:', user?.id);
      
      // If there's an invitation, try to auto-accept it
      if (invitationToken && invitation && user) {
        try {
          console.log('SignUp: Attempting to auto-accept invitation');
          
          // Check if email matches
          if (data.email.toLowerCase() === invitation.email.toLowerCase()) {
            console.log('SignUp: Email matches, creating organization membership');
            
            // Create organization membership
            const { error: membershipError } = await supabase
              .from('organization_memberships')
              .insert({
                user_id: user.id,
                organization_id: invitation.organization_id,
                role: invitation.role,
                is_primary: false
              });
            
            if (membershipError) {
              console.error('SignUp: Error creating membership:', membershipError);
              throw membershipError;
            }
            
            // Mark invitation as accepted
            const { error: invitationError } = await supabase
              .from('organization_invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', invitation.id);
            
            if (invitationError) {
              console.error('SignUp: Error marking invitation as accepted:', invitationError);
            }
            
            console.log('SignUp: Successfully auto-accepted invitation');
            toast.success(`Account created! Welcome to ${invitation.organizations?.name}!`);
            
            // Redirect to team page
            navigate('/team');
            return;
          } else {
            console.log('SignUp: Email does not match invitation email');
            toast.warning('Account created, but invitation was for a different email address. Please use the invitation link again to join the organisation.');
          }
        } catch (err) {
          console.error('SignUp: Error auto-accepting invitation:', err);
          toast.warning('Account created but couldn\'t automatically accept invitation. Please use the invitation link again.');
        }
      }
      
      // Standard signup flow (no invitation or auto-accept failed)
      console.log('Signup successful, redirecting to email confirmation page');
      navigate('/email-confirmation', { 
        state: { 
          email: data.email,
          userData: userData
        } 
      });
      
      toast.success('Account created successfully!');
    } catch (err: any) {
      console.error('Signup error details:', err);
      
      // Provide specific error messages based on error type
      if (err.message === 'DUPLICATE_EMAIL') {
        toast.error({
          title: 'Account already exists',
          description: 'An account with this email address already exists. Please log in or reset your password if you\'ve forgotten it.',
          duration: 6000 // Longer duration for actionable message
        });
      } else if (err.message?.includes('organization with this name already exists')) {
        toast.error({
          title: 'Organization name already exists',
          description: 'An organization with this name already exists. Please use a different name or contact support if you believe this is your organization.',
          duration: 6000
        });
      } else if (err.message?.includes('Failed to set up organization')) {
        toast.error({
          title: 'Organization setup failed',
          description: 'We couldn\'t set up your organization. Please try again or contact support if the problem persists.',
          duration: 6000
        });
      } else if (err.message?.toLowerCase().includes('password')) {
        toast.error({
          title: 'Invalid password',
          description: 'Password must be at least 6 characters long.',
          duration: 5000
        });
      } else if (err.message?.toLowerCase().includes('email') && 
                 err.message?.toLowerCase().includes('invalid')) {
        toast.error({
          title: 'Invalid email address',
          description: 'Please enter a valid email address.',
          duration: 5000
        });
      } else {
        // Generic fallback for unexpected errors
        toast.error({
          title: 'Failed to create account',
          description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
          duration: 5000
        });
      }
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
          title={invitation ? "Accept Invitation" : "Create Your Account"}
          subtitle={invitation ? `Join ${invitation.organizations?.name}` : "Get started with staff wellbeing surveys"}
        />
        
        {invitation && (
          <div className="max-w-2xl mx-auto mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              You've been invited to join <strong>{invitation.organizations?.name}</strong> as a <strong className="capitalize">{invitation.role}</strong>.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Complete your registration with {invitation.email} to accept the invitation.
            </p>
          </div>
        )}
        
        <AuthForm 
          mode="signup" 
          onSubmit={handleSubmit} 
          isLoading={isLoading}
          invitationData={invitation}
          initialEmail={invitation?.email}
        />
      </div>
    </MainLayout>
  );
};

export default SignUp;
