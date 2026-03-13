import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { upload_id, credential_key_id } = await req.json();
    if (!upload_id || !credential_key_id) {
      return new Response(
        JSON.stringify({ error: 'Missing upload_id or credential_key_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get active webhooks for this user
    const { data: webhooks, error: whError } = await supabase
      .from('webhook_urls')
      .select('url')
      .eq('credential_key_id', credential_key_id)
      .eq('is_active', true);
    if (whError || !webhooks?.length) {
      return new Response(
        JSON.stringify({ message: 'No active webhooks found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Get upload details
    const { data: upload, error: upError } = await supabase
      .from('bulk_uploads')
      .select('*')
      .eq('id', upload_id)
      .single();
    if (upError || !upload) {
      return new Response(
        JSON.stringify({ error: 'Upload not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const payload = {
      event: 'bulk_validation_completed',
      timestamp: new Date().toISOString(),
      data: {
        upload_id: upload.id,
        file_name: upload.file_name,
        status: upload.status,
        total_emails: upload.total_emails,
        valid_count: upload.valid_count,
        invalid_count: upload.invalid_count,
        risky_count: upload.risky_count,
        completed_at: upload.completed_at,
      },
    };
    // Fire webhooks (best effort)
    const results = await Promise.allSettled(
      webhooks.map((wh) =>
        fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      )
    );
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});