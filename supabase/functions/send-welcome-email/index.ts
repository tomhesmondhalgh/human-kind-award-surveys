
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailData {
  email: string;
  firstName: string;
  lastName: string;
  schoolName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, schoolName }: WelcomeEmailData = await req.json();

    if (!email || !firstName) {
      throw new Error("Missing required fields: email and firstName are required");
    }

    console.log(`Preparing to send welcome email to ${email}`);

    const recipientName = `${firstName} ${lastName || ''}`.trim();
    const baseUrl = Deno.env.get("SITE_URL") || 'https://wellbeing-surveys.creativeeducation.co.uk';

    const content = `
      <p>Thank you for creating an account with Staff Wellbeing Surveys! We're excited to have you on board.</p>
      
      <p>You're now ready to create and send wellbeing surveys to your staff${schoolName ? ` at ${schoolName}` : ''}.</p>
      
      <p><strong>Here's what you can do with your new account:</strong></p>
      <ul style="margin: 20px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Create customised wellbeing surveys</li>
        <li style="margin-bottom: 8px;">Send surveys to your staff via email</li>
        <li style="margin-bottom: 8px;">View and analyse survey results</li>
        <li style="margin-bottom: 8px;">Generate reports to track wellbeing trends</li>
      </ul>
      
      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    `;

    const html = createEmailTemplate({
      title: "Welcome to Staff Wellbeing Surveys",
      preheader: "Your account is ready - start creating wellbeing surveys today",
      recipientName,
      content,
      buttonText: "Get Started Now",
      buttonUrl: baseUrl,
      footerText: "The Staff Wellbeing Surveys Team"
    });

    const emailResponse = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: [email],
      subject: "Welcome to Staff Wellbeing Surveys!",
      html: html,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
