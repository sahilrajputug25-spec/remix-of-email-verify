import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEmailUsage } from '@/hooks/useEmailUsage';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { ValidationResult } from '@/lib/email-validator';
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner';
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
  Loader2,
  Lock,
  ArrowLeft
} from 'lucide-react';

export default function SingleValidation() {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { user } = useCredentialAuth();
  const { isActive, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const { usage, fetchUsage, checkAndIncrement } = useEmailUsage();
 useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);
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

    const limitCheck = await checkAndIncrement(1);
    if(!limitCheck.allowed){
      toast({
        title :'Email Limit Reached',
        description : limitCheck.error || 'You have reached your email validation limit.',
        variant :'destructive'
      });
      return;
    }
    setIsValidating(true);
    setResult(null);

    try {
      
      // Perform validation via edge function with real DNS lookups
      const { data, error: fnError } = await supabase.functions.invoke('validate-email', {
              body: { 
          email,
          credential_key_id: user?.credentialKeyId 
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const validationResult = data as ValidationResult;
      setResult(validationResult);

      // Save to database using RPC function
      if (user) {
        const { error } = await supabase.rpc('save_email_validation', {
          p_credential_key_id: user.credentialKeyId,
          p_email: validationResult.email,
          p_syntax_valid: validationResult.syntaxValid,
          p_domain_exists: validationResult.domainExists,
          p_mx_records: validationResult.mxRecords,
          p_is_disposable: validationResult.isDisposable,
          p_is_role_based: validationResult.isRoleBased,
          p_is_catch_all: validationResult.isCatchAll,
          p_domain: validationResult.domain,
          p_status: validationResult.status,
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

  // Show subscription required message if not active
  if (!subLoading && !isActive) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <SubscriptionBanner />
        
        <Card className="shadow-elevated">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Subscription Required</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You need an active subscription to validate emails. 
              Activate your subscription using a credential key to unlock this feature.
            </p>
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Single Email Validation</h1>
          <p className="text-muted-foreground mt-1">
            Enter an email address to validate it instantly.
          </p>
        </div>
        {usage && !usage.isAdmin && usage.limit && (
          <Badge variant="outline" className="gap-2 py-2 px-3">
            <Mail className="w-4 h-4" />
            {usage.used}/{usage.limit} emails used
          </Badge>
        )}
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
                disabled={!isActive || (usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0)}
              />
            </div>
            <Button 
            type="submit"
            size="lg" 
            disabled={isValidating || !isActive ||(usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0)} >
            {isValidating ? (
               <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
            ):!isActive ?(
              <>
                  <Lock className="w-4 h-4" />
                  Subscription Expired
                </>

            ) :  usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0 ? (
              <>
                  <Lock className="w-4 h-4" />
                  Limit Reached
                </>
            ):(
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
