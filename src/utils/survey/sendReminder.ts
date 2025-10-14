
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

/**
 * Validates an email address format
 * @param email The email address to validate
 * @returns Boolean indicating if the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Parses and validates a list of comma-separated emails
 * @param emailString A comma-separated string of emails
 * @returns An object with valid emails array and invalid emails array
 */
export const validateEmails = (emailString: string): { 
  validEmails: string[], 
  invalidEmails: string[] 
} => {
  if (!emailString || emailString.trim() === '') {
    return { validEmails: [], invalidEmails: [] };
  }
  
  const emails = emailString
    .split(',')
    .map(email => email.trim())
    .filter(email => email !== '');
  
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  
  emails.forEach(email => {
    if (isValidEmail(email)) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  });
  
  return { validEmails, invalidEmails };
};

/**
 * Sends a reminder email to all recipients for a specific survey
 * @param surveyId The ID of the survey to send reminders for
 * @returns A promise that resolves when the reminder has been sent
 */
export const sendSurveyReminder = async (surveyId: string): Promise<boolean> => {
  try {
    console.log('Sending reminder for survey:', surveyId);
    
    // Get survey details including recipients
    const { data: survey, error: surveyError } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', surveyId)
      .maybeSingle();
      
    if (surveyError) {
      console.error('Error fetching survey for reminder:', surveyError);
      throw surveyError;
    }
    
    if (!survey) {
      toast.error("Survey not found");
      return false;
    }
    
    // Check if there are email addresses to send reminders to
    if (!survey.emails || survey.emails.trim() === '') {
      toast.error("No email addresses found for this survey", {
        description: "Add email addresses in the survey settings to send reminders."
      });
      return false;
    }
    
    // Validate emails before sending
    const { validEmails, invalidEmails } = validateEmails(survey.emails);
    
    if (validEmails.length === 0) {
      toast.error("No valid email addresses found", {
        description: "Please check the email addresses in the survey settings."
      });
      return false;
    }
    
    if (invalidEmails.length > 0) {
      toast.error(`Found ${invalidEmails.length} invalid email ${invalidEmails.length === 1 ? 'address' : 'addresses'}`, {
        description: `Invalid: ${invalidEmails.join(', ')}. Please correct these before sending.`
      });
      return false;
    }
    
    const baseUrl = window.location.origin;
    const surveyUrl = `${baseUrl}/survey/${surveyId}`;
    
    // Call the email function
    const { data, error } = await supabase.functions.invoke('send-survey-email', {
      body: {
        surveyId: surveyId,
        surveyName: survey.name,
        emails: validEmails,
        surveyUrl: surveyUrl,
        isReminder: true
      }
    });
    
    if (error) {
      console.error('Error sending reminder emails:', error);
      throw error;
    }
    
    console.log('Reminder sent successfully:', data);
    return true;
    
  } catch (error) {
    console.error('Failed to send reminder:', error);
    toast.error("Failed to send reminder", {
      description: "There was a problem sending the reminder. Please try again."
    });
    return false;
  }
};
