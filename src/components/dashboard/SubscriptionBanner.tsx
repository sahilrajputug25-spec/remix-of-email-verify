import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { Clock, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

export default function SubscriptionBanner() {
  const { isActive, isLoading, timeRemaining, expiresAt } = useSubscription();
  const { user } = useCredentialAuth();

  if (isLoading) {
    return null;
  }

  // Admin banner
  if (user?.isAdmin) {
    return (
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Admin Account</span>
                <Badge variant="default" className="text-xs">Admin</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Unlimited access to all features
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (isActive) {
    return (
      <Card className="p-4 bg-success/5 border-success/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Subscription Active</span>
                <Badge variant="success" className="text-xs">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Full access to email validation features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Expires at {expiresAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{timeRemaining}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-warning/5 border-warning/20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Subscription Expired</span>
              <Badge variant="warning" className="text-xs">Inactive</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your subscription has expired. Contact your administrator for a new credential key.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
