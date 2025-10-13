import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  user: {
    email: string;
  };
  email_data: {
    token_hash: string;
    redirect_to?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Password reset email function triggered");
    
    const payload: PasswordResetRequest = await req.json();
    console.log("Received payload for user:", payload.user.email);

    const { user, email_data } = payload;
    const { token_hash, redirect_to } = email_data;

    // Construct the password reset URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const resetUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=recovery${redirect_to ? `&redirect_to=${encodeURIComponent(redirect_to)}` : ''}`;

    console.log("Generated reset URL for user:", user.email);

    // Create email HTML using the shared template
    const emailHtml = createEmailTemplate({
      title: "Reset Your Password",
      preheader: "You requested to reset your password",
      content: `
        <p>We received a request to reset the password for your Human Kind Award account.</p>
        <p>Click the button below to choose a new password. This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      `,
      buttonText: "Reset Password",
      buttonUrl: resetUrl,
      footerText: "Human Kind Award"
    });

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Human Kind Award <noreply@humankindaward.com>",
      to: [user.email],
      subject: "Reset Your Password - Human Kind Award",
      html: emailHtml,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
