-- Drop existing RLS policies on email_validations
DROP POLICY IF EXISTS "Users can delete their own validations" ON public.email_validations;
DROP POLICY IF EXISTS "Users can insert their own validations" ON public.email_validations;
DROP POLICY IF EXISTS "Users can view their own validations" ON public.email_validations;

-- Create new policies that work with credential-based auth (using user_id as credential_key_id)
CREATE POLICY "Anyone can insert validations"
ON public.email_validations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view validations"
ON public.email_validations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can delete validations"
ON public.email_validations
FOR DELETE
USING (true);

-- Create function to save validation result
CREATE OR REPLACE FUNCTION public.save_email_validation(
  p_credential_key_id uuid,
  p_email text,
  p_syntax_valid boolean,
  p_domain_exists boolean,
  p_mx_records boolean,
  p_is_disposable boolean,
  p_is_role_based boolean,
  p_is_catch_all boolean,
  p_domain text,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_validation_id uuid;
BEGIN
  INSERT INTO email_validations (
    user_id,
    email,
    syntax_valid,
    domain_exists,
    mx_records,
    is_disposable,
    is_role_based,
    is_catch_all,
    domain,
    status
  ) VALUES (
    p_credential_key_id,
    p_email,
    p_syntax_valid,
    p_domain_exists,
    p_mx_records,
    p_is_disposable,
    p_is_role_based,
    p_is_catch_all,
    p_domain,
    p_status
  )
  RETURNING id INTO v_validation_id;
  
  RETURN v_validation_id;
END;
$function$;

-- Update credential_login to fix subscription expiry at 11:59:59 PM UTC
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

  -- For non-admin users, check if key is already used
  IF NOT v_is_admin AND v_credential_key.is_used = true THEN
    RETURN json_build_object('success', false, 'error', 'This credential key has already been used');
  END IF;

  -- Check if key is expired (not applicable for admins)
  IF NOT v_is_admin AND v_credential_key.expires_at IS NOT NULL AND v_credential_key.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'This credential key has expired');
  END IF;

  -- Generate session token
  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Calculate expiration at 11:59:59 PM UTC today
  v_expires_at := date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '23 hours 59 minutes 59 seconds';
  
  -- If it's past 11 PM UTC, set expiry to tomorrow 11:59:59 PM
  IF (now() AT TIME ZONE 'UTC')::time > '23:00:00'::time THEN
    v_expires_at := v_expires_at + INTERVAL '1 day';
  END IF;

  -- Mark credential key as used (only for non-admins)
  IF NOT v_is_admin THEN
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

  -- Deactivate any existing subscriptions for this credential key (for non-admins)
  IF NOT v_is_admin THEN
    UPDATE subscriptions
    SET is_active = false
    WHERE credential_key_id = v_credential_key.id;

    -- Create new subscription that expires at 11:59:59 PM
    INSERT INTO subscriptions (credential_key_id, expires_at, is_active)
    VALUES (v_credential_key.id, v_expires_at, true)
    RETURNING id INTO v_subscription_id;
  END IF;

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

-- Drop existing subscriptions RLS policies and create open ones for credential-based auth
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

CREATE POLICY "Anyone can view subscriptions"
ON public.subscriptions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (true);