
// Using a more recent version of the Deno standard library
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Using a newer version of Resend that's compatible with Deno
import { Resend } from "https://esm.sh/resend@2.0.0";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to send-survey-email function');
    
    // Get the request body
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    // Parse the JSON body
    let requestData;
    try {
      requestData = JSON.parse(requestBody);
      console.log('Parsed request data:', requestData);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { surveyId, surveyName, emails, surveyUrl, isReminder } = requestData;
    
    // Validate required fields
    if (!surveyId || !surveyName || !emails || !surveyUrl) {
      console.error('Missing required fields:', { surveyId, surveyName, emails: Array.isArray(emails) ? emails.length : 'not array', surveyUrl });
      throw new Error('Missing required fields in request');
    }
    
    console.log(`Processing email request for survey: ${surveyName} (${surveyId})`);
    console.log(`Recipients: ${Array.isArray(emails) ? emails.join(', ') : 'Invalid emails format - not an array'}`);
    console.log(`Survey URL: ${surveyUrl}`);
    console.log(`Is reminder: ${isReminder}`);
    
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error('No valid email addresses provided');
    }
    
    // Initialize Resend with API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY environment variable');
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    
    console.log('Initializing Resend with API key');
    const resend = new Resend(resendApiKey);
    
    // Track successful and failed emails
    const results = {
      successful: [],
      failed: [],
    };
    
    // Send individual emails to each recipient
    console.log(`Starting to send emails to ${emails.length} recipients`);
    for (const email of emails) {
      try {
        console.log(`Sending email to: ${email}`);
        const subject = isReminder 
          ? `Reminder: Please complete the "${surveyName}" wellbeing survey`
          : `You're invited to complete the "${surveyName}" wellbeing survey`;
        
        // Updated: Use the new sender format
        const response = await resend.emails.send({
          from: "Human Kind <contact@humankindaward.com>",
          to: email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">${isReminder ? 'Reminder: ' : ''}Wellbeing Survey Invitation</h1>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                ${isReminder 
                  ? `This is a friendly reminder to complete the "${surveyName}" wellbeing survey.` 
                  : `You have been invited to participate in the "${surveyName}" wellbeing survey.`}
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Your feedback is important to help improve the wellbeing of staff at your school.
                The survey is anonymous and will only take a few minutes to complete.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${surveyUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Complete Survey
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 32px;">
                If the button above doesn't work, copy and paste this link into your browser: 
                <a href="${surveyUrl}" style="color: #3b82f6; text-decoration: underline;">${surveyUrl}</a>
              </p>
            </div>
          `,
        });
        
        console.log(`Email sent successfully to ${email}, response:`, response);
        results.successful.push(email);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
        results.failed.push({ email, error: emailError.message });
      }
    }
    
    // Prepare response data
    const responseData = {
      success: true,
      message: `Processed ${emails.length} emails`,
      count: results.successful.length,
      results: results,
    };
    
    console.log('Email sending complete, response:', responseData);
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
