-- Create storage bucket for bulk validation CSV files
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-validation-csvs', 'bulk-validation-csvs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own CSV files
CREATE POLICY "Users can read own CSV files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bulk-validation-csvs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to insert CSV files (will be done via edge function)
CREATE POLICY "Service role can insert CSV files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bulk-validation-csvs');

-- Add columns to bulk_uploads to store CSV file paths
ALTER TABLE public.bulk_uploads
ADD COLUMN IF NOT EXISTS valid_csv_path TEXT,
ADD COLUMN IF NOT EXISTS invalid_csv_path TEXT;


-- Update the update_bulk_upload function to include CSV paths
CREATE OR REPLACE FUNCTION public.update_bulk_upload(
  p_session_token text, 
  p_upload_id uuid, 
  p_valid_count integer, 
  p_invalid_count integer, 
  p_risky_count integer, 
  p_status text DEFAULT 'completed'::text,
  p_valid_csv_path text DEFAULT NULL,
  p_invalid_csv_path text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  UPDATE bulk_uploads
  SET valid_count = p_valid_count,
      invalid_count = p_invalid_count,
      risky_count = p_risky_count,
      status = p_status,
      valid_csv_path = p_valid_csv_path,
      invalid_csv_path = p_invalid_csv_path,
      completed_at = now()
  WHERE id = p_upload_id AND user_id = v_credential_key_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Create function to get bulk upload by id
CREATE OR REPLACE FUNCTION public.get_bulk_upload_by_id(p_session_token text, p_upload_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credential_key_id UUID;
  v_upload RECORD;
BEGIN
  -- Get credential key id from session
  SELECT us.credential_key_id INTO v_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF v_credential_key_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid session');
  END IF;

  SELECT * INTO v_upload
  FROM bulk_uploads
  WHERE id = p_upload_id AND user_id = v_credential_key_id;

  IF v_upload IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Upload not found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'upload', json_build_object(
      'id', v_upload.id,
      'file_name', v_upload.file_name,
      'status', v_upload.status,
      'total_emails', v_upload.total_emails,
      'valid_count', v_upload.valid_count,
      'invalid_count', v_upload.invalid_count,
      'risky_count', v_upload.risky_count,
      'country', v_upload.country,
      'valid_csv_path', v_upload.valid_csv_path,
      'invalid_csv_path', v_upload.invalid_csv_path,
      'created_at', v_upload.created_at,
      'completed_at', v_upload.completed_at
    )
  );
END;
$$;