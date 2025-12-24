import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { User, Mail, Loader2, Save, Key, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user, loading } = useCredentialAuth();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings.
          </p>
        </div>
        <Card className="shadow-elevated">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">
          View your account information.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your credential key details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Code</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={user?.keyCode || ''}
                  className="pl-10 font-mono"
                  disabled
                />
              </div>
            </div>

            {user?.createdBy && (
              <div className="space-y-2">
                <Label>Created By</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={user.createdBy}
                    className="pl-10"
                    disabled
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Stats */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs">{user?.credentialKeyId?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Subscription Status</span>
              {user?.isAdmin ? (
                <Badge variant="default" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Admin (Always Active)
                </Badge>
              ) : user?.subscriptionActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="warning">Inactive</Badge>
              )}
            </div>
            {!user?.isAdmin && user?.subscriptionExpiresAt && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Expires At</span>
                <span>{new Date(user.subscriptionExpiresAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}