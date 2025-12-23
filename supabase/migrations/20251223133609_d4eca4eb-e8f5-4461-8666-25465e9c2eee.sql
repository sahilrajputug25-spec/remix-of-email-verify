-- Create credential keys table (admin creates these keys for clients)
CREATE TABLE public.credential_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT -- Admin identifier who created the key
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_key_id UUID REFERENCES public.credential_keys(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credential_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Credential keys policies (users can only read unused keys to validate them)
CREATE POLICY "Anyone can check if a key exists"
ON public.credential_keys
FOR SELECT
USING (true);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to activate subscription with credential key
CREATE OR REPLACE FUNCTION public.activate_subscription(p_key_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_active ON public.subscriptions(user_id, is_active, expires_at);
CREATE INDEX idx_credential_keys_code ON public.credential_keys(key_code);