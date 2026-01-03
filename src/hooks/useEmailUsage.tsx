import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailUsage {
  limit: number | null;
  used: number;
  remaining: number | null;
  isAdmin?: boolean;
}

const SESSION_TOKEN_KEY = 'credential_session_token';

export function useEmailUsage() {
  const [usage, setUsage] = useState<EmailUsage | null>(null);
  const [loading, setLoading] = useState(false);

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

  const fetchUsage = useCallback(async () => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_email_usage', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error fetching email usage:', error);
        return;
      }

      const result = data as unknown as {
        success: boolean;
        limit?: number | null;
        used?: number;
        remaining?: number | null;
        is_admin?: boolean;
        error?: string;
      };

      if (result.success) {
        setUsage({
          limit: result.limit ?? null,
          used: result.used ?? 0,
          remaining: result.remaining ?? null,
          isAdmin: result.is_admin
        });
      }
    } catch (error) {
      console.error('Error fetching email usage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAndIncrement = useCallback(async (count: number = 1): Promise<{ allowed: boolean; error?: string; remaining?: number }> => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return { allowed: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('check_and_increment_email_count', {
        p_session_token: sessionToken,
        p_count: count
      });

      if (error) {
        console.error('Error checking email limit:', error);
        return { allowed: false, error: error.message };
      }

      const result = data as unknown as {
        success: boolean;
        allowed: boolean;
        is_admin?: boolean;
        limit?: number | null;
        used?: number;
        remaining?: number | null;
        error?: string;
      };

      if (!result.success) {
        return { allowed: false, error: result.error };
      }

      if (result.allowed) {
        // Update local usage state
        setUsage(prev => prev ? {
          ...prev,
          used: result.used ?? prev.used,
          remaining: result.remaining ?? prev.remaining
        } : null);
      }

      return { 
        allowed: result.allowed, 
        error: result.error,
        remaining: result.remaining ?? undefined
      };
    } catch (error) {
      console.error('Error checking email limit:', error);
      return { allowed: false, error: 'An unexpected error occurred' };
    }
  }, []);

  return {
    usage,
    loading,
    fetchUsage,
    checkAndIncrement
  };
}