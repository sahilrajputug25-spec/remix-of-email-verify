CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: activate_subscription(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.activate_subscription(p_key_code text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_key_record RECORD;
  v_user_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_subscription_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if key exists and is unused
  SELECT * INTO v_key_record
  FROM public.credential_keys
  WHERE key_code = p_key_code
  AND is_used = false;
  
  IF v_key_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or already used credential key');
  END IF;
  
  -- Calculate expiry at 11:59:59 PM today (or tomorrow if after 11pm)
  v_expires_at := (CURRENT_DATE + INTERVAL '23 hours 59 minutes 59 seconds')::TIMESTAMP WITH TIME ZONE;
  
  -- If current time is past 11pm, set expiry to tomorrow 11:59:59 PM
  IF CURRENT_TIME > TIME '23:00:00' THEN
    v_expires_at := v_expires_at + INTERVAL '1 day';
  END IF;
  
  -- Mark key as used
  UPDATE public.credential_keys
  SET is_used = true,
      used_by = v_user_id,
      used_at = now(),
      expires_at = v_expires_at
  WHERE id = v_key_record.id;
  
  -- Deactivate any existing active subscriptions
  UPDATE public.subscriptions
  SET is_active = false
  WHERE user_id = v_user_id AND is_active = true;
  
  -- Create new subscription
  INSERT INTO public.subscriptions (user_id, credential_key_id, expires_at, is_active)
  VALUES (v_user_id, v_key_record.id, v_expires_at, true)
  RETURNING id INTO v_subscription_id;
  
  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'expires_at', v_expires_at
  );
END;
$$;


--
-- Name: create_bulk_upload(text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_bulk_upload(p_session_token text, p_file_name text, p_total_emails integer, p_country text DEFAULT 'US'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: create_credential_key(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_credential_key(p_session_token text, p_key_code text, p_password text, p_created_by text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: credential_login(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.credential_login(p_key_code text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
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
$$;


--
-- Name: delete_bulk_upload(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_bulk_upload(p_session_token text, p_upload_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: delete_credential_key(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_credential_key(p_session_token text, p_key_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: delete_email_validation(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_email_validation(p_session_token text, p_validation_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_activity_logs(text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_activity_logs(p_session_token text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_action_type text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_all_credential_keys(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_credential_keys(p_session_token text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_keys JSON;
BEGIN
  -- Check if user is admin
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
      'used_at', used_at
    ) ORDER BY created_at DESC
  ) INTO v_keys
  FROM credential_keys;

  RETURN json_build_object('success', true, 'keys', COALESCE(v_keys, '[]'::json));
END;
$$;


--
-- Name: get_user_bulk_uploads(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_bulk_uploads(p_session_token text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_user_email_validations(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_email_validations(p_session_token text, p_limit integer DEFAULT 100) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: get_user_subscription(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_subscription(p_session_token text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: has_active_subscription(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_subscription(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > now()
  );
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(p_credential_key_id uuid, p_role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE credential_key_id = p_credential_key_id
      AND role = p_role
  )
$$;


--
-- Name: is_admin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(p_session_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_credential_key_id UUID;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.has_role(v_credential_key_id, 'admin');
END;
$$;


--
-- Name: log_activity(text, uuid, uuid, json); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_activity(p_action_type text, p_actor_credential_key_id uuid, p_target_credential_key_id uuid DEFAULT NULL::uuid, p_details json DEFAULT '{}'::json) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (action_type, actor_credential_key_id, target_credential_key_id, details)
  VALUES (p_action_type, p_actor_credential_key_id, p_target_credential_key_id, p_details::jsonb)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


--
-- Name: save_email_validation(uuid, text, boolean, boolean, boolean, boolean, boolean, boolean, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_email_validation(p_credential_key_id uuid, p_email text, p_syntax_valid boolean, p_domain_exists boolean, p_mx_records boolean, p_is_disposable boolean, p_is_role_based boolean, p_is_catch_all boolean, p_domain text, p_status text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: update_bulk_upload(text, uuid, integer, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bulk_upload(p_session_token text, p_upload_id uuid, p_valid_count integer, p_invalid_count integer, p_risky_count integer, p_status text DEFAULT 'completed'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_session(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_session(p_session_token text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    actor_credential_key_id uuid,
    target_credential_key_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bulk_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    total_emails integer DEFAULT 0,
    valid_count integer DEFAULT 0,
    invalid_count integer DEFAULT 0,
    risky_count integer DEFAULT 0,
    status text DEFAULT 'processing'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    country text DEFAULT 'US'::text,
    CONSTRAINT bulk_uploads_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: credential_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credential_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_code text NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_by uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_by text,
    password_hash text
);


--
-- Name: email_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    syntax_valid boolean DEFAULT false,
    domain_exists boolean DEFAULT false,
    mx_records boolean DEFAULT false,
    is_disposable boolean DEFAULT false,
    is_role_based boolean DEFAULT false,
    is_catch_all boolean DEFAULT false,
    domain text,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    country text,
    CONSTRAINT email_validations_status_check CHECK ((status = ANY (ARRAY['valid'::text, 'invalid'::text, 'risky'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    credential_key_id uuid,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credential_key_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_token text NOT NULL,
    credential_key_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: bulk_uploads bulk_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_uploads
    ADD CONSTRAINT bulk_uploads_pkey PRIMARY KEY (id);


--
-- Name: credential_keys credential_keys_key_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential_keys
    ADD CONSTRAINT credential_keys_key_code_key UNIQUE (key_code);


--
-- Name: credential_keys credential_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential_keys
    ADD CONSTRAINT credential_keys_pkey PRIMARY KEY (id);


--
-- Name: email_validations email_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_validations
    ADD CONSTRAINT email_validations_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_credential_key_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_credential_key_id_role_key UNIQUE (credential_key_id, role);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: idx_activity_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action_type ON public.activity_logs USING btree (action_type);


--
-- Name: idx_activity_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor_credential_key_id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_bulk_uploads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_uploads_created_at ON public.bulk_uploads USING btree (created_at DESC);


--
-- Name: idx_bulk_uploads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_uploads_user_id ON public.bulk_uploads USING btree (user_id);


--
-- Name: idx_credential_keys_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credential_keys_code ON public.credential_keys USING btree (key_code);


--
-- Name: idx_email_validations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_validations_created_at ON public.email_validations USING btree (created_at DESC);


--
-- Name: idx_email_validations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_validations_user_id ON public.email_validations USING btree (user_id);


--
-- Name: idx_subscriptions_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_active ON public.subscriptions USING btree (user_id, is_active, expires_at);


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_actor_credential_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_actor_credential_key_id_fkey FOREIGN KEY (actor_credential_key_id) REFERENCES public.credential_keys(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_target_credential_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_target_credential_key_id_fkey FOREIGN KEY (target_credential_key_id) REFERENCES public.credential_keys(id) ON DELETE SET NULL;


--
-- Name: credential_keys credential_keys_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential_keys
    ADD CONSTRAINT credential_keys_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_credential_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_credential_key_id_fkey FOREIGN KEY (credential_key_id) REFERENCES public.credential_keys(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_credential_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_credential_key_id_fkey FOREIGN KEY (credential_key_id) REFERENCES public.credential_keys(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_credential_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_credential_key_id_fkey FOREIGN KEY (credential_key_id) REFERENCES public.credential_keys(id);


--
-- Name: credential_keys No direct access to credential_keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to credential_keys" ON public.credential_keys FOR SELECT TO authenticated, anon USING (false);


--
-- Name: bulk_uploads No direct delete on bulk_uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct delete on bulk_uploads" ON public.bulk_uploads FOR DELETE TO authenticated, anon USING (false);


--
-- Name: email_validations No direct delete on email_validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct delete on email_validations" ON public.email_validations FOR DELETE TO authenticated, anon USING (false);


--
-- Name: activity_logs No direct insert on activity_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert on activity_logs" ON public.activity_logs FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: bulk_uploads No direct insert on bulk_uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert on bulk_uploads" ON public.bulk_uploads FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: email_validations No direct insert on email_validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert on email_validations" ON public.email_validations FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: subscriptions No direct insert on subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert on subscriptions" ON public.subscriptions FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: user_sessions No direct insert on user_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert on user_sessions" ON public.user_sessions FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: activity_logs No direct select on activity_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct select on activity_logs" ON public.activity_logs FOR SELECT TO authenticated, anon USING (false);


--
-- Name: bulk_uploads No direct select on bulk_uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct select on bulk_uploads" ON public.bulk_uploads FOR SELECT TO authenticated, anon USING (false);


--
-- Name: email_validations No direct select on email_validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct select on email_validations" ON public.email_validations FOR SELECT TO authenticated, anon USING (false);


--
-- Name: subscriptions No direct select on subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct select on subscriptions" ON public.subscriptions FOR SELECT TO authenticated, anon USING (false);


--
-- Name: user_roles No direct select on user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct select on user_roles" ON public.user_roles FOR SELECT TO authenticated, anon USING (false);


--
-- Name: user_sessions No direct select on user_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct select on user_sessions" ON public.user_sessions FOR SELECT TO authenticated, anon USING (false);


--
-- Name: bulk_uploads No direct update on bulk_uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct update on bulk_uploads" ON public.bulk_uploads FOR UPDATE TO authenticated, anon USING (false);


--
-- Name: subscriptions No direct update on subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct update on subscriptions" ON public.subscriptions FOR UPDATE TO authenticated, anon USING (false);


--
-- Name: user_sessions No direct update on user_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct update on user_sessions" ON public.user_sessions FOR UPDATE TO authenticated, anon USING (false);


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: bulk_uploads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: credential_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credential_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: email_validations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_validations ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;