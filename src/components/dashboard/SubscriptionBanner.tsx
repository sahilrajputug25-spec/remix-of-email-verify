import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { Clock, AlertTriangle, CheckCircle2, Shield, Mail } from 'lucide-react';

// Admin contact email - can be configured
const ADMIN_EMAIL = 'admin@emailverifier.com';

export default function SubscriptionBanner() {
  const { isActive, isLoading, timeRemaining, expiresAt } = useSubscription();
  const { user } = useCredentialAuth();

  const handleContactAdmin = () => {
    const subject = encodeURIComponent('Subscription Renewal Request');
    const body = encodeURIComponent(
      `Hello,\n\nI would like to request a new credential key for email validation.\n\nMy account details:\n- Key Code: ${user?.keyCode || 'N/A'}\n- Account ID: ${user?.credentialKeyId || 'N/A'}\n\nPlease let me know the next steps.\n\nThank you.`
    );
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
  };

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
              Your subscription has expired. Contact the administrator for a new credential key.
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleContactAdmin}
          className="gap-2"
        >
          <Mail className="w-4 h-4" />
          Contact Admin
        </Button>
      </div>
    </Card>
  );
}
