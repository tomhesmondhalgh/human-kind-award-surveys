
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailAnalysisRequest {
  to: string;
  subject: string;
  surveyId: string;
  surveyName: string;
  htmlContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received email request");
    
    const { to, subject, htmlContent, surveyId, surveyName }: EmailAnalysisRequest = await req.json();
    
    if (!to || !htmlContent) {
      throw new Error("Missing required fields");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Invalid email address");
    }

    console.log(`Sending analysis email to ${to} for survey ${surveyName}`);

    const content = `
      <p>Please find attached your survey analysis report for "${surveyName}".</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
        ${htmlContent}
      </div>
      
      <p>This analysis provides insights into the responses collected from your wellbeing survey. Use these findings to better understand and support staff wellbeing in your organisation.</p>
    `;

    const html = createEmailTemplate({
      title: "Survey Analysis Report",
      preheader: `Analysis report for ${surveyName} survey`,
      content,
      footerText: "Survey Analysis Team"
    });

    const emailResponse = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: [to],
      subject: subject || `Survey Analysis Report: ${surveyName}`,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-analysis-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
