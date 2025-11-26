-- Create RPC function to accept invitations during signup without requiring JWT
CREATE OR REPLACE FUNCTION public.accept_invitation_during_signup(
  user_uuid UUID,
  invitation_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  user_email TEXT;
  result JSONB;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get invitation
  SELECT * INTO invitation_record
  FROM public.organization_invitations
  WHERE token = invitation_token;
  
  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found'
    );
  END IF;
  
  -- Security: Verify invitation email matches user email
  IF LOWER(invitation_record.email) != LOWER(user_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation email does not match user email'
    );
  END IF;
  
  -- Check if already accepted
  IF invitation_record.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'message', 'Invitation already accepted'
    );
  END IF;
  
  -- Check if expired
  IF invitation_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation has expired'
    );
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = user_uuid
    AND organization_id = invitation_record.organization_id
  ) THEN
    -- Mark invitation as accepted and return success
    UPDATE public.organization_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'message', 'Already a member of this organisation'
    );
  END IF;
  
  -- Create membership
  INSERT INTO public.organization_memberships (
    user_id,
    organization_id,
    role,
    is_primary
  ) VALUES (
    user_uuid,
    invitation_record.organization_id,
    invitation_record.role,
    false
  );
  
  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role,
    'message', 'Successfully joined organisation'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;