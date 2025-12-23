
-- Add password to credential_keys table
ALTER TABLE public.credential_keys ADD COLUMN password_hash TEXT;

-- Create user_sessions table for persisting logins with credential keys
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  credential_key_id UUID NOT NULL REFERENCES public.credential_keys(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions (for validation)
CREATE POLICY "Anyone can check sessions" ON public.user_sessions
  FOR SELECT USING (true);

-- Allow inserts for login
CREATE POLICY "Allow session creation" ON public.user_sessions
  FOR INSERT WITH CHECK (true);

-- Allow updates for session management
CREATE POLICY "Allow session updates" ON public.user_sessions
  FOR UPDATE USING (true);

-- Create function to login with credential key and password
CREATE OR REPLACE FUNCTION public.credential_login(
  p_key_code TEXT,
  p_password TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

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
$$;

-- Create function to validate session
CREATE OR REPLACE FUNCTION public.validate_session(
  p_session_token TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_subscription RECORD;
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

  -- Get subscription status
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE credential_key_id = v_session.credential_key_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'valid', true,
    'credential_key_id', v_session.credential_key_id,
    'key_code', v_session.key_code,
    'created_by', v_session.created_by,
    'subscription_active', v_subscription IS NOT NULL AND v_subscription.expires_at > now(),
    'subscription_expires_at', v_subscription.expires_at
  );
END;
$$;
