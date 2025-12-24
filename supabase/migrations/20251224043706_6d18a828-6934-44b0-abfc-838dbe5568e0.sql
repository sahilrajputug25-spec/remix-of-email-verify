-- Update delete_credential_key function to handle related records
CREATE OR REPLACE FUNCTION public.delete_credential_key(p_session_token text, p_key_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  v_is_admin := public.is_admin(p_session_token);
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

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