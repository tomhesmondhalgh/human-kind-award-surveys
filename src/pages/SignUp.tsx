import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthForm from '../components/auth/AuthForm';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { SignUpFormData } from '../types/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token') || params.get('invitation');
    
    if (token) {
      console.log('📧 Invitation token detected:', token.slice(0, 8));
      setInvitationToken(token);
      fetchInvitationDetails(token);
    }
  }, [location.search]);

  const fetchInvitationDetails = async (token: string) => {
    setLoadingInvitation(true);
    try {
      console.log('🔍 Fetching invitation details via edge function');
      
      const { data, error } = await supabase.functions.invoke('get-invitation-details', {
        body: { token }
      });

      if (error) {
        console.error('❌ Error fetching invitation:', error);
        toast.error('Invalid invitation link');
        return;
      }

      if (!data) {
        console.warn('⚠️ Invitation not found');
        toast.error('Invitation not found');
        return;
      }

      console.log('✅ Valid invitation found');
      
      // Transform edge function response to match expected format
      const transformedData = {
        email: data.email,
        role: data.role,
        expires_at: data.expiresAt,
        organization_id: data.organizationId,
        organizations: {
          name: data.organizationName
        }
      };
      
      setInvitation(transformedData);
    } catch (error) {
      console.error('💥 Error fetching invitation:', error);
      toast.error('Failed to load invitation details');
    } finally {
      setLoadingInvitation(false);
    }
  };

  const compileCustomAddress = (data: SignUpFormData): string => {
    const addressParts = [
      data.customStreetAddress,
      data.customStreetAddress2,
      data.customCity,
      data.customCounty,
      data.customPostalCode,
      data.customCountry
    ].filter(part => part && part.trim() !== '');
    
    return addressParts.join(', ');
  };

  const handleSubmit = async (data: SignUpFormData) => {
    console.log('📝 Sign up form submitted');
    setIsLoading(true);

    try {
      // Store invitation token for post-email-confirmation
      if (invitationToken) {
        console.log('💾 Storing invitation token for post-confirmation');
        localStorage.setItem('pendingInvitationToken', invitationToken);
      }

      let schoolAddress = data.schoolAddress;
      
      if (!schoolAddress && data.customStreetAddress) {
        schoolAddress = compileCustomAddress(data);
      }

      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        schoolName: data.schoolName,
        schoolAddress: schoolAddress,
        organizationName: data.organizationName || data.schoolName,
        schoolURN: data.schoolURN,
        email: data.email
      };

      console.log('🚀 Calling signUp function');
      
      // Pass skipOrgCreation and invitation token if invitation exists
      const { error, success, user: newUser } = await signUp(
        data.email, 
        data.password, 
        userData, 
        !!invitation, // skipOrgCreation = true if invitation exists
        invitationToken || undefined // Pass the invitation token
      );

      if (!success || error) {
        console.error('❌ Sign up error:', error);
        
        if (error?.message === 'DUPLICATE_EMAIL') {
          toast.error('Email already registered', {
            description: 'This email is already registered. Please log in instead.'
          });
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        toast.error('Sign up failed', {
          description: error?.message || 'Please try again'
        });
        return;
      }

      console.log('✅ Sign up successful');
      
      // All users go to email confirmation page
      // The Login page will handle token verification and invitation acceptance
      navigate('/email-confirmation', { 
        state: { 
          email: data.email,
          userData,
          hasInvitation: !!invitation
        } 
      });

    } catch (error: any) {
      console.error('💥 Sign up error:', error);
      toast.error('Sign up failed', {
        description: error?.message || 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <MainLayout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invitation details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-container">
        <PageTitle 
          title="Create your account" 
          subtitle="Join thousands of educators improving staff wellbeing"
          alignment="center"
        />
        
        {invitation && (
          <Card className="max-w-2xl mx-auto mb-6 p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-1">
                  You've been invited to join {invitation.organizations?.name}
                </h3>
                <p className="text-sm text-blue-700">
                  Complete your registration below, and you'll automatically be added to the organisation as a {invitation.role}.
                </p>
              </div>
            </div>
          </Card>
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
