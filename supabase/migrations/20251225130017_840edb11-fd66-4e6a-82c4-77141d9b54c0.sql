
-- Create RPC functions for secure data access

-- Function to get user's email validations
CREATE OR REPLACE FUNCTION public.get_user_email_validations(p_session_token text, p_limit integer DEFAULT 100)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_validations JSON;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'status', status,
      'domain', domain,
      'syntax_valid', syntax_valid,
      'domain_exists', domain_exists,
      'mx_records', mx_records,
      'is_disposable', is_disposable,
      'is_role_based', is_role_based,
      'is_catch_all', is_catch_all,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO v_validations
  FROM email_validations
  WHERE user_id = v_credential_key_id
  LIMIT p_limit;

  RETURN json_build_object('success', true, 'validations', COALESCE(v_validations, '[]'::json));
END;
$function$;

-- Function to get user's subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_is_admin BOOLEAN;
  v_subscription RECORD;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  -- Check if admin
  v_is_admin := public.has_role(v_credential_key_id, 'admin');

  -- Get active subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE credential_key_id = v_credential_key_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'is_admin', v_is_admin,
    'subscription', CASE 
      WHEN v_subscription IS NULL THEN NULL
      ELSE json_build_object(
        'id', v_subscription.id,
        'credential_key_id', v_subscription.credential_key_id,
        'activated_at', v_subscription.activated_at,
        'expires_at', v_subscription.expires_at,
        'is_active', v_subscription.is_active,
        'created_at', v_subscription.created_at
      )
    END
  );
END;
$function$;

-- Function to get user's bulk uploads
CREATE OR REPLACE FUNCTION public.get_user_bulk_uploads(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_uploads JSON;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'file_name', file_name,
      'status', status,
      'total_emails', total_emails,
      'valid_count', valid_count,
      'invalid_count', invalid_count,
      'risky_count', risky_count,
      'country', country,
      'created_at', created_at,
      'completed_at', completed_at
    ) ORDER BY created_at DESC
  ) INTO v_uploads
  FROM bulk_uploads
  WHERE user_id = v_credential_key_id;

  RETURN json_build_object('success', true, 'uploads', COALESCE(v_uploads, '[]'::json));
END;
$function$;

-- Function to create bulk upload
CREATE OR REPLACE FUNCTION public.create_bulk_upload(
  p_session_token text,
  p_file_name text,
  p_total_emails integer,
  p_country text DEFAULT 'US'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_upload_id UUID;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  INSERT INTO bulk_uploads (user_id, file_name, total_emails, country, status)
  VALUES (v_credential_key_id, p_file_name, p_total_emails, p_country, 'processing')
  RETURNING id INTO v_upload_id;

  RETURN json_build_object('success', true, 'upload_id', v_upload_id);
END;
$function$;

-- Function to update bulk upload results
CREATE OR REPLACE FUNCTION public.update_bulk_upload(
  p_session_token text,
  p_upload_id uuid,
  p_valid_count integer,
  p_invalid_count integer,
  p_risky_count integer,
  p_status text DEFAULT 'completed'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  UPDATE bulk_uploads
  SET valid_count = p_valid_count,
      invalid_count = p_invalid_count,
      risky_count = p_risky_count,
      status = p_status,
      completed_at = now()
  WHERE id = p_upload_id AND user_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$function$;

-- Function to delete bulk upload
CREATE OR REPLACE FUNCTION public.delete_bulk_upload(p_session_token text, p_upload_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  DELETE FROM bulk_uploads
  WHERE id = p_upload_id AND user_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$function$;

-- Function to delete email validation
CREATE OR REPLACE FUNCTION public.delete_email_validation(p_session_token text, p_validation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  DELETE FROM email_validations
  WHERE id = p_validation_id AND user_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$function$;
