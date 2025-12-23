-- Create admin roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_key_id UUID REFERENCES public.credential_keys(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (credential_key_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(p_credential_key_id UUID, p_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE credential_key_id = p_credential_key_id
      AND role = p_role
  )
$$;

-- RLS policy for user_roles - only admins can read
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
USING (true);

-- Create function to check if credential is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create function to generate a new credential key (admin only)
CREATE OR REPLACE FUNCTION public.create_credential_key(
  p_session_token TEXT,
  p_key_code TEXT,
  p_password TEXT,
  p_created_by TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create function to get all credential keys (admin only)
CREATE OR REPLACE FUNCTION public.get_all_credential_keys(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create function to delete a credential key (admin only)
CREATE OR REPLACE FUNCTION public.delete_credential_key(p_session_token TEXT, p_key_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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