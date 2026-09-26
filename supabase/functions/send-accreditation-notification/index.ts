
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  submissionId: string;
  submitterName: string;
  schoolName: string;
  submissionData: any[];
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing accreditation notification request...');
    
    const { submissionId, submitterName, schoolName, submissionData }: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching admin users...');
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('first_name, last_name, id')
      .eq('is_admin', true);

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
      throw new Error('Failed to fetch admin users');
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found');
      return new Response(JSON.stringify({ message: 'No admin users to notify' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Fetching admin email addresses...');
    const adminUserIds = adminUsers.map(user => user.id);
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw new Error('Failed to fetch admin email addresses');
    }

    const adminEmails = authUsers.users
      .filter(user => adminUserIds.includes(user.id))
      .map(user => user.email)
      .filter(email => email);

    if (adminEmails.length === 0) {
      console.log('No admin email addresses found');
      return new Response(JSON.stringify({ message: 'No admin email addresses found' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const getSummary = () => {
      if (!submissionData || submissionData.length === 0) {
        return 'No submission data available';
      }
      
      return submissionData.map(section => 
        `• ${section.title}: ${section.completedCount || 0} completed, ${section.notApplicableCount || 0} not applicable`
      ).join('<br>');
    };

    const summary = getSummary();
    const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://staffwellbeingsurveys.com';
    const reviewUrl = `${baseUrl}/admin`;

    const content = `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'League Spartan', sans-serif; color: #3c3c3c; margin-top: 0;">Submission Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c; width: 30%;">Submitter:</td>
            <td style="padding: 8px 0; color: #6c757d;">${submitterName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">School:</td>
            <td style="padding: 8px 0; color: #6c757d;">${schoolName || 'Not specified'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">Submission ID:</td>
            <td style="padding: 8px 0; color: #6c757d;">${submissionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c;">Submitted:</td>
            <td style="padding: 8px 0; color: #6c757d;">${new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-family: 'League Spartan', sans-serif; color: #3c3c3c;">Action Plan Summary</h3>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px;">
          ${summary}
        </div>
      </div>

      <p>This submission requires your review for accreditation approval. Please log in to the admin panel to review and process this submission.</p>
    `;

    const html = createEmailTemplate({
      title: "New Action Plan Accreditation Submission",
      preheader: `New submission from ${submitterName} at ${schoolName || 'a school'}`,
      content,
      buttonText: "Review Submission",
      buttonUrl: reviewUrl,
    });

    console.log(`Sending notification emails to ${adminEmails.length} admin(s)...`);
    
    const emailResponse = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: adminEmails,
      subject: "New Action Plan Accreditation Submission",
      html: html,
    });

    console.log("Notification emails sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent: adminEmails.length,
      emailResponse 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-accreditation-notification function:", error);
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
