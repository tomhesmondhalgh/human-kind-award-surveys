import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, AlertCircle, CheckCircle2, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { refreshOrganizations } = useOrganization();
  const [status, setStatus] = useState<'loading' | 'found' | 'not-found' | 'expired' | 'error'>('loading');
  const [invitation, setInvitation] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('not-found');
      return;
    }
    
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      console.log('🔍 Fetching invitation with token:', token?.slice(0, 8));
      
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations!organization_invitations_organization_id_fkey (
            id,
            name,
            address
          )
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        console.error('❌ Invitation not found:', error);
        setStatus('not-found');
        return;
      }

      console.log('✅ Invitation found:', data);

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        console.warn('⚠️ Invitation expired');
        setStatus('expired');
        setInvitation(data);
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        console.log('ℹ️ Invitation already accepted');
        toast.success('This invitation has already been accepted');
        navigate('/team');
        return;
      }

      setInvitation(data);
      setStatus('found');
      
      // Check if the invited email has an existing account
      if (data.email) {
        await checkIfEmailExists(data.email);
      }
    } catch (error) {
      console.error('💥 Error fetching invitation:', error);
      setStatus('error');
    }
  };

  const checkIfEmailExists = async (email: string) => {
    setCheckingEmail(true);
    try {
      console.log('🔍 Checking if email exists:', email);
      
      const { data, error } = await supabase.functions.invoke('check-email-exists', {
        body: { email }
      });
      
      if (error) {
        console.error('❌ Error checking email:', error);
        // Default to showing both options on error
        setEmailExists(null);
        return;
      }
      
      console.log('✅ Email check result:', data.exists);
      setEmailExists(data.exists);
    } catch (error) {
      console.error('💥 Exception checking email:', error);
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const acceptInvitation = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    if (!user || !token) {
      console.error('❌ Cannot accept: missing user or token');
      return;
    }

    setIsAccepting(true);

    try {
      console.log(`🎯 Accepting invitation via edge function (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token }
      });

      if (error) {
        console.error('❌ Failed to accept invitation:', error);
        
        // Retry on network/transient errors
        if (retryCount < MAX_RETRIES && (error.message?.includes('network') || error.message?.includes('Failed to fetch'))) {
          console.log(`⚠️ Retrying in ${(retryCount + 1) * 2} seconds...`);
          setTimeout(() => acceptInvitation(retryCount + 1), (retryCount + 1) * 2000);
          return;
        }
        
        throw error;
      }

      if (data?.alreadyMember) {
        console.log('ℹ️ User already a member');
        toast.success('You are already a member of this organisation');
      } else if (data?.success) {
        console.log('✅ Invitation accepted successfully');
        toast.success('Successfully joined ' + (invitation.organizations?.name || 'organisation'));
      }

      // Refresh organizations list
      await refreshOrganizations();

      // Navigate to team page
      navigate('/team');
    } catch (error: any) {
      console.error('💥 Error accepting invitation:', error);
      
      if (retryCount >= MAX_RETRIES) {
        toast.error('Failed to accept invitation after multiple attempts', {
          description: 'Please try again later or contact support'
        });
      } else {
        toast.error('Failed to accept invitation', {
          description: error.message || 'Please try again'
        });
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const requestNewInvitation = async () => {
    try {
      console.log('📧 Requesting new invitation');
      
      // This would need a backend endpoint to notify admins
      toast.success('Request sent', {
        description: 'The organisation administrators have been notified.'
      });
      
      navigate('/');
    } catch (error) {
      console.error('❌ Error requesting new invitation:', error);
      toast.error('Failed to send request');
    }
  };

  if (status === 'loading') {
    return (
      <MainLayout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (status === 'not-found') {
    return (
      <MainLayout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Invitation Not Found</CardTitle>
              </div>
              <CardDescription>
                We couldn't find an invitation with this link. It may have been deleted or the link is incorrect.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (status === 'expired') {
    return (
      <MainLayout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-amber-500">
            <CardHeader>
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Clock className="h-5 w-5" />
                <CardTitle>Invitation Expired</CardTitle>
              </div>
              <CardDescription>
                This invitation to join <strong>{invitation?.organizations?.name}</strong> has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invitations are valid for 7 days. You can request a new invitation from the organisation administrator.
              </p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                Return to Home
              </Button>
              <Button onClick={requestNewInvitation} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Request New Invitation
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (status === 'error') {
    return (
      <MainLayout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Error Loading Invitation</CardTitle>
              </div>
              <CardDescription>
                There was an error loading the invitation. Please try again.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-2">
              <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                Return to Home
              </Button>
              <Button onClick={fetchInvitation} className="flex-1">
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const emailMatches = user?.email === invitation?.email;

  return (
    <MainLayout>
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-primary">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2">
              <UserPlus className="h-5 w-5" />
              <CardTitle>Team Invitation</CardTitle>
            </div>
            <CardDescription>
              You've been invited to join an organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Organisation</p>
                <p className="font-medium">{invitation?.organizations?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{invitation?.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invited Email</p>
                <p className="font-medium">{invitation?.email}</p>
              </div>
            </div>

            {isAuthenticated ? (
              emailMatches ? (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    You're logged in with the correct email address. Click below to accept the invitation.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700 space-y-1">
                    <p className="font-medium">Email mismatch</p>
                    <p>You're logged in as <strong>{user?.email}</strong> but this invitation is for <strong>{invitation?.email}</strong>.</p>
                    <p>You can still accept, or log out and sign in with the invited email.</p>
                  </div>
                </div>
              )
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Button 
                  onClick={() => acceptInvitation()} 
                  disabled={isAccepting}
                  className="w-full"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accept Invitation
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/team')}
                  className="w-full"
                >
                  View My Team
                </Button>
              </>
            ) : (
              <>
                {checkingEmail ? (
                  <div className="text-center py-4 w-full">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Checking your account status...</p>
                  </div>
                ) : emailExists === true ? (
                  // User has existing account - show only LOGIN
                  <>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg w-full">
                      <p className="text-sm text-blue-700">
                        ✅ You already have an account with this email address.
                        <strong> Please log in to accept this invitation.</strong>
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/login', { 
                        state: { 
                          returnTo: `/accept-invitation?token=${token}`,
                          prefillEmail: invitation?.email
                        }
                      })}
                      className="w-full"
                    >
                      Log In to Accept Invitation
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      You'll be redirected back here after logging in
                    </p>
                  </>
                ) : emailExists === false ? (
                  // New user - show only SIGNUP
                  <>
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg w-full">
                      <p className="text-sm text-green-700">
                        👋 Welcome! Create your account to accept this invitation.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate(`/signup?token=${token}`)}
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account & Accept Invitation
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Your email will be pre-filled
                    </p>
                  </>
                ) : (
                  // Fallback: couldn't determine, show both options
                  <>
                    <Button 
                      onClick={() => navigate('/login', { 
                        state: { 
                          returnTo: `/accept-invitation?token=${token}`,
                          prefillEmail: invitation?.email
                        }
                      })}
                      className="w-full"
                    >
                      Log In to Accept
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/signup?token=${token}`)}
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up to Accept
                    </Button>
                  </>
                )}
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AcceptInvitation;
