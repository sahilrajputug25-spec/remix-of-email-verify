import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { Key, Loader2, CheckCircle2 } from 'lucide-react';

interface ActivateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActivateSubscriptionDialog({ 
  open, 
  onOpenChange 
}: ActivateSubscriptionDialogProps) {
  const [keyCode, setKeyCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { activateSubscription } = useSubscription();
  const { toast } = useToast();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a credential key',
        variant: 'destructive',
      });
      return;
    }

    setIsActivating(true);

    try {
      const result = await activateSubscription(keyCode);
      
      if (result.success) {
        setIsSuccess(true);
        toast({
          title: 'Subscription activated!',
          description: 'You now have full access until 11:59 PM today.',
        });
        // Close dialog after showing success
        setTimeout(() => {
          onOpenChange(false);
          setIsSuccess(false);
          setKeyCode('');
        }, 2000);
      } else {
        toast({
          title: 'Activation failed',
          description: result.error || 'Invalid or already used credential key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to activate subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleClose = () => {
    if (!isActivating) {
      onOpenChange(false);
      setKeyCode('');
      setIsSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <DialogTitle className="text-xl mb-2">Subscription Activated!</DialogTitle>
            <DialogDescription>
              You now have full access to email validation until 11:59 PM today.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Activate Subscription</DialogTitle>
              <DialogDescription>
                Enter your credential key to activate your subscription. 
                Once activated, you'll have access until 11:59 PM today.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleActivate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="credential-key">Credential Key</Label>
                <Input
                  id="credential-key"
                  type="text"
                  placeholder="Enter your credential key"
                  value={keyCode}
                  onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                  className="font-mono text-center tracking-wider"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isActivating}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isActivating || !keyCode.trim()}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    'Activate'
                  )}
                </Button>
              </div>
            </form>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              Don't have a credential key? Contact your administrator to request one.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
