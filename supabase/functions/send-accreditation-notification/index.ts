
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing accreditation notification request...');
    
    const { submissionId, submitterName, schoolName, submissionData }: NotificationRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch admin users
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

    // Get admin email addresses from auth.users table
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

    // Create summary of submission data
    const getSummary = () => {
      if (!submissionData || submissionData.length === 0) {
        return 'No submission data available';
      }
      
      return submissionData.map(section => 
        `• ${section.title}: ${section.completedCount || 0} completed, ${section.notApplicableCount || 0} not applicable`
      ).join('\n');
    };

    const summary = getSummary();
    const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://staffwellbeingsurveys.com';
    const reviewUrl = `${baseUrl}/admin`;

    // Send email to all admin users
    console.log(`Sending notification emails to ${adminEmails.length} admin(s)...`);
    
    const emailResponse = await resend.emails.send({
      from: "Staff Wellbeing Surveys <notifications@staffwellbeingsurveys.com>",
      to: adminEmails,
      subject: "New Action Plan Accreditation Submission",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">New Accreditation Submission</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #1f2937;">Submission Details</h3>
            <p><strong>Submitter:</strong> ${submitterName}</p>
            <p><strong>School:</strong> ${schoolName || 'Not specified'}</p>
            <p><strong>Submission ID:</strong> ${submissionId}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937;">Action Plan Summary</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px;">
              <pre style="font-family: Arial, sans-serif; white-space: pre-line; margin: 0;">${summary}</pre>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" 
               style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Review Submission
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This submission requires your review for accreditation approval. Please log in to the admin panel to review and process this submission.
          </p>
        </div>
      `,
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
