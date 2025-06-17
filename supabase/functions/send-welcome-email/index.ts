
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, schoolName }: WelcomeEmailData = await req.json();

    if (!email || !firstName) {
      throw new Error("Missing required fields: email and firstName are required");
    }

    console.log(`Preparing to send welcome email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: [email],
      subject: "Welcome to Wellbeing Surveys!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #6d28d9; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Wellbeing Surveys</h1>
          </div>
          <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Hello ${firstName} ${lastName || ''},</p>
            <p>Thank you for creating an account with Wellbeing Surveys! We're excited to have you on board.</p>
            <p>You're now ready to create and send wellbeing surveys to your staff at ${schoolName || 'your school'}.</p>
            <p>Here's what you can do with your new account:</p>
            <ul>
              <li>Create customized wellbeing surveys</li>
              <li>Send surveys to your staff via email</li>
              <li>View and analyze survey results</li>
              <li>Generate reports to track wellbeing trends</li>
            </ul>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${Deno.env.get("SITE_URL") || 'https://wellbeing-surveys.creativeeducation.co.uk'}" 
                 style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Get Started Now
              </a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
              Thanks,<br />
              The Wellbeing Surveys Team
            </p>
          </div>
        </div>
      `,
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
