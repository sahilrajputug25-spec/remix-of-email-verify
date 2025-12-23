import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Disposable email domains list
const disposableDomains = [
  'tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'getairmail.com', 'yopmail.com', 'discard.email', 'getnada.com',
  'mohmal.com', 'tempail.com', 'burnermail.io', 'sharklasers.com',
  'maildrop.cc', 'mytemp.email', 'emailondeck.com', 'spamgourmet.com'
];

// Role-based email prefixes
const rolePrefixes = [
  'info', 'admin', 'support', 'sales', 'contact', 'help', 'hello',
  'team', 'office', 'marketing', 'webmaster', 'postmaster', 'abuse',
  'noreply', 'no-reply', 'billing', 'accounts', 'hr', 'jobs', 'careers',
  'feedback', 'press', 'media', 'legal', 'privacy', 'security'
];

interface ValidationResult {
  email: string;
  syntaxValid: boolean;
  domainExists: boolean;
  mxRecords: boolean;
  mxHosts: string[];
  isDisposable: boolean;
  isRoleBased: boolean;
  isCatchAll: boolean;
  domain: string;
  status: 'valid' | 'invalid' | 'risky';
}

function validateEmailSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim().toLowerCase());
}

function extractDomain(email: string): string {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : '';
}

function extractLocalPart(email: string): string {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[0] : '';
}

function isDisposableEmail(domain: string): boolean {
  return disposableDomains.some(d => domain.toLowerCase().includes(d));
}

function isRoleBasedEmail(localPart: string): boolean {
  return rolePrefixes.includes(localPart.toLowerCase());
}

async function checkMXRecords(domain: string): Promise<{ exists: boolean; hosts: string[] }> {
  try {
    // Use Deno's DNS resolver to check MX records
    const records = await Deno.resolveDns(domain, "MX");
    
    if (records && records.length > 0) {
      // Sort by preference and extract hostnames
      const hosts = records
        .sort((a, b) => a.preference - b.preference)
        .map(r => r.exchange);
      
      console.log(`MX records for ${domain}:`, hosts);
      return { exists: true, hosts };
    }
    
    return { exists: false, hosts: [] };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`MX lookup failed for ${domain}:`, errorMessage);
    return { exists: false, hosts: [] };
  }
}

async function checkDomainExists(domain: string): Promise<boolean> {
  try {
    // Try to resolve A records first
    const aRecords = await Deno.resolveDns(domain, "A");
    if (aRecords && aRecords.length > 0) {
      return true;
    }
  } catch {
    // A record lookup failed, try AAAA
  }
  
  try {
    // Try AAAA records
    const aaaaRecords = await Deno.resolveDns(domain, "AAAA");
    if (aaaaRecords && aaaaRecords.length > 0) {
      return true;
    }
  } catch {
    // AAAA lookup failed
  }
  
  try {
    // Try NS records as fallback
    const nsRecords = await Deno.resolveDns(domain, "NS");
    if (nsRecords && nsRecords.length > 0) {
      return true;
    }
  } catch {
    // NS lookup failed
  }
  
  return false;
}

function determineStatus(result: Omit<ValidationResult, 'status'>): 'valid' | 'invalid' | 'risky' {
  if (!result.syntaxValid || !result.domainExists || !result.mxRecords) {
    return 'invalid';
  }
  
  if (result.isDisposable || result.isRoleBased || result.isCatchAll) {
    return 'risky';
  }
  
  return 'valid';
}

async function validateEmail(email: string): Promise<ValidationResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const domain = extractDomain(trimmedEmail);
  const localPart = extractLocalPart(trimmedEmail);
  
  const syntaxValid = validateEmailSyntax(trimmedEmail);
  
  let domainExists = false;
  let mxRecords = false;
  let mxHosts: string[] = [];
  
  if (syntaxValid && domain) {
    // Perform real DNS lookups
    const [domainResult, mxResult] = await Promise.all([
      checkDomainExists(domain),
      checkMXRecords(domain)
    ]);
    
    domainExists = domainResult || mxResult.exists; // Domain exists if we found any records
    mxRecords = mxResult.exists;
    mxHosts = mxResult.hosts;
  }
  
  const isDisposable = syntaxValid ? isDisposableEmail(domain) : false;
  const isRoleBased = syntaxValid ? isRoleBasedEmail(localPart) : false;
  
  // Catch-all detection would require SMTP verification which is more complex
  // For now, we'll set it to false
  const isCatchAll = false;
  
  const result: Omit<ValidationResult, 'status'> = {
    email: trimmedEmail,
    syntaxValid,
    domainExists,
    mxRecords,
    mxHosts,
    isDisposable,
    isRoleBased,
    isCatchAll,
    domain,
  };
  
  return {
    ...result,
    status: determineStatus(result),
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, emails } = await req.json();
    
    // Single email validation
    if (email && typeof email === 'string') {
      console.log(`Validating single email: ${email}`);
      const result = await validateEmail(email);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Bulk email validation
    if (emails && Array.isArray(emails)) {
      console.log(`Validating ${emails.length} emails`);
      
      // Process in batches to avoid overwhelming DNS
      const batchSize = 10;
      const results: ValidationResult[] = [];
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(validateEmail));
        results.push(...batchResults);
      }
      
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Please provide an email or emails array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in validate-email function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
