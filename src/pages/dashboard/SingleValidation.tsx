import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, ValidationResult } from '@/lib/email-validator';
import { 
  Mail, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Globe,
  Database,
  Shield,
  Users,
  Loader2
} from 'lucide-react';

export default function SingleValidation() {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      // Perform validation
      const validationResult = validateEmail(email);
      setResult(validationResult);

      // Save to database
      if (user) {
        const { error } = await supabase.from('email_validations').insert({
          user_id: user.id,
          email: validationResult.email,
          syntax_valid: validationResult.syntaxValid,
          domain_exists: validationResult.domainExists,
          mx_records: validationResult.mxRecords,
          is_disposable: validationResult.isDisposable,
          is_role_based: validationResult.isRoleBased,
          is_catch_all: validationResult.isCatchAll,
          domain: validationResult.domain,
          status: validationResult.status,
        });

        if (error) {
          console.error('Error saving validation:', error);
        }
      }

      toast({
        title: 'Validation Complete',
        description: `Email status: ${validationResult.status.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <Badge variant="valid" className="text-base px-4 py-1">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Valid / Active
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="invalid" className="text-base px-4 py-1">
            <XCircle className="w-4 h-4 mr-2" />
            Invalid
          </Badge>
        );
      case 'risky':
        return (
          <Badge variant="risky" className="text-base px-4 py-1">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Risky
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Single Email Validation</h1>
        <p className="text-muted-foreground mt-1">
          Enter an email address to validate it instantly.
        </p>
      </div>

      {/* Validation Form */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Enter Email Address
          </CardTitle>
          <CardDescription>
            We'll check syntax, domain, MX records, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleValidate} className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <Button type="submit" size="lg" disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Validate
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="shadow-elevated animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription className="mt-1 font-mono text-base">
                  {result.email}
                </CardDescription>
              </div>
              {getStatusBadge(result.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <ValidationCheck
                label="Syntax Valid"
                passed={result.syntaxValid}
                icon={<Mail className="w-4 h-4" />}
                description="Email format is correct"
              />
              <ValidationCheck
                label="Domain Exists"
                passed={result.domainExists}
                icon={<Globe className="w-4 h-4" />}
                description={`Domain: ${result.domain || 'N/A'}`}
              />
              <ValidationCheck
                label="MX Records"
                passed={result.mxRecords}
                icon={<Database className="w-4 h-4" />}
                description="Mail server is configured"
              />
              <ValidationCheck
                label="Not Disposable"
                passed={!result.isDisposable}
                icon={<Shield className="w-4 h-4" />}
                description={result.isDisposable ? 'Temporary email detected' : 'Legitimate email provider'}
              />
              <ValidationCheck
                label="Not Role-Based"
                passed={!result.isRoleBased}
                icon={<Users className="w-4 h-4" />}
                description={result.isRoleBased ? 'Generic role email (info@, admin@)' : 'Personal email address'}
              />
              <ValidationCheck
                label="Not Catch-All"
                passed={!result.isCatchAll}
                icon={<Mail className="w-4 h-4" />}
                description={result.isCatchAll ? 'Domain accepts all emails' : 'Standard email handling'}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValidationCheck({ 
  label, 
  passed, 
  icon, 
  description 
}: { 
  label: string; 
  passed: boolean; 
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className={`p-4 rounded-lg border ${passed ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <span className="font-medium text-foreground">{label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}
