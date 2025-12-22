import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';

interface Validation {
  id: string;
  email: string;
  syntax_valid: boolean;
  domain_exists: boolean;
  mx_records: boolean;
  is_disposable: boolean;
  is_role_based: boolean;
  domain: string;
  status: string;
  created_at: string;
}

export default function RecentValidations() {
  const [validations, setValidations] = useState<Validation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;
  const { user } = useAuth();

  useEffect(() => {
    fetchValidations();
  }, [user, currentPage, statusFilter]);

  const fetchValidations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('email_validations')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setValidations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching validations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredValidations = validations.filter((v) =>
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="valid">Valid</Badge>;
      case 'invalid':
        return <Badge variant="invalid">Invalid</Badge>;
      case 'risky':
        return <Badge variant="risky">Risky</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Recent Validations</h1>
        <p className="text-muted-foreground mt-1">
          View your email validation history.
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="risky">Risky</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Validation History
          </CardTitle>
          <CardDescription>
            {totalCount} total validations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredValidations.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Syntax</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">MX Records</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Disposable</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredValidations.map((validation) => (
                      <tr key={validation.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">{validation.email}</span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {validation.syntax_valid ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {validation.mx_records ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {validation.is_disposable ? (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(validation.status)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                          {new Date(validation.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No validations found.</p>
              {statusFilter !== 'all' && (
                <Button variant="link" onClick={() => setStatusFilter('all')} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
