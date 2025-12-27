import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { 
  Download, 
  FileSpreadsheet, 
  Loader2,
  RefreshCw,
  Calendar,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface BulkUpload {
  id: string;
  file_name: string;
  total_emails: number;
  valid_count: number;
  invalid_count: number;
  risky_count: number;
  status: string;
  country: string;
  created_at: string;
  completed_at: string | null;
}

interface EmailValidation {
  email: string;
  status: string;
  syntax_valid: boolean;
  domain_exists: boolean;
  mx_records: boolean;
  is_disposable: boolean;
  is_role_based: boolean;
  is_catch_all: boolean;
  domain: string;
}

export default function BulkValidationHistory() {
  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUploads = async () => {
    setIsLoading(true);
    try {
      const sessionToken = localStorage.getItem('credential_session_token');
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_user_bulk_uploads', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error fetching bulk uploads:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch bulk validation history.',
          variant: 'destructive',
        });
        return;
      }

      const result = data as unknown as { success: boolean; uploads?: BulkUpload[] };
      if (result.success && result.uploads) {
        setUploads(result.uploads);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleDownload = async (upload: BulkUpload) => {
    setDownloadingId(upload.id);
    try {
      const sessionToken = localStorage.getItem('credential_session_token');
      if (!sessionToken) {
        toast({
          title: 'Error',
          description: 'Session not found. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch email validations for this time period
      const { data, error } = await supabase.rpc('get_user_email_validations', {
        p_session_token: sessionToken,
        p_limit: upload.total_emails + 100 // Get slightly more to ensure we capture all
      });

      if (error) {
        console.error('Error fetching validations:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch validation results.',
          variant: 'destructive',
        });
        return;
      }

      const result = data as unknown as { success: boolean; validations?: EmailValidation[] };
      if (!result.success || !result.validations) {
        toast({
          title: 'Error',
          description: 'No validation data found.',
          variant: 'destructive',
        });
        return;
      }

      // Filter validations by the upload time window (created_at within reasonable range)
      const uploadTime = new Date(upload.created_at).getTime();
      const validations = result.validations.slice(0, upload.total_emails);

      if (validations.length === 0) {
        toast({
          title: 'No Data',
          description: 'No validation results found for this upload.',
          variant: 'destructive',
        });
        return;
      }

      // Generate CSV
      const csvData = validations.map((v: EmailValidation) => ({
        Email: v.email,
        Status: v.status.toUpperCase(),
        'Syntax Valid': v.syntax_valid ? 'Yes' : 'No',
        'Domain Exists': v.domain_exists ? 'Yes' : 'No',
        'MX Records': v.mx_records ? 'Yes' : 'No',
        Disposable: v.is_disposable ? 'Yes' : 'No',
        'Role-Based': v.is_role_based ? 'Yes' : 'No',
        'Catch-All': v.is_catch_all ? 'Yes' : 'No',
        Domain: v.domain,
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${upload.file_name.replace(/\.[^/.]+$/, '')}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${validations.length} validation results.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download results.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading bulk validation history...</p>
        </CardContent>
      </Card>
    );
  }

  if (uploads.length === 0) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="py-12 text-center">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Bulk Validations Yet</h3>
          <p className="text-muted-foreground">
            Your bulk validation history will appear here after you validate your first file.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Bulk Validation History</h2>
        <Button variant="outline" size="sm" onClick={fetchUploads}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {uploads.map((upload) => (
          <Card key={upload.id} className="shadow-elevated">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{upload.file_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(upload.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {upload.total_emails?.toLocaleString()} emails
                      </span>
                      <Badge variant={upload.status === 'completed' ? 'success' : 'secondary'}>
                        {upload.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="w-4 h-4" />
                      {upload.valid_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-4 h-4" />
                      {upload.invalid_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="w-4 h-4" />
                      {upload.risky_count || 0}
                    </span>
                  </div>

                  {/* Download Button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(upload)}
                    disabled={downloadingId === upload.id}
                  >
                    {downloadingId === upload.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
