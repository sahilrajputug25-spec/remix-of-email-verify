-- Create function to update bulk upload with final counts
CREATE OR REPLACE FUNCTION public.update_bulk_upload_counts(
  p_session_token TEXT,
  p_upload_id UUID,
  p_valid_count INTEGER,
  p_invalid_count INTEGER,
  p_risky_count INTEGER
)
RETURNS JSON
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
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  -- Update the bulk upload with counts and mark as completed
  UPDATE bulk_uploads
  SET 
    valid_count = p_valid_count,
    invalid_count = p_invalid_count,
    risky_count = p_risky_count,
    status = 'completed',
    completed_at = now()
  WHERE id = p_upload_id AND user_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$$;