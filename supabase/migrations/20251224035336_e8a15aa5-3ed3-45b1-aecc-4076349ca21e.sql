-- Update get_all_credential_keys to return password for unused keys
CREATE OR REPLACE FUNCTION public.get_all_credential_keys(p_session_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;