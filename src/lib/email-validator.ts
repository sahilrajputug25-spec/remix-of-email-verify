// Disposable email domains list (common ones)
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

// Common free email providers (usually valid)
const freeEmailProviders = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'gmx.com',
  'yandex.com', 'tutanota.com', 'fastmail.com', 'live.com', 'msn.com'
];

export interface ValidationResult {
  email: string;
  syntaxValid: boolean;
  domainExists: boolean;
  mxRecords: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isCatchAll: boolean;
  domain: string;
  status: 'valid' | 'invalid' | 'risky';
}

// Email syntax validation using regex
export function validateEmailSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Extract domain from email
export function extractDomain(email: string): string {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : '';
}

// Extract local part (before @)
export function extractLocalPart(email: string): string {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[0] : '';
}

// Check if email is from a disposable domain
export function isDisposableEmail(domain: string): boolean {
  return disposableDomains.some(d => domain.toLowerCase().includes(d));
}

// Check if email is role-based
export function isRoleBasedEmail(localPart: string): boolean {
  return rolePrefixes.includes(localPart.toLowerCase());
}

// Check if domain is a known free email provider
export function isFreeEmailProvider(domain: string): boolean {
  return freeEmailProviders.includes(domain.toLowerCase());
}

// Simulate MX record check (in real app, this would be done server-side)
export function simulateMXCheck(domain: string): boolean {
  // For demo purposes, we assume common providers have MX records
  // In production, this would be an actual DNS lookup
  if (isFreeEmailProvider(domain)) return true;
  
  // Simulate 85% chance of having MX records for other domains
  const hash = domain.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return hash % 100 < 85;
}

// Simulate domain existence check
export function simulateDomainCheck(domain: string): boolean {
  if (isFreeEmailProvider(domain)) return true;
  
  // Check for obviously invalid TLDs
  const parts = domain.split('.');
  if (parts.length < 2) return false;
  
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || tld.length > 10) return false;
  
  // Simulate 80% chance of domain existing
  const hash = domain.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return hash % 100 < 80;
}

// Simulate catch-all detection
export function simulateCatchAllCheck(domain: string): boolean {
  // Free providers are never catch-all
  if (isFreeEmailProvider(domain)) return false;
  
  // Simulate 15% chance of being catch-all
  const hash = domain.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return hash % 100 < 15;
}

// Determine final status based on all checks
export function determineStatus(result: Omit<ValidationResult, 'status'>): 'valid' | 'invalid' | 'risky' {
  // Invalid if syntax is wrong or domain doesn't exist
  if (!result.syntaxValid || !result.domainExists || !result.mxRecords) {
    return 'invalid';
  }
  
  // Risky if disposable, role-based, or catch-all
  if (result.isDisposable || result.isRoleBased || result.isCatchAll) {
    return 'risky';
  }
  
  return 'valid';
}

// Main validation function
export function validateEmail(email: string): ValidationResult {
  const trimmedEmail = email.trim().toLowerCase();
  const domain = extractDomain(trimmedEmail);
  const localPart = extractLocalPart(trimmedEmail);
  
  const syntaxValid = validateEmailSyntax(trimmedEmail);
  const domainExists = syntaxValid ? simulateDomainCheck(domain) : false;
  const mxRecords = domainExists ? simulateMXCheck(domain) : false;
  const isDisposable = syntaxValid ? isDisposableEmail(domain) : false;
  const isRoleBased = syntaxValid ? isRoleBasedEmail(localPart) : false;
  const isCatchAll = mxRecords ? simulateCatchAllCheck(domain) : false;
  
  const result: Omit<ValidationResult, 'status'> = {
    email: trimmedEmail,
    syntaxValid,
    domainExists,
    mxRecords,
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

// Batch validation
export function validateEmails(emails: string[]): ValidationResult[] {
  return emails.map(validateEmail);
}
