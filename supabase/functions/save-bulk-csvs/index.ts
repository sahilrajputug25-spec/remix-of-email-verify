import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  email: string;
  status: 'valid' | 'invalid' | 'risky';
  syntaxValid: boolean;
  domainExists: boolean;
  mxRecords: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isCatchAll: boolean;
  domain: string;
}

interface RequestBody {
  uploadId: string;
  credentialKeyId: string;
  results: ValidationResult[];
  fileName: string;
}

function generateCSV(results: ValidationResult[]): string {
  const headers = ['Email', 'Status', 'Syntax Valid', 'Domain Exists', 'MX Records', 'Disposable', 'Role-Based', 'Domain'];
  const rows = results.map(r => [
    r.email,
    r.status.toUpperCase(),
    r.syntaxValid ? 'Yes' : 'No',
    r.domainExists ? 'Yes' : 'No',
    r.mxRecords ? 'Yes' : 'No',
    r.isDisposable ? 'Yes' : 'No',
    r.isRoleBased ? 'Yes' : 'No',
    r.domain
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { uploadId, credentialKeyId, results, fileName } = await req.json() as RequestBody;

    console.log(`Saving CSVs for upload ${uploadId} with ${results.length} results`);

    // Separate valid and invalid emails
    const validEmails = results.filter(r => r.status === 'valid');
    const invalidEmails = results.filter(r => r.status === 'invalid' || r.status === 'risky');

    console.log(`Valid: ${validEmails.length}, Invalid/Risky: ${invalidEmails.length}`);

    // Generate CSVs
    const validCSV = generateCSV(validEmails);
    const invalidCSV = generateCSV(invalidEmails);

    const timestamp = Date.now();
    const baseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Upload valid CSV
    const validPath = `${credentialKeyId}/${uploadId}_${baseName}_valid_${timestamp}.csv`;
    const { error: validUploadError } = await supabase.storage
      .from('bulk-validation-csvs')
      .upload(validPath, validCSV, {
        contentType: 'text/csv',
        upsert: true
      });

    if (validUploadError) {
      console.error('Error uploading valid CSV:', validUploadError);
      throw validUploadError;
    }

    // Upload invalid CSV
    const invalidPath = `${credentialKeyId}/${uploadId}_${baseName}_invalid_${timestamp}.csv`;
    const { error: invalidUploadError } = await supabase.storage
      .from('bulk-validation-csvs')
      .upload(invalidPath, invalidCSV, {
        contentType: 'text/csv',
        upsert: true
      });

    if (invalidUploadError) {
      console.error('Error uploading invalid CSV:', invalidUploadError);
      throw invalidUploadError;
    }

    console.log(`CSVs saved: valid=${validPath}, invalid=${invalidPath}`);

    return new Response(
      JSON.stringify({
        success: true,
        validCsvPath: validPath,
        invalidCsvPath: invalidPath,
        validCount: validEmails.length,
        invalidCount: invalidEmails.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Error saving CSVs:', error);
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