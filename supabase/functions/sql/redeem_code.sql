
-- Create a function to handle the code redemption process in one transaction
CREATE OR REPLACE FUNCTION public.redeem_code(
  user_uuid UUID,
  code_uuid UUID,
  plan plan_type
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  subscription_id UUID;
BEGIN
  -- Start a transaction
  BEGIN
    -- Create a redemption record
    INSERT INTO public.redemptions (code_id, user_id)
    VALUES (code_uuid, user_uuid);
    
    -- Update the code usage count
    UPDATE public.redemption_codes
    SET current_uses = current_uses + 1
    WHERE id = code_uuid;
    
    -- Create a new subscription for the user with the plan from the code
    INSERT INTO public.subscriptions (
      user_id,
      plan_type,
      status,
      payment_method,
      start_date,
      purchase_type
    )
    VALUES (
      user_uuid,
      plan,
      'active',
      'redemption_code',
      now(),
      'subscription'
    )
    RETURNING id INTO subscription_id;
    
    -- Return success result
    result := jsonb_build_object(
      'success', true,
      'subscription_id', subscription_id,
      'message', 'Code redeemed successfully'
    );
    
    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back the transaction on error
      RAISE;
  END;
END;
$$;
