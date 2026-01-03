-- Add email_limit and subscription_hours columns to credential_keys
ALTER TABLE public.credential_keys
ADD COLUMN email_limit integer DEFAULT NULL,
ADD COLUMN subscription_hours integer DEFAULT 24;

-- Add emails_validated counter to track usage
ALTER TABLE public.credential_keys
ADD COLUMN emails_validated integer DEFAULT 0;

-- Update create_credential_key function to accept new parameters
CREATE OR REPLACE FUNCTION public.create_credential_key(
  p_session_token text, 
  p_key_code text, 
  p_password text, 
  p_created_by text DEFAULT NULL,
  p_email_limit integer DEFAULT NULL,
  p_subscription_hours integer DEFAULT 24
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin BOOLEAN;
  v_new_id UUID;
  v_actor_credential_key_id UUID;
BEGIN
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  SELECT us.credential_key_id INTO v_actor_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF EXISTS (SELECT 1 FROM credential_keys WHERE key_code = UPPER(p_key_code)) THEN
    RETURN json_build_object('success', false, 'error', 'Key code already exists');
  END IF;

  INSERT INTO credential_keys (key_code, password_hash, created_by, email_limit, subscription_hours)
  VALUES (UPPER(p_key_code), p_password, p_created_by, p_email_limit, p_subscription_hours)
  RETURNING id INTO v_new_id;

  PERFORM public.log_activity(
    'KEY_CREATED',
    v_actor_credential_key_id,
    v_new_id,
    json_build_object(
      'key_code', UPPER(p_key_code), 
      'created_by', p_created_by,
      'email_limit', p_email_limit,
      'subscription_hours', p_subscription_hours
    )
  );

  RETURN json_build_object(
    'success', true,
    'credential_key_id', v_new_id,
    'key_code', UPPER(p_key_code)
  );
END;
$function$;

-- Update credential_login to use custom subscription_hours
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
  v_any_subscription RECORD;
  v_subscription_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_is_admin BOOLEAN;
  v_sub_hours INTEGER;
BEGIN
  SELECT * INTO v_credential_key
  FROM credential_keys
  WHERE key_code = UPPER(p_key_code);

  IF v_credential_key IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credential key');
  END IF;

  IF v_credential_key.password_hash IS NULL OR v_credential_key.password_hash != p_password THEN
    RETURN json_build_object('success', false, 'error', 'Invalid password');
  END IF;

  v_is_admin := public.has_role(v_credential_key.id, 'admin');

  IF NOT v_is_admin AND v_credential_key.expires_at IS NOT NULL AND v_credential_key.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This credential key has expired');
  END IF;

  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  IF NOT v_is_admin AND v_credential_key.is_used = false THEN
    UPDATE credential_keys
    SET is_used = true, used_at = now()
    WHERE id = v_credential_key.id;
  END IF;

  UPDATE user_sessions SET is_active = false WHERE credential_key_id = v_credential_key.id;

  INSERT INTO user_sessions (session_token, credential_key_id)
  VALUES (v_session_token, v_credential_key.id);

  SELECT * INTO v_any_subscription
  FROM subscriptions
  WHERE credential_key_id = v_credential_key.id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE credential_key_id = v_credential_key.id
    AND is_active = true
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT v_is_admin THEN
    v_sub_hours := COALESCE(v_credential_key.subscription_hours, 24);
    
    IF v_any_subscription IS NULL THEN
      v_expires_at := now() + (v_sub_hours || ' hours')::interval;

      INSERT INTO subscriptions (credential_key_id, expires_at, is_active)
      VALUES (v_credential_key.id, v_expires_at, true)
      RETURNING id INTO v_subscription_id;
    ELSIF v_subscription IS NOT NULL THEN
      v_subscription_id := v_subscription.id;
      v_expires_at := v_subscription.expires_at;
    ELSE
      v_subscription_id := v_any_subscription.id;
      v_expires_at := v_any_subscription.expires_at;
    END IF;
  END IF;

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
    'subscription_id', v_subscription_id,
    'email_limit', v_credential_key.email_limit,
    'emails_validated', v_credential_key.emails_validated
  );
END;
$function$;

-- Function to check and increment email count
CREATE OR REPLACE FUNCTION public.check_and_increment_email_count(
  p_session_token text,
  p_count integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_credential_key RECORD;
  v_is_admin BOOLEAN;
BEGIN
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  v_is_admin := public.has_role(v_credential_key_id, 'admin');
  
  IF v_is_admin THEN
    RETURN json_build_object('success', true, 'allowed', true, 'is_admin', true);
  END IF;

  SELECT * INTO v_credential_key FROM credential_keys WHERE id = v_credential_key_id;

  IF v_credential_key.email_limit IS NOT NULL THEN
    IF (v_credential_key.emails_validated + p_count) > v_credential_key.email_limit THEN
      RETURN json_build_object(
        'success', true, 
        'allowed', false, 
        'error', 'Email limit exceeded',
        'limit', v_credential_key.email_limit,
        'used', v_credential_key.emails_validated,
        'remaining', v_credential_key.email_limit - v_credential_key.emails_validated
      );
    END IF;
  END IF;

  UPDATE credential_keys 
  SET emails_validated = emails_validated + p_count 
  WHERE id = v_credential_key_id;

  RETURN json_build_object(
    'success', true, 
    'allowed', true,
    'limit', v_credential_key.email_limit,
    'used', v_credential_key.emails_validated + p_count,
    'remaining', CASE 
      WHEN v_credential_key.email_limit IS NULL THEN NULL 
      ELSE v_credential_key.email_limit - v_credential_key.emails_validated - p_count 
    END
  );
END;
$function$;

-- Function to get email usage stats
CREATE OR REPLACE FUNCTION public.get_email_usage(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_credential_key RECORD;
  v_is_admin BOOLEAN;
BEGIN
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  v_is_admin := public.has_role(v_credential_key_id, 'admin');
  
  IF v_is_admin THEN
    RETURN json_build_object('success', true, 'is_admin', true, 'limit', NULL, 'used', 0);
  END IF;

  SELECT * INTO v_credential_key FROM credential_keys WHERE id = v_credential_key_id;

  RETURN json_build_object(
    'success', true,
    'limit', v_credential_key.email_limit,
    'used', v_credential_key.emails_validated,
    'remaining', CASE 
      WHEN v_credential_key.email_limit IS NULL THEN NULL 
      ELSE v_credential_key.email_limit - v_credential_key.emails_validated 
    END
  );
END;
$function$;

-- Update get_all_credential_keys to include new fields
CREATE OR REPLACE FUNCTION public.get_all_credential_keys(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin BOOLEAN;
  v_keys JSON;
BEGIN
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'key_code', key_code,
      'password', CASE WHEN is_used = false THEN password_hash ELSE NULL END,
      'is_used', is_used,
      'created_by', created_by,
      'created_at', created_at,
      'used_at', used_at,
      'email_limit', email_limit,
      'emails_validated', emails_validated,
      'subscription_hours', subscription_hours
    ) ORDER BY created_at DESC
  ) INTO v_keys
  FROM credential_keys;

  RETURN json_build_object('success', true, 'keys', COALESCE(v_keys, '[]'::json));
END;
$function$;