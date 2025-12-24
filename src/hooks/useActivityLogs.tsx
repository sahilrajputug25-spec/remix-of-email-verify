import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLog {
  id: string;
  action_type: string;
  actor_key_code: string | null;
  actor_created_by: string | null;
  target_key_code: string | null;
  target_created_by: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface UseActivityLogsReturn {
  logs: ActivityLog[];
  loading: boolean;
  total: number;
  fetchLogs: (actionType?: string | null, limit?: number, offset?: number) => Promise<{ success: boolean; error?: string }>;
}

const SESSION_TOKEN_KEY = 'credential_session_token';

export function useActivityLogs(): UseActivityLogsReturn {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

  const fetchLogs = useCallback(async (
    actionType: string | null = null,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; error?: string }> => {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_activity_logs', {
        p_session_token: sessionToken,
        p_limit: limit,
        p_offset: offset,
        p_action_type: actionType
      });

      if (error) {
        console.error('Error fetching activity logs:', error);
        return { success: false, error: error.message };
      }

      const result = data as unknown as { 
        success: boolean; 
        logs?: ActivityLog[]; 
        total?: number;
        error?: string 
      };

      if (!result.success) {
        return { success: false, error: result.error };
      }

      setLogs(result.logs || []);
      setTotal(result.total || 0);
      return { success: true };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logs,
    loading,
    total,
    fetchLogs
  };
}
