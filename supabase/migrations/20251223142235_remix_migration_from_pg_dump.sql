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
-- Name: create_credential_key(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_credential_key(p_session_token text, p_key_code text, p_password text, p_created_by text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_new_id UUID;
BEGIN
  -- Check if user is admin
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  -- Check if key code already exists
  IF EXISTS (SELECT 1 FROM credential_keys WHERE key_code = UPPER(p_key_code)) THEN
    RETURN json_build_object('success', false, 'error', 'Key code already exists');
  END IF;

  -- Create the credential key
  INSERT INTO credential_keys (key_code, password_hash, created_by)
  VALUES (UPPER(p_key_code), p_password, p_created_by)
  RETURNING id INTO v_new_id;

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
    SET search_path TO 'public'
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


--
-- Name: delete_credential_key(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_credential_key(p_session_token text, p_key_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  DELETE FROM credential_keys WHERE id = p_key_id;

  RETURN json_build_object('success', true);
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


SET default_table_access_method = heap;

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
    user_id uuid NOT NULL,
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
-- Name: bulk_uploads bulk_uploads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_uploads
    ADD CONSTRAINT bulk_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: credential_keys credential_keys_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential_keys
    ADD CONSTRAINT credential_keys_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: email_validations email_validations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_validations
    ADD CONSTRAINT email_validations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: user_roles Admins can read all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (true);


--
-- Name: user_sessions Allow session creation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow session creation" ON public.user_sessions FOR INSERT WITH CHECK (true);


--
-- Name: user_sessions Allow session updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow session updates" ON public.user_sessions FOR UPDATE USING (true);


--
-- Name: credential_keys Anyone can check if a key exists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can check if a key exists" ON public.credential_keys FOR SELECT USING (true);


--
-- Name: user_sessions Anyone can check sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can check sessions" ON public.user_sessions FOR SELECT USING (true);


--
-- Name: bulk_uploads Users can delete their own bulk uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bulk uploads" ON public.bulk_uploads FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: email_validations Users can delete their own validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own validations" ON public.email_validations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bulk_uploads Users can insert their own bulk uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bulk uploads" ON public.bulk_uploads FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: email_validations Users can insert their own validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own validations" ON public.email_validations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bulk_uploads Users can update their own bulk uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bulk uploads" ON public.bulk_uploads FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: subscriptions Users can update their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bulk_uploads Users can view their own bulk uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bulk uploads" ON public.bulk_uploads FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: email_validations Users can view their own validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own validations" ON public.email_validations FOR SELECT USING ((auth.uid() = user_id));


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