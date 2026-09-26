
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Resend } from "npm:resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  organizationName: string;
  role: string;
  inviterName: string;
  invitationToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, organizationName, role, inviterName, invitationToken }: InvitationEmailRequest = await req.json();

    console.log('Sending team invitation email:', { email, organizationName, role, inviterName });

    // Fix URL construction to handle trailing slashes properly
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
    const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    const acceptUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`;

    const roleDescriptions = {
      'admin': 'Full access including team management',
      'editor': 'Can create and edit surveys', 
      'viewer': 'Can view surveys and results'
    };

    const roleDescription = roleDescriptions[role as keyof typeof roleDescriptions] || 'Team member access';

    const content = `
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on the Staff Wellbeing Survey platform.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #bc9c22;">
        <h3 style="font-family: 'League Spartan', sans-serif; color: #3c3c3c; margin-top: 0; font-size: 18px;">Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</h3>
        <p style="color: #6c757d; margin-bottom: 0;">${roleDescription}</p>
      </div>

      <p>Click the button below to accept your invitation and get started:</p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">This invitation will expire in 7 days. If you have any questions, please contact ${inviterName} or your system administrator.</p>
    `;

    const html = createEmailTemplate({
      title: "Team Invitation",
      preheader: `You've been invited to join ${organizationName}`,
      content,
      buttonText: "Accept Invitation",
      buttonUrl: acceptUrl,
    });

    const emailResponse = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: [email],
      subject: `You're invited to join ${organizationName}`,
      html: html,
    });

    console.log("Team invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending team invitation email:", error);
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
