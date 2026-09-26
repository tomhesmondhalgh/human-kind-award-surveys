
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to send-survey-email function');
    
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    let requestData;
    try {
      requestData = JSON.parse(requestBody);
      console.log('Parsed request data:', requestData);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { surveyId, surveyName, emails, surveyUrl, isReminder } = requestData;
    
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
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY environment variable');
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    
    console.log('Initializing Resend with API key');
    const resend = new Resend(resendApiKey);
    
    const results = {
      successful: [],
      failed: [],
    };
    
    console.log(`Starting to send emails to ${emails.length} recipients`);
    for (const email of emails) {
      try {
        console.log(`Sending email to: ${email}`);
        
        const subject = isReminder 
          ? `Reminder: Please complete the "${surveyName}" wellbeing survey`
          : `You're invited to complete the "${surveyName}" wellbeing survey`;

        const content = `
          <p>${isReminder 
            ? `This is a friendly reminder to complete the "${surveyName}" wellbeing survey.` 
            : `You have been invited to participate in the "${surveyName}" wellbeing survey.`}</p>
          
          <p>Your feedback is important to help improve the wellbeing of staff at your school. The survey is anonymous and will only take a few minutes to complete.</p>
        `;

        const html = createEmailTemplate({
          title: `${isReminder ? 'Reminder: ' : ''}Wellbeing Survey Invitation`,
          preheader: `Complete the ${surveyName} survey - your feedback matters`,
          content,
          buttonText: "Complete Survey",
          buttonUrl: surveyUrl,
        });
        
        const response = await resend.emails.send({
          from: "Human Kind <contact@humankindaward.com>",
          to: email,
          subject: subject,
          html: html,
        });
        
        console.log(`Email sent successfully to ${email}, response:`, response);
        results.successful.push(email);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
        results.failed.push({ email, error: emailError.message });
      }
    }
    
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
};

serve(handler);
