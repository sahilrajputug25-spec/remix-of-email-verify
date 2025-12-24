-- Update validate_session to include is_admin flag
CREATE OR REPLACE FUNCTION public.validate_session(p_session_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
  v_subscription RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Find the session
  SELECT us.*, ck.key_code, ck.created_by
  INTO v_session
  FROM user_sessions us
  JOIN credential_keys ck ON us.credential_key_id = ck.id
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_session IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired session');
  END IF;

  -- Update last accessed
  UPDATE user_sessions
  SET last_accessed_at = now()
  WHERE session_token = p_session_token;

  -- Check if user is admin
  v_is_admin := public.has_role(v_session.credential_key_id, 'admin');

  -- Get subscription status
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE credential_key_id = v_session.credential_key_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- For admins, subscription is always active
  RETURN json_build_object(
    'valid', true,
    'credential_key_id', v_session.credential_key_id,
    'key_code', v_session.key_code,
    'created_by', v_session.created_by,
    'is_admin', v_is_admin,
    'subscription_active', CASE 
      WHEN v_is_admin THEN true 
      ELSE (v_subscription IS NOT NULL AND v_subscription.expires_at > now())
    END,
    'subscription_expires_at', CASE 
      WHEN v_is_admin THEN null 
      ELSE v_subscription.expires_at 
    END
  );
END;
$function$;