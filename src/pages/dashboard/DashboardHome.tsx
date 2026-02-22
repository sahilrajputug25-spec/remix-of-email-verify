import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner';
import { 
  Mail, 
  FileUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Lock
} from 'lucide-react';

const SESSION_TOKEN_KEY = 'credential_session_token';

interface ValidationItem {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalValidations: number;
  validCount: number;
  invalidCount: number;
  riskyCount: number;
  recentValidations: ValidationItem[];
}

export default function DashboardHome() {
  const { user } = useCredentialAuth();
  const { isActive } = useSubscription();
  const [stats, setStats] = useState<Stats>({
    totalValidations: 0,
    validCount: 0,
    invalidCount: 0,
    riskyCount: 0,
    recentValidations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      try {
        const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
        if (!sessionToken) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc('get_user_email_validations', {
          p_session_token: sessionToken,
          p_limit: 1000
        });

        if (error) throw error;

        const result = data as unknown as {
          success: boolean;
          validations?: ValidationItem[];
          error?: string;
        };

        if (result.success && result.validations) {
          const validations = result.validations;
          const validCount = validations.filter(v => v.status === 'valid').length;
          const invalidCount = validations.filter(v => v.status === 'invalid').length;
          const riskyCount = validations.filter(v => v.status === 'risky').length;

          setStats({
            totalValidations: validations.length,
            validCount,
            invalidCount,
            riskyCount,
            recentValidations: validations.slice(0, 5),
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

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
      {/* Subscription Banner */}
      <SubscriptionBanner />

      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your email validation activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Validations"
          value={stats.totalValidations}
          icon={<Mail className="w-5 h-5" />}
          loading={loading}
        />
        <StatsCard
          title="Valid Emails"
          value={stats.validCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="success"
          loading={loading}
        />
        <StatsCard
          title="Invalid Emails"
          value={stats.invalidCount}
          icon={<XCircle className="w-5 h-5" />}
          color="destructive"
          loading={loading}
        />
        <StatsCard
          title="Risky Emails"
          value={stats.riskyCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="warning"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <Card className={`shadow-elevated hover:shadow-glow transition-all duration-300 ${!isActive ? 'opacity-75' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Single Email Validation
              {!isActive && <Lock className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {isActive 
                ? 'Quickly validate a single email address with detailed results.'
                : 'Activate subscription to validate emails.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild disabled={!isActive}>
              <Link to={isActive ? "/dashboard/validate" : "#"}>
                {isActive ? 'Validate Email' : 'Subscription Required'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={`shadow-elevated hover:shadow-glow transition-all duration-300 ${!isActive ? 'opacity-75' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Bulk Email Validation
              {!isActive && <Lock className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {isActive 
                ? 'Upload a CSV or Excel file to validate up to 1000 emails at once.'
                : 'Activate subscription to bulk validate emails.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild disabled={!isActive}>
              <Link to={isActive ? "/dashboard/bulk" : "#"}>
                {isActive ? 'Upload File' : 'Subscription Required'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Validations */}
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Validations
            </CardTitle>
            <CardDescription>Your latest email validation results</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/history">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : stats.recentValidations.length > 0 ? (
            <div className="space-y-3">
              {stats.recentValidations.map((validation) => (
                <div
                  key={validation.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{validation.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(validation.status)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(validation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No validations yet. Start by validating your first email!</p>
              <Button className="mt-4" asChild>
                <Link to="/dashboard/validate">Validate Email</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  loading 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'destructive' | 'warning';
  loading: boolean;
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{value}</p>
            )}
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
