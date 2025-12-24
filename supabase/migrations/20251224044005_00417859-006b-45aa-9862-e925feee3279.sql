-- Update credential_login to expire subscription 24 hours after login
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

  -- Calculate expiration as 24 hours from now
  v_expires_at := now() + INTERVAL '24 hours';

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

    -- Create new subscription that expires in 24 hours
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

-- Drop existing foreign key constraints if they exist
ALTER TABLE public.email_validations DROP CONSTRAINT IF EXISTS email_validations_user_id_fkey;
ALTER TABLE public.bulk_uploads DROP CONSTRAINT IF EXISTS bulk_uploads_user_id_fkey;

-- Drop old RLS policies on bulk_uploads that use auth.uid()
DROP POLICY IF EXISTS "Users can delete their own bulk uploads" ON public.bulk_uploads;
DROP POLICY IF EXISTS "Users can insert their own bulk uploads" ON public.bulk_uploads;
DROP POLICY IF EXISTS "Users can update their own bulk uploads" ON public.bulk_uploads;
DROP POLICY IF EXISTS "Users can view their own bulk uploads" ON public.bulk_uploads;

-- Create new permissive RLS policies for bulk_uploads
CREATE POLICY "Anyone can insert bulk uploads" ON public.bulk_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view bulk uploads" ON public.bulk_uploads FOR SELECT USING (true);
CREATE POLICY "Anyone can update bulk uploads" ON public.bulk_uploads FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bulk uploads" ON public.bulk_uploads FOR DELETE USING (true);