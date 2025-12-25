import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCredentialAuth } from './useCredentialAuth';

interface Subscription {
  id: string;
  user_id: string | null;
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
  refreshSubscription: () => Promise<void>;
}

const SESSION_TOKEN_KEY = 'credential_session_token';

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useCredentialAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // If user is admin, subscription is always active
  const isAdmin = user?.isAdmin || false;

  const fetchSubscription = useCallback(async () => {
    if (!user?.credentialKeyId) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    // For admins, we don't need to fetch subscription - it's always active
    if (user.isAdmin) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!sessionToken) {
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_user_subscription', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else {
        const result = data as unknown as {
          success: boolean;
          is_admin?: boolean;
          subscription?: Subscription | null;
          error?: string;
        };

        if (result.success && result.subscription) {
          setSubscription(result.subscription);
        } else {
          setSubscription(null);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.credentialKeyId, user?.isAdmin]);

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

  // Admins always have active subscription
  const isActive = isAdmin || Boolean(
    subscription && 
    subscription.is_active && 
    new Date(subscription.expires_at) > new Date()
  );

  const expiresAt = isAdmin ? null : (subscription?.expires_at ? new Date(subscription.expires_at) : null);

  return {
    subscription,
    isActive,
    isLoading,
    expiresAt,
    timeRemaining: isAdmin ? 'Unlimited' : timeRemaining,
    refreshSubscription: fetchSubscription,
  };
}
