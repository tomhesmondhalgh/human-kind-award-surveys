
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Resend } from "npm:resend@2.0.0";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, organizationName, role, inviterName, invitationToken }: InvitationEmailRequest = await req.json();

    console.log('Sending team invitation email:', { email, organizationName, role, inviterName });

    const acceptUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/accept-invitation?token=${invitationToken}`;

    const roleDescriptions = {
      'admin': 'Full access including team management',
      'editor': 'Can create and edit surveys', 
      'viewer': 'Can view surveys and results'
    };

    const emailResponse = await resend.emails.send({
      from: "School Wellbeing Survey <noreply@resend.dev>",
      to: [email],
      subject: `You're invited to join ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6366f1; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { 
              display: inline-block; 
              background-color: #6366f1; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .role-info { 
              background-color: #e0e7ff; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 20px 0;
              border-left: 4px solid #6366f1;
            }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Team Invitation</h1>
            </div>
            <div class="content">
              <h2>You've been invited to join ${organizationName}</h2>
              <p>Hello!</p>
              <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on the School Wellbeing Survey platform.</p>
              
              <div class="role-info">
                <h3>Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</h3>
                <p>${roleDescriptions[role as keyof typeof roleDescriptions] || 'Team member access'}</p>
              </div>

              <p>Click the button below to accept your invitation and get started:</p>
              
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="button">Accept Invitation</a>
              </div>
              
              <p><small>If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${acceptUrl}">${acceptUrl}</a></small></p>
              
              <p>This invitation will expire in 7 days. If you have any questions, please contact ${inviterName} or your system administrator.</p>
            </div>
            <div class="footer">
              <p>School Wellbeing Survey Platform</p>
            </div>
          </div>
        </body>
        </html>
      `,
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
