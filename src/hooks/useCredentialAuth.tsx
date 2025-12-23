import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CredentialUser {
  credentialKeyId: string;
  keyCode: string;
  createdBy: string | null;
  subscriptionActive: boolean;
  subscriptionExpiresAt: string | null;
}

interface CredentialAuthContextType {
  user: CredentialUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  subscriptionActive: boolean;
  login: (keyCode: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const CredentialAuthContext = createContext<CredentialAuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'credential_session_token';

export function CredentialAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CredentialUser | null>(null);
  const [loading, setLoading] = useState(true);

  const validateSession = useCallback(async (sessionToken: string): Promise<CredentialUser | null> => {
    try {
      const { data, error } = await supabase.rpc('validate_session', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('Session validation error:', error);
        return null;
      }

      const result = data as {
        valid: boolean;
        credential_key_id?: string;
        key_code?: string;
        created_by?: string;
        subscription_active?: boolean;
        subscription_expires_at?: string;
        error?: string;
      };

      if (!result.valid) {
        return null;
      }

      return {
        credentialKeyId: result.credential_key_id!,
        keyCode: result.key_code!,
        createdBy: result.created_by || null,
        subscriptionActive: result.subscription_active || false,
        subscriptionExpiresAt: result.subscription_expires_at || null,
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    
    if (!sessionToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    const validatedUser = await validateSession(sessionToken);
    setUser(validatedUser);
    
    if (!validatedUser) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    
    setLoading(false);
  }, [validateSession]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (keyCode: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('credential_login', {
        p_key_code: keyCode.trim().toUpperCase(),
        p_password: password
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        session_token?: string;
        credential_key_id?: string;
        expires_at?: string;
        error?: string;
      };

      if (!result.success) {
        return { success: false, error: result.error || 'Login failed' };
      }

      // Store session token
      localStorage.setItem(SESSION_TOKEN_KEY, result.session_token!);

      // Validate and set user
      const validatedUser = await validateSession(result.session_token!);
      setUser(validatedUser);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setUser(null);
  };

  const isAuthenticated = Boolean(user);
  const subscriptionActive = user?.subscriptionActive || false;

  return (
    <CredentialAuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isAuthenticated, 
        subscriptionActive,
        login, 
        logout, 
        refreshSession 
      }}
    >
      {children}
    </CredentialAuthContext.Provider>
  );
}

export function useCredentialAuth() {
  const context = useContext(CredentialAuthContext);
  if (context === undefined) {
    throw new Error('useCredentialAuth must be used within a CredentialAuthProvider');
  }
  return context;
}
