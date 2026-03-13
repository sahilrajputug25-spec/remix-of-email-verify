import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Plus, Trash2, Globe, Info } from 'lucide-react';

const SESSION_TOKEN_KEY = 'credential_session_token';

interface WebhookItem {
  id: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

export default function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetchWebhooks = useCallback(async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) return;

    const { data, error } = await supabase.rpc('get_user_webhooks' as any, {
      p_session_token: sessionToken,
    });

    if (!error && data) {
      const result = data as any;
      if (result.success) {
        setWebhooks(result.webhooks || []);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl);
    } catch {
      toast({ title: 'Invalid URL', description: 'Please enter a valid webhook URL.', variant: 'destructive' });
      return;
    }

    setAdding(true);
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const { data, error } = await supabase.rpc('add_webhook' as any, {
      p_session_token: sessionToken!,
      p_url: newUrl.trim(),
    });

    if (!error && (data as any)?.success) {
      toast({ title: 'Webhook added' });
      setNewUrl('');
      fetchWebhooks();
    } else {
      toast({ title: 'Error', description: 'Failed to add webhook.', variant: 'destructive' });
    }
    setAdding(false);
  };

  const handleDelete = async (webhookId: string) => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const { data, error } = await supabase.rpc('delete_webhook' as any, {
      p_session_token: sessionToken!,
      p_webhook_id: webhookId,
    });

    if (!error && (data as any)?.success) {
      toast({ title: 'Webhook deleted' });
      fetchWebhooks();
    }
  };

  const handleToggle = async (webhookId: string) => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const { data, error } = await supabase.rpc('toggle_webhook' as any, {
      p_session_token: sessionToken!,
      p_webhook_id: webhookId,
    });

    if (!error && (data as any)?.success) {
      fetchWebhooks();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Webhook Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Get notified when bulk validations complete.
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How it works</p>
            <p>When a bulk validation completes, we'll send a POST request to your webhook URL with the upload details including file name, status counts, and download links.</p>
          </div>
        </CardContent>
      </Card>

      {/* Add Webhook */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Webhook
          </CardTitle>
          <CardDescription>Enter a URL to receive POST notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding || !newUrl.trim()}>
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook List */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            Your Webhooks
          </CardTitle>
          <CardDescription>{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono text-sm truncate">{webhook.url}</span>
                    <Badge variant={webhook.is_active ? 'success' : 'secondary'} className="flex-shrink-0">
                      {webhook.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={() => handleToggle(webhook.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(webhook.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No webhooks configured yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
