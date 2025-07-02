import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import SurveyForm, { SurveyFormData } from '../components/surveys/SurveyForm';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import SurveyLoading from '../components/survey-form/SurveyLoading';
import { sendUserToHubspot } from '../utils/auth';
import ArchiveSurveyDialog from '../components/surveys/ArchiveSurveyDialog';
import { validateEmails } from '../utils/survey/sendReminder';
import { OrganizationPermissionValidator } from '@/utils/organizationPermissions';

const SurveyEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [surveyData, setSurveyData] = useState<SurveyFormData | null>(null);
  const [customQuestionIds, setCustomQuestionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [savedSurveyId, setSavedSurveyId] = useState<string | null>(id || null);
  
  const isEditMode = !!id;
  const knownHubspotId = "31923701";
  
  useEffect(() => {
    if (!user) {
      setIsLoading(true);
      const checkUser = setTimeout(() => {
        if (!user) {
          toast.error("Authentication required", {
            description: "You must be logged in to create or edit a survey."
          });
          navigate('/login');
        }
        setIsLoading(false);
      }, 1000);

      return () => clearTimeout(checkUser);
    }
    
    if (isEditMode) {
      fetchSurvey(id);
    } else {
      setIsLoading(false);
    }
  }, [user, id, navigate, isEditMode]);

  const fetchSurvey = async (surveyId: string) => {
    try {
      console.log('Fetching survey with ID:', surveyId);
      
      const { data, error } = await supabase
        .from('survey_templates')
        .select('*')
        .eq('id', surveyId)
        .single();
      
      if (error) {
        console.error('Error fetching survey:', error);
        throw error;
      }
      
      if (!data) {
        toast.error("Survey not found");
        navigate('/surveys');
        return;
      }
      
      console.log('Fetched survey data:', data);
      
      // Determine distribution method based on whether emails is set
      const hasEmails = data.emails && data.emails.trim() !== '';
      const distributionMethod = hasEmails ? 'email' : 'link';
      
      console.log('Distribution method determined:', distributionMethod);
      console.log('Email data found:', data.emails);
      
      setSurveyData({
        name: data.name,
        date: new Date(data.date),
        closeDate: data.close_date ? new Date(data.close_date) : undefined,
        recipients: data.emails || '',
        status: data.status || 'Saved',
        distributionMethod: distributionMethod
      });
      
      const { data: linkData, error: linkError } = await supabase
        .from('survey_questions')
        .select('question_id')
        .eq('survey_id', surveyId);
        
      if (!linkError && linkData) {
        setCustomQuestionIds(linkData.map(item => item.question_id));
      }
      
    } catch (error) {
      console.error('Error fetching survey:', error);
      toast.error("Error loading survey", {
        description: "Could not load the survey data. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: SurveyFormData, selectedCustomQuestionIds: string[], action?: 'save' | 'preview' | 'send') => {
    try {
      setIsSubmitting(true);
      console.log('Survey data to be saved:', data);
      console.log('Custom question IDs:', selectedCustomQuestionIds);
      console.log('Action requested:', action);
      console.log('Current saved survey ID:', savedSurveyId);
      
      if (!user) {
        toast.error("Authentication required", {
          description: "You must be logged in to create a survey."
        });
        navigate('/login');
        return null;
      }

      if (!currentOrganization) {
        toast.error("No organisation selected", {
          description: "Please select an organisation to create surveys."
        });
        return null;
      }

      // Enhanced permission validation for survey creation/editing
      console.log('🔒 Validating survey creation permissions...');
      const permissionResult = await OrganizationPermissionValidator.validateOrganizationAccess(
        user.id, 
        currentOrganization.id, 
        'survey_create'
      );

      if (!permissionResult.hasPermission) {
        console.error('❌ Survey permission denied:', permissionResult.error);
        toast.error("Permission denied", {
          description: permissionResult.error || "You need editor permissions to create surveys."
        });
        setIsSubmitting(false);
        return null;
      }
      console.log('✅ Survey permissions validated successfully');

      // Validate emails if this is a send action and using email distribution
      if (action === 'send' && data.distributionMethod === 'email' && data.recipients) {
        const { validEmails, invalidEmails } = validateEmails(data.recipients);
        
        if (invalidEmails.length > 0) {
          toast.error(`Found ${invalidEmails.length} invalid email ${invalidEmails.length === 1 ? 'address' : 'addresses'}`, {
            description: `Invalid: ${invalidEmails.join(', ')}. Please correct these before sending.`
          });
          setIsSubmitting(false);
          return null;
        }
        
        if (validEmails.length === 0) {
          toast.error("No valid email addresses found", {
            description: "Please add valid email addresses separated by commas."
          });
          setIsSubmitting(false);
          return null;
        }
      }

      const surveyDate = new Date(data.date);
      const closeDate = data.closeDate ? new Date(data.closeDate) : null;
      
      // Determine the emails value based on the distribution method
      const emailsValue = data.distributionMethod === 'email' ? data.recipients : '';
      
      // Set status based on action
      let statusToSave = data.status || 'Saved';
      if (action === 'send') {
        statusToSave = 'Sent';
      }
      
      let newSurveyId = savedSurveyId;
      
      // If we already have a saved survey ID, OR we're in edit mode, update the existing survey
      if (savedSurveyId) {
        // Update existing survey
        console.log('Updating existing survey with ID:', savedSurveyId);
        console.log('Setting status to:', statusToSave);
        
        const { error } = await supabase
          .from('survey_templates')
          .update({
            name: data.name,
            date: surveyDate.toISOString(),
            close_date: closeDate ? closeDate.toISOString() : null,
            emails: emailsValue,
            status: statusToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', savedSurveyId);
        
        if (error) {
          console.error('Error updating survey:', error);
          if (error.message.includes('connection')) {
            throw new Error('Failed to connect to the server. Please check your connection and try again.');
          }
          throw error;
        }
        
        // Delete existing question links before adding new ones
        const { error: deleteError } = await supabase
          .from('survey_questions')
          .delete()
          .eq('survey_id', savedSurveyId);
          
        if (deleteError) {
          console.error('Error removing existing custom question links:', deleteError);
        }
      } else {
        // Only create a new survey if we don't have a saved ID yet
        console.log('Creating new survey with status:', statusToSave);
        
        const { data: savedSurvey, error } = await supabase
          .from('survey_templates')
          .insert({
            name: data.name,
            date: surveyDate.toISOString(),
            close_date: closeDate ? closeDate.toISOString() : null,
            organization_id: currentOrganization.id,
            emails: emailsValue,
            status: statusToSave
          })
          .select()
          .single();
        
        if (error) {
          console.error('Supabase error saving survey:', error);
          if (error.message.includes('connection')) {
            throw new Error('Failed to connect to the server. Please check your connection and try again.');
          }
          throw error;
        }
        
        console.log('Saved new survey:', savedSurvey);
        newSurveyId = savedSurvey.id;
        setSavedSurveyId(savedSurvey.id);
        
        // Add to Hubspot list for new surveys
        console.log('Fetching user profile data for Hubspot integration...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, job_title, school_name, school_address')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile data:', profileError);
        } else if (profileData && user.email) {
          console.log('Attempting to send user data to Hubspot list 5418...');
          try {
            const response = await sendUserToHubspot({
              email: user.email,
              firstName: profileData.first_name,
              lastName: profileData.last_name,
              jobTitle: profileData.job_title,
              schoolName: profileData.school_name,
              schoolAddress: profileData.school_address
            }, '5418', knownHubspotId);
            
            console.log('Hubspot API response:', response);
            console.log('User successfully added to Hubspot list 5418 after creating survey');
          } catch (hubspotError) {
            console.error('Failed to add user to Hubspot list:', hubspotError);
          }
        }
      }
      
      // Link custom questions
      if (selectedCustomQuestionIds.length > 0 && newSurveyId) {
        const surveyQuestionLinks = selectedCustomQuestionIds.map(questionId => ({
          survey_id: newSurveyId,
          question_id: questionId
        }));
        
        const { error: linkError } = await supabase
          .from('survey_questions')
          .insert(surveyQuestionLinks);
          
        if (linkError) {
          console.error('Error linking custom questions:', linkError);
        }
      }
      
      // Update local state with the saved data
      setSurveyData({
        ...data,
        recipients: emailsValue,
        status: statusToSave
      });
      
      // Based on the action, determine what to do next
      if (action === 'preview') {
        window.open(`/survey?id=${newSurveyId}&preview=true`, '_blank');
      } else if (action === 'send') {
        await handleSendEmails(newSurveyId!, data.distributionMethod, emailsValue);
        navigate('/surveys');
      } else if (action === 'save') {
        // Display success message
        toast.success("Survey saved successfully", {
          description: "Your changes have been saved."
        });
        navigate('/surveys');
      } else {
        // Default case, just show a success message
        const successMessage = isEditMode ? "Survey updated successfully" : "Survey created successfully!";
        const successDescription = isEditMode ? "Your changes have been saved." : "Your survey has been saved. You can now preview or send it.";
        
        toast.success(successMessage, {
          description: successDescription
        });
      }
      
      return newSurveyId;
      
    } catch (error) {
      console.error('Error saving survey:', error);
      const errorMessage = error instanceof Error ? error.message : "Please check your connection and try again.";
      toast.error("Failed to save survey", {
        description: errorMessage
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveChanges = async (data: SurveyFormData, selectedCustomQuestionIds: string[]) => {
    await handleSubmit(data, selectedCustomQuestionIds, 'save');
  };

  const handlePreviewSurvey = async (data: SurveyFormData, selectedCustomQuestionIds: string[]) => {
    await handleSubmit(data, selectedCustomQuestionIds, 'preview');
  };

  const handleSendSurvey = async (data: SurveyFormData, selectedCustomQuestionIds: string[]) => {
    await handleSubmit(data, selectedCustomQuestionIds, 'send');
  };
  
  const handleSendEmails = async (surveyId: string, distributionMethod: 'link' | 'email', emails: string) => {
    try {
      // For link distribution, we've already marked the survey as sent
      if (distributionMethod === 'link' || !emails || emails.trim() === '') {
        toast.success("Survey ready to share", {
          description: "Use the survey link to share with participants."
        });
        return;
      }
      
      // Validate emails before sending
      const { validEmails, invalidEmails } = validateEmails(emails);
      
      console.log('Email validation results:', { 
        totalEmails: emails.split(',').length,
        validCount: validEmails.length, 
        invalidCount: invalidEmails.length,
        validEmails: validEmails,
        invalidEmails: invalidEmails
      });
      
      if (invalidEmails.length > 0) {
        toast.error(`Found ${invalidEmails.length} invalid email ${invalidEmails.length === 1 ? 'address' : 'addresses'}`, {
          description: `Invalid: ${invalidEmails.join(', ')}. Please correct these before sending.`
        });
        return;
      }
      
      if (validEmails.length === 0) {
        toast.info("No valid email recipients found", {
          description: "Use the survey link to share with participants."
        });
        return;
      }
      
      const baseUrl = window.location.origin;
      const surveyUrl = `${baseUrl}/survey?id=${surveyId}`;
      
      console.log('Sending survey emails to:', validEmails);
      console.log('Survey URL:', surveyUrl);
      
      // Build request payload for edge function
      const payload = { 
        surveyId: surveyId,
        surveyName: surveyData?.name || "Wellbeing Survey",
        emails: validEmails,
        surveyUrl: surveyUrl,
        isReminder: false
      };
      
      console.log('Edge function payload:', payload);
      
      // Send emails
      const { data, error } = await supabase.functions.invoke('send-survey-email', {
        body: payload
      });
      
      if (error) {
        console.error('Error invoking send-survey-email function:', error);
        throw error;
      }
      
      console.log('Send survey email response:', data);
      
      toast.success("Survey sent successfully!", {
        description: `Sent to ${data?.count || validEmails.length} recipients.`
      });
    } catch (error) {
      console.error('Error sending survey emails:', error);
      toast.error("Failed to send survey emails", {
        description: "The survey has been saved and marked as sent, but there was an issue sending the emails."
      });
    }
  };

  const handleArchiveSurvey = async () => {
    if (!savedSurveyId) return;
    
    try {
      const { error } = await supabase
        .from('survey_templates')
        .update({
          status: 'Archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', savedSurveyId);
      
      if (error) {
        console.error('Error archiving survey:', error);
        throw error;
      }
      
      toast.success("Survey archived successfully", {
        description: "The survey has been moved to the archive."
      });
      
      navigate('/surveys');
    } catch (error) {
      console.error('Error archiving survey:', error);
      toast.error("Failed to archive survey", {
        description: "There was a problem archiving the survey. Please try again."
      });
    }
  };

  if (isLoading) {
    return <SurveyLoading />;
  }

  // Show error state if survey not found in edit mode
  if (isEditMode && !surveyData) {
    return (
      <MainLayout>
        <div className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <p className="text-red-500">Survey not found or you don't have permission to edit it.</p>
            <button 
              onClick={() => navigate('/surveys')}
              className="mt-4 px-4 py-2 bg-brand-blue text-white rounded hover:bg-blue-600"
            >
              Back to Surveys
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!currentOrganization) {
    return (
      <MainLayout>
        <div className="page-container">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <p className="text-gray-600 mb-4">Please select an organisation to create or edit surveys.</p>
            <button 
              onClick={() => navigate('/team')}
              className="px-4 py-2 bg-brandPurple-500 text-white rounded hover:bg-brandPurple-600"
            >
              Manage Organisations
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-container">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/surveys" onClick={(e) => { e.preventDefault(); navigate('/surveys'); }}>
                Surveys
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{isEditMode ? 'Edit Survey' : 'Create New Survey'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <PageTitle 
          title={isEditMode ? "Edit Survey" : "Create New Survey"} 
          subtitle={isEditMode ? "Make changes to your wellbeing survey" : "Set up a new wellbeing survey to send to your staff"}
        />
        
        <SurveyForm 
          initialData={surveyData || undefined} 
          onSubmit={handleSaveChanges}
          onPreviewSurvey={handlePreviewSurvey}
          onSendSurvey={handleSendSurvey}
          submitButtonText={isEditMode ? "Save Changes" : "Save"}
          isEdit={isEditMode}
          surveyId={savedSurveyId}
          isSubmitting={isSubmitting}
          initialCustomQuestionIds={customQuestionIds}
        />

        {isEditMode && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setIsArchiveDialogOpen(true)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Archive Survey
            </button>
          </div>
        )}

        <ArchiveSurveyDialog
          isOpen={isArchiveDialogOpen}
          onClose={() => setIsArchiveDialogOpen(false)}
          onConfirm={handleArchiveSurvey}
          surveyName={surveyData?.name || ""}
        />
      </div>
    </MainLayout>
  );
};

export default SurveyEditor;
