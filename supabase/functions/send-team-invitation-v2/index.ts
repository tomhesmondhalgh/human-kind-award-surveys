import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Team invitation request received');
    
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT token from "Bearer <token>"
    const jwt = authHeader.replace('Bearer ', '');

    // Create client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate JWT token using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      console.error('❌ Invalid user session:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log('✅ User validated:', userId.slice(0, 8));

    // Parse request body
    const { email, role, organizationId, isResend }: InvitationRequest & { isResend?: boolean } = await req.json();
    console.log('📋 Invitation details:', { email, role, orgId: organizationId.slice(0, 8), isResend });

    // Check if user has admin permissions for this organization
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      console.error('❌ Permission denied:', membershipError);
      return new Response(
        JSON.stringify({ error: 'You do not have admin permissions for this organisation' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ Permission check passed');

    // If this is a resend, update existing invitation instead of creating new one
    if (isResend) {
      console.log('🔄 Resending invitation - updating existing record');
      
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);
      
      const { data: updatedInvitation, error: updateError } = await supabaseAdmin
        .from('organization_invitations')
        .update({
          expires_at: newExpiresAt.toISOString(),
          // Keep the same token so existing links still work
        })
        .eq('email', email)
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .select(`
          *,
          organizations!organization_invitations_organization_id_fkey (name)
        `)
        .single();
      
      if (updateError) {
        console.error('❌ Failed to update invitation:', updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update invitation: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!updatedInvitation) {
        console.error('❌ No existing invitation found to resend');
        return new Response(
          JSON.stringify({ error: 'No existing invitation found to resend' }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log('✅ Invitation updated successfully');
      
      // Send email with existing token
      try {
        const { data: inviterProfile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        const inviterName = inviterProfile 
          ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague'
          : 'A colleague';

        const { error: emailError } = await supabaseAdmin.functions.invoke('send-team-invitation', {
          body: {
            email,
            organizationName: updatedInvitation.organizations?.name || 'your organization',
            role,
            inviterName,
            invitationToken: updatedInvitation.token // Use existing token
          }
        });

        if (emailError) {
          console.warn('⚠️ Email sending failed:', emailError);
        } else {
          console.log('✅ Email sent successfully');
        }
      } catch (emailError) {
        console.warn('⚠️ Email error (non-blocking):', emailError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          invitation: updatedInvitation,
          message: 'Invitation resent successfully'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Not a resend - check for duplicates and create new invitation
    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('organization_invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      console.warn('⚠️ Existing pending invitation found');
      return new Response(
        JSON.stringify({ error: 'An invitation has already been sent to this email' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user with this email is already a member (efficient query)
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1)
      .maybeSingle();
    
    if (existingUser) {
      const { data: existingMember } = await supabaseAdmin
        .from('organization_memberships')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
        
      if (existingMember) {
        console.warn('⚠️ User is already a member');
        return new Response(
          JSON.stringify({ error: 'This user is already a member of the organisation' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create new invitation
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        email,
        organization_id: organizationId,
        role: role as any,
        token,
        invited_by: userId,
        expires_at: expiresAt.toISOString()
      })
      .select(`
        *,
        organizations!organization_invitations_organization_id_fkey (name)
      `)
      .single();

    if (invitationError) {
      console.error('❌ Failed to create invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: `Failed to create invitation: ${invitationError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ Invitation created successfully');

    // Send email notification
    try {
      const { data: inviterProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const inviterName = inviterProfile 
        ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A colleague'
        : 'A colleague';

      const { error: emailError } = await supabaseAdmin.functions.invoke('send-team-invitation', {
        body: {
          email,
          organizationName: invitation.organizations?.name || 'your organization',
          role,
          inviterName,
          invitationToken: token
        }
      });

      if (emailError) {
        console.warn('⚠️ Email sending failed:', emailError);
      } else {
        console.log('✅ Email sent successfully');
      }
    } catch (emailError) {
      console.warn('⚠️ Email error (non-blocking):', emailError);
    }

    console.log('🎉 Invitation process completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation,
        message: 'Invitation sent successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('💥 Invitation failed:', error);
    return new Response(
      JSON.stringify({ error: `Invitation failed: ${(error as Error).message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);