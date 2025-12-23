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
    created_by text
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
-- Name: credential_keys Anyone can check if a key exists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can check if a key exists" ON public.credential_keys FOR SELECT USING (true);


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
-- PostgreSQL database dump complete
--




COMMIT;