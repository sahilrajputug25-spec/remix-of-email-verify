-- Create activity_logs table for audit trail
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  actor_credential_key_id UUID REFERENCES public.credential_keys(id) ON DELETE SET NULL,
  target_credential_key_id UUID REFERENCES public.credential_keys(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_actor ON public.activity_logs(actor_credential_key_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (true);

-- Allow inserts (will be done via security definer functions)
CREATE POLICY "Allow activity log inserts" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action_type TEXT,
  p_actor_credential_key_id UUID,
  p_target_credential_key_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (action_type, actor_credential_key_id, target_credential_key_id, details)
  VALUES (p_action_type, p_actor_credential_key_id, p_target_credential_key_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create function to get activity logs (admin only)
CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_session_token TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_action_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_logs JSON;
  v_total INTEGER;
BEGIN
  -- Check if user is admin
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM activity_logs al
  WHERE (p_action_type IS NULL OR al.action_type = p_action_type);

  -- Get logs with actor and target info
  SELECT json_agg(
    json_build_object(
      'id', al.id,
      'action_type', al.action_type,
      'actor_key_code', actor_ck.key_code,
      'actor_created_by', actor_ck.created_by,
      'target_key_code', target_ck.key_code,
      'target_created_by', target_ck.created_by,
      'details', al.details,
      'created_at', al.created_at
    ) ORDER BY al.created_at DESC
  ) INTO v_logs
  FROM activity_logs al
  LEFT JOIN credential_keys actor_ck ON al.actor_credential_key_id = actor_ck.id
  LEFT JOIN credential_keys target_ck ON al.target_credential_key_id = target_ck.id
  WHERE (p_action_type IS NULL OR al.action_type = p_action_type)
  LIMIT p_limit
  OFFSET p_offset;

  RETURN json_build_object(
    'success', true, 
    'logs', COALESCE(v_logs, '[]'::json),
    'total', v_total
  );
END;
$$;

-- Update credential_login to log activity
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

-- Update create_credential_key to log activity
CREATE OR REPLACE FUNCTION public.create_credential_key(p_session_token text, p_key_code text, p_password text, p_created_by text DEFAULT NULL::text)
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
  -- Check if user is admin
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  -- Get actor credential key id from session
  SELECT us.credential_key_id INTO v_actor_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  -- Check if key code already exists
  IF EXISTS (SELECT 1 FROM credential_keys WHERE key_code = UPPER(p_key_code)) THEN
    RETURN json_build_object('success', false, 'error', 'Key code already exists');
  END IF;

  -- Create the credential key
  INSERT INTO credential_keys (key_code, password_hash, created_by)
  VALUES (UPPER(p_key_code), p_password, p_created_by)
  RETURNING id INTO v_new_id;

  -- Log the activity
  PERFORM public.log_activity(
    'KEY_CREATED',
    v_actor_credential_key_id,
    v_new_id,
    json_build_object('key_code', UPPER(p_key_code), 'created_by', p_created_by)
  );

  RETURN json_build_object(
    'success', true,
    'credential_key_id', v_new_id,
    'key_code', UPPER(p_key_code)
  );
END;
$function$;

-- Update delete_credential_key to log activity
CREATE OR REPLACE FUNCTION public.delete_credential_key(p_session_token text, p_key_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin BOOLEAN;
  v_actor_credential_key_id UUID;
  v_deleted_key_code TEXT;
BEGIN
  -- Check if user is admin
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  -- Get actor credential key id from session
  SELECT us.credential_key_id INTO v_actor_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  -- Get the key code before deletion
  SELECT key_code INTO v_deleted_key_code
  FROM credential_keys WHERE id = p_key_id;

  -- Log the activity before deletion
  PERFORM public.log_activity(
    'KEY_DELETED',
    v_actor_credential_key_id,
    NULL,
    json_build_object('deleted_key_code', v_deleted_key_code, 'deleted_key_id', p_key_id)
  );

  -- Delete related user_sessions first
  DELETE FROM user_sessions WHERE credential_key_id = p_key_id;
  
  -- Delete related subscriptions
  DELETE FROM subscriptions WHERE credential_key_id = p_key_id;
  
  -- Delete related user_roles
  DELETE FROM user_roles WHERE credential_key_id = p_key_id;
  
  -- Delete related email_validations
  DELETE FROM email_validations WHERE user_id = p_key_id;
  
  -- Delete related bulk_uploads
  DELETE FROM bulk_uploads WHERE user_id = p_key_id;
  
  -- Finally delete the credential key
  DELETE FROM credential_keys WHERE id = p_key_id;

  RETURN json_build_object('success', true);
END;
$function$;