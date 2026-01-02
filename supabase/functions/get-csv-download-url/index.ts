import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csvPath, credentialKeyId } = await req.json();

    if (!csvPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'CSV path is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!credentialKeyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credential key ID is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Download request - Path: ${csvPath}, Credential: ${credentialKeyId}`);

    // Verify credential key exists and is valid
    const { data: credentialKey, error: keyError } = await supabase
      .from('credential_keys')
      .select('id, is_used')
      .eq('id', credentialKeyId)
      .single();

    if (keyError || !credentialKey || !credentialKey.is_used) {
      console.error('Invalid credential key:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credential key' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Extract folder name from CSV path (format: credentialKeyId/filename.csv)
    const pathParts = csvPath.split('/');
    const folderName = pathParts[0];

    console.log(`Folder: ${folderName}, Checking against: ${credentialKeyId}`);

    // Verify ownership: folder name must start with the credential key ID
    if (!folderName.startsWith(credentialKeyId)) {
      console.error('Unauthorized access attempt:', { folderName, credentialKeyId, csvPath });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: You do not have access to this file'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    console.log(`Generating signed URL for: ${csvPath}`);

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('bulk-validation-csvs')
      .createSignedUrl(csvPath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }

    console.log('Signed URL generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        url: data.signedUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});