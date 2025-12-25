import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { ValidationResult } from '@/lib/email-validator';
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  File,
  Trash2,
  Lock,
  ArrowLeft,
  Globe
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' },
  { code: 'OTHER', name: 'Other' },
];

export default function BulkValidation() {
  const [file, setFile] = useState<File | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | 'risky'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const { user } = useCredentialAuth();
  const { isActive, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or Excel file.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setResults([]);
    setProgress(0);

    try {
      let extractedEmails: string[] = [];

      if (extension === 'csv') {
        // Parse CSV
        const text = await selectedFile.text();
        const parsed = Papa.parse(text, { header: false });
        extractedEmails = (parsed.data as string[][])
          .flat()
          .filter((cell) => cell && cell.includes('@'))
          .map((email) => email.trim().toLowerCase());
      } else {
        // Parse Excel
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
        extractedEmails = jsonData
          .flat()
          .filter((cell) => cell && typeof cell === 'string' && cell.includes('@'))
          .map((email) => email.trim().toLowerCase());
      }

      // Remove duplicates and limit to 1000
      const uniqueEmails = [...new Set(extractedEmails)].slice(0, 1000);
      
      if (uniqueEmails.length === 0) {
        toast({
          title: 'No emails found',
          description: 'The file does not contain any valid email addresses.',
          variant: 'destructive',
        });
        setFile(null);
        return;
      }

      setEmails(uniqueEmails);
      toast({
        title: 'File loaded',
        description: `Found ${uniqueEmails.length} unique email addresses.`,
      });
    } catch (error) {
      toast({
        title: 'Error reading file',
        description: 'Failed to parse the file. Please check the format.',
        variant: 'destructive',
      });
      setFile(null);
    }
  }, [toast]);

  const handleValidate = async () => {
    if (emails.length === 0) return;

    setIsValidating(true);
    setProgress(0);

    try {
      const batchSize = 50;
      const allResults: ValidationResult[] = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        // Use edge function with real DNS lookups
        const { data, error: fnError } = await supabase.functions.invoke('validate-email', {
          body: { emails: batch }
        });

        if (fnError) {
          console.error('Batch validation error:', fnError);
          throw new Error(fnError.message);
        }

        const batchResults = data.results as ValidationResult[];
        allResults.push(...batchResults);
        setProgress(Math.min(((i + batchSize) / emails.length) * 100, 100));
      }

      setResults(allResults);

      // Save to database using RPC
      if (user) {
        const sessionToken = localStorage.getItem('credential_session_token');
        
        // Save each validation using RPC
        for (const result of allResults) {
          await supabase.rpc('save_email_validation', {
            p_credential_key_id: user.credentialKeyId,
            p_email: result.email,
            p_syntax_valid: result.syntaxValid,
            p_domain_exists: result.domainExists,
            p_mx_records: result.mxRecords,
            p_is_disposable: result.isDisposable,
            p_is_role_based: result.isRoleBased,
            p_is_catch_all: result.isCatchAll,
            p_domain: result.domain,
            p_status: result.status
          });
        }

        // Save bulk upload record using RPC
        const validCount = allResults.filter((r) => r.status === 'valid').length;
        const invalidCount = allResults.filter((r) => r.status === 'invalid').length;
        const riskyCount = allResults.filter((r) => r.status === 'risky').length;

        if (sessionToken) {
          await supabase.rpc('create_bulk_upload', {
            p_session_token: sessionToken,
            p_file_name: file?.name || 'bulk_upload',
            p_total_emails: allResults.length,
            p_country: selectedCountry
          });

          // Update the bulk upload with results
          // Note: For now, we create a completed record directly
        }
      }

      toast({
        title: 'Validation Complete',
        description: `Validated ${allResults.length} emails successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to validate emails. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownload = () => {
    const filteredResults = getFilteredResults();
    const csvData = filteredResults.map((r) => ({
      Email: r.email,
      Status: r.status.toUpperCase(),
      'Syntax Valid': r.syntaxValid ? 'Yes' : 'No',
      'Domain Exists': r.domainExists ? 'Yes' : 'No',
      'MX Records': r.mxRecords ? 'Yes' : 'No',
      Disposable: r.isDisposable ? 'Yes' : 'No',
      'Role-Based': r.isRoleBased ? 'Yes' : 'No',
      Domain: r.domain,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-validation-results-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFile(null);
    setEmails([]);
    setResults([]);
    setProgress(0);
  };

  const getFilteredResults = () => {
    if (filter === 'all') return results;
    return results.filter((r) => r.status === filter);
  };

  const filteredResults = getFilteredResults();
  const validCount = results.filter((r) => r.status === 'valid').length;
  const invalidCount = results.filter((r) => r.status === 'invalid').length;
  const riskyCount = results.filter((r) => r.status === 'risky').length;

  // Show subscription required message if not active
  if (!subLoading && !isActive) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SubscriptionBanner />
        
        <Card className="shadow-elevated">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Subscription Required</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You need an active subscription to bulk validate emails. 
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bulk Email Validation</h1>
        <p className="text-muted-foreground mt-1">
          Upload a CSV or Excel file to validate up to 1000 emails at once.
        </p>
      </div>

      {/* Country Selection */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Select Country
          </CardTitle>
          <CardDescription>
            Choose the country for this batch of emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload File
          </CardTitle>
          <CardDescription>
            Supported formats: CSV, Excel (.xlsx, .xls)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">CSV or Excel files (max 1000 emails)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <File className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {emails.length} emails found • {COUNTRIES.find(c => c.code === selectedCountry)?.name}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClear}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {isValidating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Validating...</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {results.length === 0 && !isValidating && (
                <Button onClick={handleValidate} className="w-full" size="lg">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validate {emails.length} Emails
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">{results.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Valid</div>
              <div className="text-2xl font-bold text-success">{validCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Invalid</div>
              <div className="text-2xl font-bold text-destructive">{invalidCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Risky</div>
              <div className="text-2xl font-bold text-warning">{riskyCount}</div>
            </Card>
          </div>

          {/* Results Table */}
          <Card className="shadow-elevated">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>Validation Results</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All ({results.length})
                  </Button>
                  <Button
                    variant={filter === 'valid' ? 'success' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('valid')}
                  >
                    Valid ({validCount})
                  </Button>
                  <Button
                    variant={filter === 'invalid' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('invalid')}
                  >
                    Invalid ({invalidCount})
                  </Button>
                  <Button
                    variant={filter === 'risky' ? 'warning' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('risky')}
                  >
                    Risky ({riskyCount})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Syntax</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">MX</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Disposable</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.slice(0, 100).map((result, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">{result.email}</td>
                        <td className="py-3 px-4">
                          {result.syntaxValid ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {result.mxRecords ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {result.isDisposable ? (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={result.status as 'valid' | 'invalid' | 'risky'}>
                            {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredResults.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Showing first 100 of {filteredResults.length} results. Download CSV for full list.
                  </p>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Results
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  New Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
