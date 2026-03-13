
-- Create webhook_urls table for storing user webhook configurations
CREATE TABLE public.webhook_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credential_key_id UUID NOT NULL REFERENCES public.credential_keys(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_urls ENABLE ROW LEVEL SECURITY;

-- Block direct access (all access via RPC functions)
CREATE POLICY "No direct select on webhook_urls" ON public.webhook_urls FOR SELECT USING (false);
CREATE POLICY "No direct insert on webhook_urls" ON public.webhook_urls FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on webhook_urls" ON public.webhook_urls FOR UPDATE USING (false);
CREATE POLICY "No direct delete on webhook_urls" ON public.webhook_urls FOR DELETE USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_webhook_urls_updated_at
  BEFORE UPDATE ON public.webhook_urls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: Get user webhooks
CREATE OR REPLACE FUNCTION public.get_user_webhooks(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credential_key_id UUID;
  v_webhooks JSON;
BEGIN
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id, 'url', url, 'is_active', is_active, 'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO v_webhooks
  FROM webhook_urls
  WHERE credential_key_id = v_credential_key_id;

  RETURN json_build_object('success', true, 'webhooks', COALESCE(v_webhooks, '[]'::json));
END;
$$;

-- RPC: Add webhook
CREATE OR REPLACE FUNCTION public.add_webhook(p_session_token text, p_url text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credential_key_id UUID;
  v_webhook_id UUID;
BEGIN
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  INSERT INTO webhook_urls (credential_key_id, url)
  VALUES (v_credential_key_id, p_url)
  RETURNING id INTO v_webhook_id;

  RETURN json_build_object('success', true, 'webhook_id', v_webhook_id);
END;
$$;

-- RPC: Delete webhook
CREATE OR REPLACE FUNCTION public.delete_webhook(p_session_token text, p_webhook_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credential_key_id UUID;
BEGIN
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  DELETE FROM webhook_urls
  WHERE id = p_webhook_id AND credential_key_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: Toggle webhook active status
CREATE OR REPLACE FUNCTION public.toggle_webhook(p_session_token text, p_webhook_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credential_key_id UUID;
BEGIN
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  UPDATE webhook_urls
  SET is_active = NOT is_active
  WHERE id = p_webhook_id AND credential_key_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$$;
