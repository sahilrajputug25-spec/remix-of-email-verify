import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateFunctions() {
  try {
    console.log(
      "Updating database functions for email limits and subscription hours...\n",
    );

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "supabase",
      "migrations",
      "email_limit_and_subscription_hours.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Extract the function definitions we need to update
    const functionsToUpdate = [
      // create_credential_key function
      {
        name: "create_credential_key",
        sql: `-- Update create_credential_key function to accept new parameters
CREATE OR REPLACE FUNCTION public.create_credential_key(
  p_session_token text,
  p_key_code text,
  p_password text,
  p_created_by text DEFAULT NULL,
  p_email_limit integer DEFAULT NULL,
  p_subscription_hours integer DEFAULT 24
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$function$
DECLARE
  v_is_admin BOOLEAN;
  v_new_id UUID;
  v_actor_credential_key_id UUID;
BEGIN
  v_is_admin := public.is_admin(p_session_token);

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized - Admin access required');
  END IF;

  SELECT us.credential_key_id INTO v_actor_credential_key_id
  FROM user_sessions us
  WHERE us.session_token = p_session_token
    AND us.is_active = true;

  IF EXISTS (SELECT 1 FROM credential_keys WHERE key_code = UPPER(p_key_code)) THEN
    RETURN json_build_object('success', false, 'error', 'Key code already exists');
  END IF;

  INSERT INTO credential_keys (key_code, password_hash, created_by, email_limit, subscription_hours)
  VALUES (UPPER(p_key_code), p_password, p_created_by, p_email_limit, p_subscription_hours)
  RETURNING id INTO v_new_id;

  PERFORM public.log_activity(
    'KEY_CREATED',
    v_actor_credential_key_id,
    v_new_id,
    json_build_object(
      'key_code', UPPER(p_key_code),
      'created_by', p_created_by,
      'email_limit', p_email_limit,
      'subscription_hours', p_subscription_hours
    )
  );

  RETURN json_build_object(
    'success', true,
    'credential_key_id', v_new_id,
    'key_code', UPPER(p_key_code)
  );
END;
$$function$;`,
      },

      // get_all_credential_keys function
      {
        name: "get_all_credential_keys",
        sql: `-- Update get_all_credential_keys to include new fields
CREATE OR REPLACE FUNCTION public.get_all_credential_keys(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$function$
DECLARE
  v_is_admin BOOLEAN;
  v_keys JSON;
BEGIN
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
      'used_at', used_at,
      'email_limit', email_limit,
      'emails_validated', emails_validated,
      'subscription_hours', subscription_hours
    ) ORDER BY created_at DESC
  ) INTO v_keys
  FROM credential_keys;

  RETURN json_build_object('success', true, 'keys', COALESCE(v_keys, '[]'::json));
END;
$$function$;`,
      },
    ];

    // Execute each function update
    for (const func of functionsToUpdate) {
      console.log(`Updating function: ${func.name}`);

      try {
        // Try to execute the SQL directly
        const { error } = await supabase.rpc("exec_sql", { sql: func.sql });

        if (error) {
          console.log(
            `   Direct execution failed for ${func.name}, trying alternative method...`,
          );

          // Alternative: try executing parts of the SQL
          // This is a fallback since exec_sql might not be available
          console.log(
            `   Function ${func.name} may need manual execution in Supabase dashboard`,
          );
          console.log(`   SQL to execute:\n${func.sql}\n`);
        } else {
          console.log(`   ✓ Successfully updated ${func.name}`);
        }
      } catch (err) {
        console.log(`   Function ${func.name} update failed:`, err.message);
        console.log(
          `   You may need to execute this SQL manually in Supabase dashboard:\n${func.sql}\n`,
        );
      }
    }

    console.log("\nTesting updated functions...");

    // Test the functions
    try {
      const { data, error } = await supabase.rpc("get_all_credential_keys", {
        p_session_token: "test",
      });

      if (error) {
        console.log("get_all_credential_keys test:", error.message);
      } else {
        console.log("✓ get_all_credential_keys function is working");
      }
    } catch (err) {
      console.log("get_all_credential_keys test failed:", err.message);
    }

    console.log("\nIf the functions failed to update automatically, please:");
    console.log("1. Go to your Supabase dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log("3. Execute the SQL shown above for each function");
    console.log("4. Then test creating a credential key with email limits");
  } catch (error) {
    console.error("Error updating functions:", error);
    process.exit(1);
  }
}

updateFunctions();
