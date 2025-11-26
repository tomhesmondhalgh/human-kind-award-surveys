import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 get-invitation-details function called');

    // Get token from request body (preferred) or query params (fallback)
    let token: string | null = null;
    try {
      const body = await req.json();
      token = (body && typeof body.token === 'string') ? body.token : null;
    } catch (e) {
      console.log('ℹ️ No JSON body provided or failed to parse body:', e?.message || e);
    }

    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    }


    if (!token) {
      console.error('❌ No token provided');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Token received:', token.substring(0, 8) + '...');

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Query invitation with organization details using service role
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .select(`
        id,
        email,
        role,
        organization_id,
        invited_by,
        expires_at,
        accepted_at,
        created_at,
        organizations!fk_organization_invitations_organization_id (
          name
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      console.error('❌ Invitation not found:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Invitation found:', invitation.id);

    // Check if already accepted
    if (invitation.accepted_at) {
      console.log('⚠️ Invitation already accepted');
      return new Response(
        JSON.stringify({ error: 'Invitation already accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      console.log('⚠️ Invitation expired');
      return new Response(
        JSON.stringify({ error: 'Invitation expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get inviter profile for display name
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', invitation.invited_by)
      .single();

    const inviterName = inviterProfile 
      ? `${inviterProfile.first_name} ${inviterProfile.last_name}`.trim()
      : 'Someone';

    // Prepare response
    const response: InvitationDetails = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organization_id,
      organizationName: invitation.organizations?.name || 'Unknown Organization',
      invitedBy: inviterName,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
    };

    console.log('✅ Returning invitation details');

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
