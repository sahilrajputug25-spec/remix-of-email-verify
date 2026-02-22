-- Create a function to get all bulk uploads for admins
CREATE OR REPLACE FUNCTION public.get_all_bulk_uploads(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credential_key_id UUID;
  v_is_admin BOOLEAN;
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

  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE credential_key_id = v_credential_key_id 
    AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Access denied. Admin privileges required.');
  END IF;

  -- Get all bulk uploads with user info
  SELECT json_agg(
    json_build_object(
      'id', bu.id,
      'file_name', bu.file_name,
      'status', bu.status,
      'total_emails', bu.total_emails,
      'valid_count', bu.valid_count,
      'invalid_count', bu.invalid_count,
      'risky_count', bu.risky_count,
      'country', bu.country,
      'valid_csv_path', bu.valid_csv_path,
      'invalid_csv_path', bu.invalid_csv_path,
      'created_at', bu.created_at,
      'completed_at', bu.completed_at,
      'user_id', bu.user_id,
      'user_key_code', ck.key_code
    ) ORDER BY bu.created_at DESC
  ) INTO v_uploads
  FROM bulk_uploads bu
  LEFT JOIN credential_keys ck ON ck.id = bu.user_id;

  RETURN json_build_object('success', true, 'uploads', COALESCE(v_uploads, '[]'::json));
END;
$function$;