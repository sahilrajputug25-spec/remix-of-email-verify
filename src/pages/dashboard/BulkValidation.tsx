import { useState, useCallback , useEffect} from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCredentialAuth } from "@/hooks/useCredentialAuth";
import { useEmailUsage } from '@/hooks/useEmailUsage';
import { useSubscription } from "@/hooks/useSubscription";
import { ValidationResult } from "@/lib/email-validator";
import SubscriptionBanner from "@/components/dashboard/SubscriptionBanner";
import BulkValidationHistory from "@/components/dashboard/BulkValidationHistory";
import Papa from "papaparse";
import * as XLSX from "xlsx";
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
  Globe,
  History,
  Plus,
  Mail
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "UAE" },
  { code: "OTHER", name: "Other" },
];

export default function BulkValidation() {
  const [file, setFile] = useState<File | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid" | "risky">(
    "all"
  );
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [validCsvPath, setValidCsvPath] = useState<string | null>(null);
  const [invalidCsvPath, setInvalidCsvPath] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<
    "valid" | "invalid" | null
  >(null);
  const [activeTab, setActiveTab] = useState<string>("new");
  const { user } = useCredentialAuth();
  const { isActive, isLoading: subLoading } = useSubscription();
    const { usage, fetchUsage, checkAndIncrement } = useEmailUsage();
  const { toast } = useToast();
useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      const extension = selectedFile.name.split(".").pop()?.toLowerCase();

      if (!["csv", "xlsx", "xls"].includes(extension || "")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV or Excel file.",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
      setResults([]);
      setProgress(0);

      try {
        let extractedEmails: string[] = [];

        if (extension === "csv") {
          // Parse CSV
          const text = await selectedFile.text();
          const parsed = Papa.parse(text, { header: false });
          extractedEmails = (parsed.data as string[][])
            .flat()
            .filter((cell) => cell && cell.includes("@"))
            .map((email) => email.trim().toLowerCase());
        } else {
          // Parse Excel
          const data = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(data);
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
          }) as string[][];
          extractedEmails = jsonData
            .flat()
            .filter(
              (cell) => cell && typeof cell === "string" && cell.includes("@")
            )
            .map((email) => email.trim().toLowerCase());
        }

        // Remove duplicates and limit to 52000
        const uniqueEmails = [...new Set(extractedEmails)].slice(0, 52000);

        if (uniqueEmails.length === 0) {
          toast({
            title: "No emails found",
            description: "The file does not contain any valid email addresses.",
            variant: "destructive",
          });
          setFile(null);
          return;
        }

        setEmails(uniqueEmails);
        toast({
          title: "File loaded",
          description: `Found ${uniqueEmails.length} unique email addresses.`,
        });
      } catch (error) {
        toast({
          title: "Error reading file",
          description: "Failed to parse the file. Please check the format.",
          variant: "destructive",
        });
        setFile(null);
      }
    },
    [toast]
  );

  const handleValidate = async () => {
    if (emails.length === 0) return;
        // Check email limit before validation
    const limitCheck = await checkAndIncrement(emails.length);
    if (!limitCheck.allowed) {
      toast({
        title: 'Email Limit Exceeded',
        description: `You can only validate ${limitCheck.remaining ?? 0} more emails. Current file has ${emails.length} emails.`,
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    setProgress(0);

    try {
      // Large batch size - edge function handles parallelism internally
      const batchSize = 1000;
      const allResults: ValidationResult[] = [];
      const startTime = Date.now();

      // Process in parallel batches for maximum speed
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            emails.length / batchSize
          )} (${batch.length} emails)`
        );

        // Use edge function with real DNS lookups
        const { data, error: fnError } = await supabase.functions.invoke(
          "validate-email",
          {
            body: {
              emails: batch,
              credential_key_id: user?.credentialKeyId,
            },
          }
        );

        if (fnError) {
          console.error("Batch validation error:", fnError);
          throw new Error(fnError.message);
        }

        const batchResults = data.results as ValidationResult[];
        allResults.push(...batchResults);

        const progressPercent = Math.min(
          ((i + batch.length) / emails.length) * 100,
          100
        );
        setProgress(progressPercent);

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const emailsPerSecond = allResults.length / elapsedSeconds;
        console.log(
          `Progress: ${allResults.length}/${
            emails.length
          } (${emailsPerSecond.toFixed(1)} emails/sec)`
        );
      }

      setResults(allResults);

      const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(
        `Validation complete: ${allResults.length} emails in ${totalTime} minutes`
      );

      // Save to database using batch RPC (single call for thousands of records)
      if (user) {
        const sessionToken = localStorage.getItem("credential_session_token");

        // Use batch save - process 5000 at a time for efficiency
        const saveBatchSize = 5000;
        const saveStartTime = Date.now();

        for (let i = 0; i < allResults.length; i += saveBatchSize) {
          const saveBatch = allResults.slice(i, i + saveBatchSize);
          const validationsJson = saveBatch.map((result) => ({
            email: result.email,
            syntax_valid: result.syntaxValid,
            domain_exists: result.domainExists,
            mx_records: result.mxRecords,
            is_disposable: result.isDisposable,
            is_role_based: result.isRoleBased,
            is_catch_all: result.isCatchAll,
            domain: result.domain,
            status: result.status,
          }));

          const { data: saveResult, error: saveError } = await supabase.rpc(
            "batch_save_email_validations",
            {
              p_credential_key_id: user.credentialKeyId,
              p_validations: validationsJson,
            }
          );

          if (saveError) {
            console.error("Batch save error:", saveError);
          } else {
            const insertedCount =
              (saveResult as { inserted_count?: number })?.inserted_count ||
              saveBatch.length;
            console.log(
              `Saved batch ${
                Math.floor(i / saveBatchSize) + 1
              }: ${insertedCount} records`
            );
          }
        }

        console.log(
          `Database save completed in ${(
            (Date.now() - saveStartTime) /
            1000
          ).toFixed(1)}s`
        );

        // Save bulk upload record using RPC
        const validCount = allResults.filter(
          (r) => r.status === "valid"
        ).length;
        const invalidCount = allResults.filter(
          (r) => r.status === "invalid"
        ).length;
        const riskyCount = allResults.filter(
          (r) => r.status === "risky"
        ).length;

        if (sessionToken) {
          // Create the bulk upload record first
          const { data: uploadResult } = await supabase.rpc(
            "create_bulk_upload",
            {
              p_session_token: sessionToken,
              p_file_name: file?.name || "bulk_upload",
              p_total_emails: allResults.length,
              p_country: selectedCountry,
            }
          );

          const uploadData = uploadResult as unknown as {
            success: boolean;
            upload_id?: string;
          };
          // Around line 180-220, replace this section:

          if (uploadData?.success && uploadData.upload_id) {
            setCurrentUploadId(uploadData.upload_id);

            const { data: csvData, error: csvError } =
              await supabase.functions.invoke("save-bulk-csvs", {
                body: {
                  uploadId: uploadData.upload_id,
                  credentialKeyId: user.credentialKeyId,
                  results: allResults,
                  fileName: file?.name || "bulk_upload",
                },
              });

            if (!csvError && csvData?.success) {
              setValidCsvPath(csvData.validCsvPath);
              setInvalidCsvPath(csvData.invalidCsvPath);

              // Update with final counts AND CSV paths
              await supabase.rpc("update_bulk_upload", {
                // ← Changed from update_bulk_upload_counts
                p_session_token: sessionToken,
                p_upload_id: uploadData.upload_id,
                p_valid_count: validCount,
                p_invalid_count: invalidCount,
                p_risky_count: riskyCount,
                p_status: "completed",
                p_valid_csv_path: csvData.validCsvPath, // ← Added
                p_invalid_csv_path: csvData.invalidCsvPath, // ← Added
              });

              toast({
                title: "Validation Complete",
                description: `Validated ${allResults.length} emails in ${totalTime} minutes.`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Error",
        description: "Failed to validate emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadCsv = async (type: "valid" | "invalid") => {
    const csvPath = type === "valid" ? validCsvPath : invalidCsvPath;

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

  const handleClear = () => {
    setFile(null);
    setEmails([]);
    setResults([]);
    setProgress(0);
    setCurrentUploadId(null);
    setValidCsvPath(null);
    setInvalidCsvPath(null);
  };

  const getFilteredResults = () => {
    if (filter === "all") return results;
    return results.filter((r) => r.status === filter);
  };

  const filteredResults = getFilteredResults();

  const validCount = results.filter((r) => r.status === "valid").length;
  const invalidCount = results.filter((r) => r.status === "invalid").length;
  const riskyCount = results.filter((r) => r.status === "risky").length;

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
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Subscription Required
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You need an active subscription to bulk validate emails. Activate
              your subscription using a credential key to unlock this feature.
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Email Validation</h1>
          <p className="text-muted-foreground mt-1">
            Upload a CSV or Excel file to validate up to 20,000 emails at once.
          </p>
        </div>
        {usage && !usage.isAdmin && usage.limit && (
          <Badge variant="outline" className="gap-2 py-2 px-3">
            <Mail className="w-4 h-4" />
            {usage.used}/{usage.limit} emails used
          </Badge>
        )}
      </div>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Validation
            {isValidating && <Loader2 className="w-3 h-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Uploads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6 space-y-6">
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
              <Select
                value={selectedCountry}
                onValueChange={setSelectedCountry}
              >
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
                 <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl transition-all ${
                  !isActive || (usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0)
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {!isActive ? (
                       <>
                       <Lock className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Subscription Expired</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Contact admin for renewal</p>
                       
                       
                       </>
                    ):usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0 ? (
                      <>
                        <Lock className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Email Limit Reached</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Contact admin for more emails</p>
                      </>
                    ):(
                    <>
                    <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-3" />

                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV or Excel files (max 52,000 emails)
                    </p>
                    </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                      disabled={!isActive || (usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0)}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {emails.length} emails found •{" "}
                          {
                            COUNTRIES.find((c) => c.code === selectedCountry)
                              ?.name
                          }
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
                        <span className="text-muted-foreground">
                          Validating...
                        </span>
                        <span className="font-medium">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {results.length === 0 && !isValidating && (
                    <Button 
                      onClick={handleValidate} 
                      className="w-full" 
                      size="lg"
                      disabled={!isActive || (usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0)}
                    >
                      {!isActive ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Subscription Expired
                        </>
                      ) : usage && !usage.isAdmin && usage.limit !== null && usage.remaining === 0 ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Email Limit Reached
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Validate {emails.length} Emails
                        </>
                      )}
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
                  <div className="text-2xl font-bold text-foreground">
                    {results.length}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Valid</div>
                  <div className="text-2xl font-bold text-success">
                    {validCount}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Invalid</div>
                  <div className="text-2xl font-bold text-destructive">
                    {invalidCount}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Risky</div>
                  <div className="text-2xl font-bold text-warning">
                    {riskyCount}
                  </div>
                </Card>
              </div>

              {/* Results Table */}
              <Card className="shadow-elevated">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle>Validation Results</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                      >
                        All ({results.length})
                      </Button>
                      <Button
                        variant={filter === "valid" ? "success" : "outline"}
                        size="sm"
                        onClick={() => setFilter("valid")}
                      >
                        Valid ({validCount})
                      </Button>
                      <Button
                        variant={
                          filter === "invalid" ? "destructive" : "outline"
                        }
                        size="sm"
                        onClick={() => setFilter("invalid")}
                      >
                        Invalid ({invalidCount})
                      </Button>
                      <Button
                        variant={filter === "risky" ? "warning" : "outline"}
                        size="sm"
                        onClick={() => setFilter("risky")}
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
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Syntax
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            MX
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Disposable
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.slice(0, 100).map((result, index) => (
                          <tr
                            key={index}
                            className="border-b border-border/50 hover:bg-muted/50"
                          >
                            <td className="py-3 px-4 font-mono text-sm">
                              {result.email}
                            </td>
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
                              <Badge
                                variant={
                                  result.status as "valid" | "invalid" | "risky"
                                }
                              >
                                {result.status.charAt(0).toUpperCase() +
                                  result.status.slice(1)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredResults.length > 100 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Showing first 100 of {filteredResults.length} results.
                        Download CSV for full list.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleDownloadCsv("valid")}
                      disabled={!validCsvPath || isDownloading === "valid"}
                      variant="success"
                    >
                      {isDownloading === "valid" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download Valid ({validCount})
                    </Button>
                    <Button
                      onClick={() => handleDownloadCsv("invalid")}
                      disabled={!invalidCsvPath || isDownloading === "invalid"}
                      variant="destructive"
                    >
                      {isDownloading === "invalid" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download Invalid ({invalidCount + riskyCount})
                    </Button>
                    <Button variant="outline" onClick={handleClear}>
                      New Upload
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <BulkValidationHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
