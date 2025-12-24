import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useCredentialAuth } from '@/hooks/useCredentialAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Key, Shield, Loader2, Copy, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface CreatedCredential {
  keyCode: string;
  password: string;
}

export default function AdminPanel() {
  const { loading, keys, fetchCredentialKeys, createCredentialKey, deleteCredentialKey } = useAdmin();
  const { user } = useCredentialAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<CreatedCredential | null>(null);
  const [newKeyCode, setNewKeyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (keyId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // First check if user is admin from the client side
    if (user && !user.isAdmin) {
      setIsAuthorized(false);
      return;
    }
    
    const checkAccess = async () => {
      const result = await fetchCredentialKeys();
      setIsAuthorized(result.success);
    };
    checkAccess();
  }, [fetchCredentialKeys, user]);

  const handleCreateKey = async () => {
    if (!newKeyCode.trim() || !newPassword.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    const passwordToStore = newPassword; // Store password before clearing
    const keyCodeToStore = newKeyCode.toUpperCase();
    const result = await createCredentialKey(newKeyCode, newPassword, createdBy || undefined);
    setIsSubmitting(false);

    if (result.success) {
      // Show success dialog with credentials
      setCreatedCredential({
        keyCode: keyCodeToStore,
        password: passwordToStore,
      });
      setIsCreateDialogOpen(false);
      setIsSuccessDialogOpen(true);
      setNewKeyCode('');
      setNewPassword('');
      setCreatedBy('');
    } else {
      toast.error(result.error || 'Failed to create credential key');
    }
  };

  const handleDeleteKey = async (keyId: string, keyCode: string) => {
    if (!confirm(`Are you sure you want to delete credential key ${keyCode}?`)) {
      return;
    }

    const result = await deleteCredentialKey(keyId);
    if (result.success) {
      toast.success('Credential key deleted successfully');
    } else {
      toast.error(result.error || 'Failed to delete credential key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewKeyCode(result);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(result);
  };

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage credential keys and passwords</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Credential Key</DialogTitle>
              <DialogDescription>
                Generate a new credential key and password for user access.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyCode">Key Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="keyCode"
                    placeholder="e.g., ABC12345"
                    value={newKeyCode}
                    onChange={(e) => setNewKeyCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                  <Button variant="outline" onClick={generateRandomKey} type="button">
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button variant="outline" onClick={generateRandomPassword} type="button">
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="createdBy">Created By (optional)</Label>
                <Input
                  id="createdBy"
                  placeholder="e.g., Admin Name"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog showing created credentials */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                Credential Key Created
              </DialogTitle>
              <DialogDescription>
                Save these credentials now. The password cannot be retrieved later.
              </DialogDescription>
            </DialogHeader>
            
            {createdCredential && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Key Code</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-lg">
                      {createdCredential.keyCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(createdCredential.keyCode)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-lg">
                      {createdCredential.password}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(createdCredential.password)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-4">
                  <p className="text-sm text-warning-foreground">
                    ⚠️ Make sure to copy and save these credentials. The password will not be shown again.
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                onClick={() => {
                  if (createdCredential) {
                    copyToClipboard(`Key Code: ${createdCredential.keyCode}\nPassword: ${createdCredential.password}`);
                  }
                }}
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Both
              </Button>
              <Button onClick={() => setIsSuccessDialogOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Credential Keys
          </CardTitle>
          <CardDescription>
            {keys.length} credential key{keys.length !== 1 ? 's' : ''} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && keys.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No credential keys created yet. Click "Create New Key" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Code</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Used At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {key.key_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.key_code)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.password && !key.is_used ? (
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {visiblePasswords.has(key.id) ? key.password : '••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(key.id)}
                            className="h-7 w-7 p-0"
                          >
                            {visiblePasswords.has(key.id) ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.password!)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.is_used ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Used
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Available
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.created_by || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(key.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.used_at ? format(new Date(key.used_at), 'MMM d, yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id, key.key_code)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
