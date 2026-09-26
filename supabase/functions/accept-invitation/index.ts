import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Accept invitation request received');
    
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
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

    console.log('✅ User validated:', user.id.slice(0, 8), user.email);

    // Parse request body
    const { token }: AcceptInvitationRequest = await req.json();
    console.log('📋 Invitation token received');

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      console.error('❌ Invitation not found:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ Invitation found:', {
      id: invitation.id,
      email: invitation.email,
      org: invitation.organization_id.slice(0, 8)
    });

    // Check if already accepted
    if (invitation.accepted_at) {
      console.warn('⚠️ Invitation already accepted');
      return new Response(
        JSON.stringify({ 
          error: 'This invitation has already been accepted',
          alreadyAccepted: true
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.warn('⚠️ Invitation expired');
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (existingMember) {
      console.log('ℹ️ User already a member, marking invitation as accepted');
      
      // Mark invitation as accepted even though they're already a member
      await supabaseAdmin
        .from('organization_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          alreadyMember: true,
          message: 'You are already a member of this organisation'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create organization membership using service role (bypasses RLS)
    console.log('📝 Creating organization membership');
    const { error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
        is_primary: false
      });

    if (membershipError) {
      console.error('❌ Failed to create membership:', membershipError);
      return new Response(
        JSON.stringify({ error: `Failed to create membership: ${membershipError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ Membership created successfully');

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('⚠️ Failed to mark invitation as accepted:', updateError);
      // Don't fail the whole operation if we can't update the invitation
    } else {
      console.log('✅ Invitation marked as accepted');
    }

    console.log('🎉 Invitation acceptance completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        organizationId: invitation.organization_id,
        message: 'Successfully joined organisation'
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('💥 Invitation acceptance failed:', error);
    return new Response(
      JSON.stringify({ error: `Invitation acceptance failed: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
