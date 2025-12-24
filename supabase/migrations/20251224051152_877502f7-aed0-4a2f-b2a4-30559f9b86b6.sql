-- Drop and recreate log_activity with JSON type instead of JSONB
DROP FUNCTION IF EXISTS public.log_activity(TEXT, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action_type TEXT,
  p_actor_credential_key_id UUID,
  p_target_credential_key_id UUID DEFAULT NULL,
  p_details JSON DEFAULT '{}'
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
  VALUES (p_action_type, p_actor_credential_key_id, p_target_credential_key_id, p_details::jsonb)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;