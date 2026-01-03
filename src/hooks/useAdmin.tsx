import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CredentialKey {
  id: string;
  key_code: string;
  password: string | null;
  is_used: boolean;
  created_by: string | null;
  created_at: string;
  used_at: string | null;
  email_limit: number | null;
  emails_validated: number;
  subscription_hours: number;
}

const SESSION_TOKEN_KEY = 'credential_session_token';

export function useAdmin() {
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState<CredentialKey[]>([]);

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

  const fetchCredentialKeys = useCallback(async () => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return { success: false, error: 'Not authenticated' };

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_credential_keys', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Error fetching keys:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as { success: boolean; keys?: CredentialKey[]; error?: string };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      setKeys(result.keys || []);
      return { success: true };
    } catch (error) {
      console.error('Error fetching keys:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, []);

  const createCredentialKey = useCallback(async (keyCode: string, password: string, createdBy?: string , emailLimit?: number | null , subscriptionHours ?: number) => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return { success: false, error: 'Not authenticated' };

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_credential_key', {
        p_session_token: sessionToken,
        p_key_code: keyCode,
        p_password: password,
        p_created_by: createdBy || null,
        p_email_limit : emailLimit ?? null,
        p_subscription_hours: subscriptionHours ?? 24
      });

      if (error) {
        console.error('Error creating key:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as { success: boolean; credential_key_id?: string; key_code?: string; error?: string };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Refresh keys list
      await fetchCredentialKeys();
      return { success: true, keyCode: result.key_code };
    } catch (error) {
      console.error('Error creating key:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, [fetchCredentialKeys]);

  const deleteCredentialKey = useCallback(async (keyId: string) => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return { success: false, error: 'Not authenticated' };

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_credential_key', {
        p_session_token: sessionToken,
        p_key_id: keyId
      });

      if (error) {
        console.error('Error deleting key:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as { success: boolean; error?: string };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Refresh keys list
      await fetchCredentialKeys();
      return { success: true };
    } catch (error) {
      console.error('Error deleting key:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, [fetchCredentialKeys]);

  return {
    loading,
    keys,
    fetchCredentialKeys,
    createCredentialKey,
    deleteCredentialKey
  };
}
