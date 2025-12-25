
-- Update credential_login to allow re-login with correct password
CREATE OR REPLACE FUNCTION public.credential_login(p_key_code text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_credential_key RECORD;
  v_session_token TEXT;
  v_subscription RECORD;
  v_subscription_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_is_admin BOOLEAN;
BEGIN
  -- Find the credential key
  SELECT * INTO v_credential_key
  FROM credential_keys
  WHERE key_code = UPPER(p_key_code);

  -- Check if key exists
  IF v_credential_key IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credential key');
  END IF;

  -- Check if password matches
  IF v_credential_key.password_hash IS NULL OR v_credential_key.password_hash != p_password THEN
    RETURN json_build_object('success', false, 'error', 'Invalid password');
  END IF;

  -- Check if user is admin
  v_is_admin := public.has_role(v_credential_key.id, 'admin');

  -- Check if key is expired (not applicable for admins)
  IF NOT v_is_admin AND v_credential_key.expires_at IS NOT NULL AND v_credential_key.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This credential key has expired');
  END IF;

  -- Generate session token
  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Mark credential key as used (only for non-admins, and only if not already used)
  IF NOT v_is_admin AND v_credential_key.is_used = false THEN
    UPDATE credential_keys
    SET is_used = true,
        used_at = now()
    WHERE id = v_credential_key.id;
  END IF;

  -- Deactivate any existing sessions for this credential key
  UPDATE user_sessions
  SET is_active = false
  WHERE credential_key_id = v_credential_key.id;

  -- Create new session
  INSERT INTO user_sessions (session_token, credential_key_id)
  VALUES (v_session_token, v_credential_key.id);

  -- Get existing active subscription for this credential key
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE credential_key_id = v_credential_key.id
    AND is_active = true
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- For non-admins, create subscription only if none exists
  IF NOT v_is_admin THEN
    IF v_subscription IS NULL THEN
      -- Calculate expiration as 24 hours from now
      v_expires_at := now() + INTERVAL '24 hours';
      
      -- Deactivate any expired subscriptions
      UPDATE subscriptions
      SET is_active = false
      WHERE credential_key_id = v_credential_key.id
        AND (expires_at <= now() OR is_active = false);

      -- Create new subscription
      INSERT INTO subscriptions (credential_key_id, expires_at, is_active)
      VALUES (v_credential_key.id, v_expires_at, true)
      RETURNING id INTO v_subscription_id;
    ELSE
      v_subscription_id := v_subscription.id;
      v_expires_at := v_subscription.expires_at;
    END IF;
  END IF;

  -- Log the login activity
  PERFORM public.log_activity(
    'USER_LOGIN',
    v_credential_key.id,
    NULL,
    json_build_object('key_code', v_credential_key.key_code, 'is_admin', v_is_admin)
  );

  RETURN json_build_object(
    'success', true,
    'session_token', v_session_token,
    'credential_key_id', v_credential_key.id,
    'is_admin', v_is_admin,
    'expires_at', CASE WHEN v_is_admin THEN NULL ELSE v_expires_at END,
    'subscription_id', v_subscription_id
  );
END;
$function$;
