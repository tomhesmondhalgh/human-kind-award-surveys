
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
    const { surveyId, surveyName, creator, analysisUrl } = await req.json();
    
    if (!surveyId || !surveyName || !creator?.email) {
      throw new Error("Missing required fields: surveyId, surveyName, and creator email are required");
    }
    
    console.log(`Sending closure notification for survey: ${surveyName} (${surveyId})`);
    console.log(`To creator: ${creator.email}`);
    console.log(`Analysis URL: ${analysisUrl}`);
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    
    const resend = new Resend(resendApiKey);
    
    const creatorName = creator.firstName && creator.lastName
      ? `${creator.firstName} ${creator.lastName}`
      : creator.email.split('@')[0];

    const content = `
      <p>Your wellbeing survey "${surveyName}" has now closed. Thank you for gathering valuable feedback from your staff.</p>
      
      <p>You can now view the complete analysis and insights from the survey responses.</p>
      
      <p>These insights will help you understand the wellbeing of your staff and identify areas where support may be needed.</p>
    `;

    const html = createEmailTemplate({
      title: "Survey Closed",
      preheader: `Your ${surveyName} survey has closed - view the results now`,
      recipientName: creatorName,
      content,
      buttonText: "View Survey Results",
      buttonUrl: analysisUrl,
    });
    
    const response = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: creator.email,
      subject: `Your survey "${surveyName}" has now closed - see the results...`,
      html: html,
    });
    
    console.log("Email sent successfully:", response);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Closure notification sent to ${creator.email}`,
        data: response,
      }),
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
