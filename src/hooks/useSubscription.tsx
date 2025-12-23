import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  user_id: string;
  credential_key_id: string | null;
  activated_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isActive: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
  timeRemaining: string;
  activateSubscription: (keyCode: string) => Promise<{ success: boolean; error?: string }>;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const activateSubscription = async (keyCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('activate_subscription', {
        p_key_code: keyCode.trim()
      });

      if (error) {
        console.error('Activation error:', error);
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; error?: string; subscription_id?: string; expires_at?: string };
      
      if (result.success) {
        await fetchSubscription();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Activation failed' };
      }
    } catch (error) {
      console.error('Activation error:', error);
      return { success: false, error: 'Failed to activate subscription' };
    }
  };

  const calculateTimeRemaining = useCallback(() => {
    if (!subscription?.expires_at) {
      setTimeRemaining('');
      return;
    }

    const now = new Date();
    const expiry = new Date(subscription.expires_at);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining('Expired');
      // Refresh subscription status
      fetchSubscription();
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${seconds}s`);
    }
  }, [subscription, fetchSubscription]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (!subscription) return;

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [subscription, calculateTimeRemaining]);

  const isActive = Boolean(
    subscription && 
    subscription.is_active && 
    new Date(subscription.expires_at) > new Date()
  );

  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;

  return {
    subscription,
    isActive,
    isLoading,
    expiresAt,
    timeRemaining,
    activateSubscription,
    refreshSubscription: fetchSubscription,
  };
}
