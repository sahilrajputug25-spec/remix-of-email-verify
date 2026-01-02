import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  Loader2, 
  FileSpreadsheet,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface BulkUpload {
  id: string;
  file_name: string;
  status: string;
  total_emails: number;
  valid_count: number;
  invalid_count: number;
  risky_count: number;
  country: string;
  valid_csv_path: string ;
  invalid_csv_path: string ;
  created_at: string;
  completed_at: string | null;
}

export default function BulkUploadHistory() {
  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<'valid' | 'invalid' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useCredentialAuth();
  const { toast } = useToast();
   const [validCsvPath, setValidCsvPath] = useState<string | null>(null);
    const [invalidCsvPath, setInvalidCsvPath] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<
      "valid" | "invalid" | null
    >(null);

  const fetchUploads = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const sessionToken = localStorage.getItem('credential_session_token');
      if (!sessionToken) return;

      const { data, error } = await supabase.rpc('get_user_bulk_uploads', {
        p_session_token: sessionToken

      });
      console.log(data);
      

      if (error) throw error;

      const result = data as unknown as { success: boolean; uploads?: BulkUpload[] };
      if (result?.success && result.uploads) {
        setUploads(result.uploads);
        console.log('Fetched uploads:', result.uploads);
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load upload history.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, [user]);

  const handleDownload = async (upload: BulkUpload, type: 'valid' | 'invalid') => {
        const csvPath = type === "valid" ? upload.valid_csv_path : upload.invalid_csv_path;

    if (!csvPath) {
      toast({
        title: "No CSV available",
        description: "CSV file not found. Please try validating again.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(type);

    try {
      const { data, error } = await supabase.functions.invoke(
        "get-csv-download-url",
        {
          body: { csvPath },
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || "Failed to get download URL");
      }

      // Open the signed URL in a new tab to download
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `${type}-emails.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `${
          type === "valid" ? "Valid" : "Invalid"
        } emails CSV is downloading.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the CSV file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };
  const handleDelete = async (uploadId: string) => {
    const sessionToken = localStorage.getItem('credential_session_token');
    if (!sessionToken) return;

    setDeletingId(uploadId);

    try {
      const { data, error } = await supabase.rpc('delete_bulk_upload', {
        p_session_token: sessionToken,
        p_upload_id: uploadId
      });

      if (error) throw error;

      const result = data as { success: boolean };
      if (result?.success) {
        setUploads(uploads.filter(u => u.id !== uploadId));
        toast({
          title: 'Deleted',
          description: 'Upload record has been deleted.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete upload.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading upload history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (uploads.length === 0) {
    return (
      <Card className="shadow-elevated">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No uploads yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Your bulk validation history will appear here once you upload and validate files.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Upload History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Valid</TableHead>
                <TableHead className="text-center">Invalid</TableHead>
                <TableHead className="text-center">Risky</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                
                <TableRow key={upload.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {upload.file_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(upload.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{upload.country}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {upload.total_emails}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1 text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      {upload.valid_count || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1 text-destructive">
                      <XCircle className="w-3 h-3" />
                      {upload.invalid_count || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1 text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      {upload.risky_count || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={upload.status === 'completed' ? 'success' : 'secondary'}
                    >
                      {upload.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          
                          handleDownload(upload, 'valid')

                        }
                          }
                        disabled={ downloadingId === upload.id}
                        title="Download Valid Emails"
                      >
                        {downloadingId === upload.id && downloadType === 'valid' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 text-success" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(upload, 'invalid')}
                        disabled={!upload.invalid_csv_path || downloadingId === upload.id}
                        title="Download Invalid Emails"
                      >
                        {downloadingId === upload.id && downloadType === 'invalid' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(upload.id)}
                        disabled={deletingId === upload.id}
                        title="Delete"
                      >
                        {deletingId === upload.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}