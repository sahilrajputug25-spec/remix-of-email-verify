-- Create a batch save function for email validations
CREATE OR REPLACE FUNCTION public.batch_save_email_validations(
  p_credential_key_id uuid,
  p_validations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_validation jsonb;
BEGIN
  -- Insert all validations in a single batch
  INSERT INTO email_validations (
    user_id,
    email,
    syntax_valid,
    domain_exists,
    mx_records,
    is_disposable,
    is_role_based,
    is_catch_all,
    domain,
    status
  )
  SELECT 
    p_credential_key_id,
    (v->>'email')::text,
    COALESCE((v->>'syntax_valid')::boolean, false),
    COALESCE((v->>'domain_exists')::boolean, false),
    COALESCE((v->>'mx_records')::boolean, false),
    COALESCE((v->>'is_disposable')::boolean, false),
    COALESCE((v->>'is_role_based')::boolean, false),
    COALESCE((v->>'is_catch_all')::boolean, false),
    (v->>'domain')::text,
    (v->>'status')::text
  FROM jsonb_array_elements(p_validations) AS v;
  
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', v_inserted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
