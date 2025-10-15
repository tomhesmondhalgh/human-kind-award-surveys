import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Award, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { getSectionProgressSummary } from '../utils/actionPlanUtils';
interface AccreditationSubmission {
  id: string;
  status: 'not_submitted' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  approved_at?: string;
  next_submission_due?: string;
  reviewer_notes?: string;
}
const Accredit = () => {
  const {
    user
  } = useAuth();
  const {
    currentOrganization
  } = useOrganization();
  const navigate = useNavigate();
  const {
    hasAccess,
    isLoading: isSubscriptionLoading
  } = useSubscription();
  const [hasProgressAccess, setHasProgressAccess] = useState<boolean | null>(null);
  const [submission, setSubmission] = useState<AccreditationSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readinessData, setReadinessData] = useState<any>(null);
  useEffect(() => {
    async function checkAccess() {
      try {
        if (hasAccess) {
          const canAccess = await hasAccess('progress');
          setHasProgressAccess(canAccess);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasProgressAccess(false);
      }
    }
    if (!isSubscriptionLoading) {
      checkAccess();
    }
  }, [hasAccess, isSubscriptionLoading]);
  useEffect(() => {
    if (user && currentOrganization && hasProgressAccess) {
      fetchSubmissionData();
      fetchReadinessData();
    } else if (hasProgressAccess === false) {
      setIsLoading(false);
    }
  }, [user, currentOrganization, hasProgressAccess]);
  const fetchSubmissionData = async () => {
    if (!user || !currentOrganization) return;
    try {
      const {
        data,
        error
      } = await supabase.from('action_plan_submissions').select('*').eq('organization_id', currentOrganization.id).order('submitted_at', {
        ascending: false
      }).limit(1).single();
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned"
        console.error('Error fetching submission:', error);
        toast.error('Failed to load accreditation data');
        return;
      }
      setSubmission(data);
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchReadinessData = async () => {
    if (!currentOrganization) return;
    try {
      const result = await getSectionProgressSummary(currentOrganization.id);
      if (result.success && result.data) {
        setReadinessData(result.data);
      }
    } catch (error) {
      console.error('Error fetching readiness data:', error);
    }
  };
  const checkSubmissionReadiness = () => {
    if (!readinessData) return false;
    return readinessData.every((section: any) => section.notStartedCount === 0 && section.inProgressCount === 0 && section.blockedCount === 0);
  };
  const handleSubmission = async () => {
    if (!user || !currentOrganization || !checkSubmissionReadiness()) return;
    setIsSubmitting(true);
    try {
      const {
        data: submissionData,
        error
      } = await supabase.from('action_plan_submissions').insert({
        user_id: user.id,
        organization_id: currentOrganization.id,
        status: 'submitted',
        submission_data: readinessData
      }).select('id').single();
      if (error) {
        console.error('Error submitting for accreditation:', error);
        toast.error('Failed to submit for accreditation');
        return;
      }
      console.log('Accreditation submission created with ID:', submissionData.id);

      // Get user profile for notification
      const {
        data: profile
      } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();

      // Send notification to admins (don't block submission if this fails)
      try {
        console.log('Sending admin notification...');
        const notificationResponse = await supabase.functions.invoke('send-accreditation-notification', {
          body: {
            submissionId: submissionData.id,
            submitterName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
            schoolName: currentOrganization.name,
            submissionData: readinessData
          }
        });
        if (notificationResponse.error) {
          console.error('Error sending admin notification:', notificationResponse.error);
        } else {
          console.log('Admin notification sent successfully');
        }
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
        // Continue anyway - don't block the submission
      }
      toast.success('Successfully submitted for accreditation');
      fetchSubmissionData();
    } catch (error) {
      console.error('Error submitting for accreditation:', error);
      toast.error('Failed to submit for accreditation');
    } finally {
      setIsSubmitting(false);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return null;
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  const isSubscriptionChecking = isSubscriptionLoading || hasProgressAccess === null;
  if (isSubscriptionChecking || isLoading) {
    return <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="mb-4">Loading accreditation data...</div>
            </div>
          </div>
        </div>
      </MainLayout>;
  }
  if (!hasProgressAccess) {
    return <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <PageTitle title="Action Plan Accreditation" subtitle="Get your wellbeing action plan formally accredited" alignment="left" />
          
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            
            <h2 className="text-2xl font-bold mb-4">Upgrade to Access Accreditation</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Action plan accreditation is available with Progress and Premium plans. 
              Get your wellbeing framework formally recognised and certified.
            </p>
            
            <Button onClick={() => navigate('/upgrade')} size="lg" className="px-8">
              View Upgrade Options <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </MainLayout>;
  }
  if (!currentOrganization) {
    return <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <PageTitle title="Action Plan Accreditation" subtitle="Get your wellbeing action plan formally accredited" alignment="left" />
          
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">No Organization Selected</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Please select an organization to view accreditation options.
            </p>
          </div>
        </div>
      </MainLayout>;
  }
  const isReady = checkSubmissionReadiness();
  const hasSubmission = submission && submission.status !== 'not_submitted';
  return <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageTitle title="Action Plan Accreditation" subtitle={`Get ${currentOrganization.name}'s wellbeing action plan formally accredited`} alignment="left" />

        <div className="space-y-6 mt-8">
          {/* Current Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Accreditation Status
              </CardTitle>
              <CardDescription>
                Your current accreditation status and submission details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasSubmission ? <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(submission.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Submitted</span>
                      <p className="font-medium">{formatDate(submission.submitted_at)}</p>
                    </div>
                    
                    {submission.approved_at && <div>
                        <span className="text-sm text-muted-foreground">Approved</span>
                        <p className="font-medium">{formatDate(submission.approved_at)}</p>
                      </div>}
                    
                    {submission.next_submission_due && <div>
                        <span className="text-sm text-muted-foreground">Next Submission Due</span>
                        <p className="font-medium">{formatDate(submission.next_submission_due)}</p>
                      </div>}
                  </div>
                  
                  {submission.reviewer_notes && <div>
                      <span className="text-sm text-muted-foreground">Reviewer Notes</span>
                      <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{submission.reviewer_notes}</p>
                    </div>}
                  
                  {submission.status === 'approved' && <Button variant="outline" className="w-full sm:w-auto">
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>}
                </div> : <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Submission Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Complete your action plan to submit for accreditation
                  </p>
                </div>}
            </CardContent>
          </Card>

          {/* Submission Readiness Card */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Readiness</CardTitle>
              <CardDescription>
                All framework elements must be "Completed" or "Not Applicable" to submit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {readinessData ? <div className="space-y-4">
                  {readinessData.map((section: any) => {
                const sectionReady = section.notStartedCount === 0 && section.inProgressCount === 0 && section.blockedCount === 0;
                return <div key={section.key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-medium">{section.title}</span>
                        <div className="flex items-center gap-2">
                          {sectionReady ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className="text-sm text-red-600">
                              {section.notStartedCount + section.inProgressCount + section.blockedCount} items pending
                            </div>}
                        </div>
                      </div>;
              })}
                  
                  <div className="pt-4 border-t">
                    {isReady ? <div className="flex items-center gap-2 text-green-600 mb-4">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Ready for submission</span>
                      </div> : <div className="flex items-center gap-2 text-amber-600 mb-4">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Complete outstanding items to submit</span>
                      </div>}
                    
                    {!hasSubmission && <Button onClick={handleSubmission} disabled={!isReady || isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? 'Submitting...' : 'Submit for Accreditation'}
                      </Button>}
                    
                    {!isReady && <Button variant="outline" onClick={() => navigate('/improve')} className="w-full sm:w-auto ml-0 sm:ml-2 mt-2 sm:mt-0">
                        Complete Action Plan
                      </Button>}
                  </div>
                </div> : <div className="text-center py-4">
                  Loading readiness check...
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>;
};
export default Accredit;