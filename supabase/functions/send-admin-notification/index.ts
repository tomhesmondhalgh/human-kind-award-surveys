
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationData {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  schoolName: string;
  schoolAddress: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Admin notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body");
    const body = await req.text();
    console.log("Request body:", body);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON", details: jsonError.message }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    const { email, firstName, lastName, jobTitle, schoolName, schoolAddress }: AdminNotificationData = parsedBody;

    if (!email || !firstName) {
      console.error("Missing required fields:", { email, firstName });
      throw new Error("Missing required fields for admin notification");
    }

    console.log(`Preparing to send admin notification about new user: ${email}`);

    const content = `
      <p>A new user has registered for Staff Wellbeing Surveys:</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #e9ecef;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c; width: 30%;">Name:</td>
            <td style="padding: 8px 0; color: #6c757d;">${firstName} ${lastName || ''}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">Email:</td>
            <td style="padding: 8px 0; color: #6c757d;">${email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">Job Title:</td>
            <td style="padding: 8px 0; color: #6c757d;">${jobTitle || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">School/College:</td>
            <td style="padding: 8px 0; color: #6c757d;">${schoolName || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">Address:</td>
            <td style="padding: 8px 0; color: #6c757d;">${schoolAddress || 'Not provided'}</td>
          </tr>
        </table>
      </div>
      
      <p>You can log in to the admin portal to view more details about this user.</p>
    `;

    const baseUrl = Deno.env.get("SITE_URL") || 'https://wellbeing-surveys.creativeeducation.co.uk';
    const adminUrl = `${baseUrl}/admin`;

    const html = createEmailTemplate({
      title: "New User Registration",
      preheader: `New registration from ${firstName} ${lastName || ''}`,
      content,
      buttonText: "View in Admin Portal",
      buttonUrl: adminUrl,
    });

    console.log("Sending email via Resend");
    const emailResponse = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: ["tom.hesmondhalgh@creativeeducation.co.uk"],
      subject: "New Registration",
      html: html,
    });

    console.log("Admin notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
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
