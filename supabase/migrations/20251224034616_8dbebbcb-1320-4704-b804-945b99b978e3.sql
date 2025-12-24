-- Recreate credential_login function with explicit pgcrypto reference
CREATE OR REPLACE FUNCTION public.credential_login(p_key_code text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_credential_key RECORD;
  v_session_token TEXT;
  v_subscription_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find the credential key
  SELECT * INTO v_credential_key
  FROM credential_keys
  WHERE key_code = p_key_code;

  -- Check if key exists
  IF v_credential_key IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credential key');
  END IF;

  -- Check if password matches
  IF v_credential_key.password_hash IS NULL OR v_credential_key.password_hash != p_password THEN
    RETURN json_build_object('success', false, 'error', 'Invalid password');
  END IF;

  -- Check if key is already used
  IF v_credential_key.is_used = true THEN
    RETURN json_build_object('success', false, 'error', 'This credential key has already been used');
  END IF;

  -- Check if key is expired
  IF v_credential_key.expires_at IS NOT NULL AND v_credential_key.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This credential key has expired');
  END IF;

  -- Generate session token using extensions schema
  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Calculate expiration (end of current day at 23:59:59)
  v_expires_at := date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '23 hours 59 minutes 59 seconds';

  -- Mark credential key as used
  UPDATE credential_keys
  SET is_used = true,
      used_at = now()
  WHERE id = v_credential_key.id;

  -- Create session
  INSERT INTO user_sessions (session_token, credential_key_id)
  VALUES (v_session_token, v_credential_key.id);

  -- Create subscription
  INSERT INTO subscriptions (user_id, credential_key_id, expires_at, is_active)
  VALUES (v_credential_key.id, v_credential_key.id, v_expires_at, true)
  RETURNING id INTO v_subscription_id;

  RETURN json_build_object(
    'success', true,
    'session_token', v_session_token,
    'credential_key_id', v_credential_key.id,
    'expires_at', v_expires_at,
    'subscription_id', v_subscription_id
  );
END;
$function$;