import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { verifyAuthHook } from "../_shared/authHook.ts";
import { authLink, emailChangeMessages } from "../_shared/authEmailLinks.ts";
import { escapeHtml } from "../_shared/html.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    email: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Auth email function called");
    const payload = await verifyAuthHook<AuthEmailPayload>(req);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log("📧 Email action type:", payload.email_data.email_action_type);
    console.log("👤 Recipient:", payload.user.email);

    const { user, email_data } = payload;
    const { email_action_type, token_hash } = email_data;

    let emailContent = "";
    let subject = "";
    // Most actions send one email to the user; email_change may send two.
    let extraMessages: { to: string; subject: string; html: string }[] | null = null;

    switch (email_action_type) {
      case "email_change": {
        extraMessages = emailChangeMessages(payload).map((m) => ({
          to: m.to,
          subject: "Confirm Your Email Address Change",
          html: createEmailTemplate({
            title: "Confirm Your Email Address Change",
            content: m.isNewAddress
              ? `<p>We received a request to change the email address on your Humankind Award Surveys account to this address.</p>
                 <p>Please confirm by clicking the button below:</p>`
              : `<p>We received a request to change the email address on your Humankind Award Surveys account from this address to ${escapeHtml(payload.user.new_email ?? "")}.</p>
                 <p>Please confirm by clicking the button below:</p>`,
            buttonText: "Confirm Email Change",
            buttonUrl: authLink(m.tokenHash, "email_change"),
            footerText: "If you didn't ask to change your email address, please ignore this email and contact us."
          }),
        }));
        console.log(`✅ Generated ${extraMessages.length} email change confirmation email(s)`);
        break;
      }

      case "signup": {
        // Construct email confirmation URL with token in query parameters
        const confirmUrl = authLink(token_hash, "signup");
        
        emailContent = createEmailTemplate({
          title: "Confirm Your Email Address",
          content: `
            <p>Thank you for signing up for Humankind Award Surveys!</p>
            <p>Please confirm your email address by clicking the button below:</p>
          `,
          buttonText: "Confirm Email Address",
          buttonUrl: confirmUrl,
          footerText: "If you didn't create an account, you can safely ignore this email."
        });
        
        subject = "Confirm Your Email Address";
        console.log("✅ Generated signup confirmation email");
        break;
      }

      case "recovery": {
        // Construct password reset URL with token in query parameters
        const resetUrl = `https://surveys.humankindaward.com/reset-password?token=${encodeURIComponent(token_hash)}&type=recovery`;
        
        emailContent = createEmailTemplate({
          title: "Reset Your Password",
          content: `
            <p>We received a request to reset your password for your Humankind Award Surveys account.</p>
            <p>Click the button below to create a new password:</p>
          `,
          buttonText: "Reset Password",
          buttonUrl: resetUrl,
          footerText: "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged."
        });
        
        subject = "Reset Your Password";
        console.log("✅ Generated password recovery email");
        break;
      }

      case "magiclink": {
        // Construct magic link URL
        const magicLinkUrl = authLink(token_hash, "magiclink");
        
        emailContent = createEmailTemplate({
          title: "Your Magic Link",
          content: `
            <p>Click the button below to sign in to your Humankind Award Surveys account:</p>
          `,
          buttonText: "Sign In",
          buttonUrl: magicLinkUrl,
          footerText: "This link will expire in 1 hour. If you didn't request this, you can safely ignore this email."
        });
        
        subject = "Sign In to Your Account";
        console.log("✅ Generated magic link email");
        break;
      }

      case "invite": {
        console.log("⚠️  Invite email not yet implemented, using default message");
        emailContent = createEmailTemplate({
          title: "You've Been Invited",
          content: `
            <p>You've been invited to join an organization on Humankind Award Surveys.</p>
            <p>Please check your dashboard for more details.</p>
          `,
          buttonText: "View Invitation",
          buttonUrl: "https://surveys.humankindaward.com/login"
        });
        subject = "You've Been Invited";
        break;
      }

      default: {
        console.error("❌ Unknown email action type:", email_action_type);
        return new Response(
          JSON.stringify({ error: `Unknown email action type: ${email_action_type}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    const messages = extraMessages ?? [{ to: user.email, subject, html: emailContent }];

    // Send email via Resend
    console.log(`📤 Sending ${messages.length} email(s) via Resend...`);
    const responses = [];
    for (const message of messages) {
      const emailResponse = await resend.emails.send({
        from: "Human Kind <contact@humankindaward.com>",
        to: [message.to],
        subject: message.subject,
        html: message.html,
      });
      // Resend reports failures in the response rather than throwing.
      if (emailResponse.error) throw new Error(`Resend error: ${emailResponse.error.message}`);
      responses.push(emailResponse);
    }

    console.log("✅ Email(s) sent successfully");

    return new Response(JSON.stringify(responses.length === 1 ? responses[0] : responses), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-auth-email function:", error);
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
