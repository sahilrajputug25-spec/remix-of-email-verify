export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bulk_uploads: {
        Row: {
          completed_at: string | null
          created_at: string
          file_name: string
          id: string
          invalid_count: number | null
          risky_count: number | null
          status: string
          total_emails: number | null
          user_id: string
          valid_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          file_name: string
          id?: string
          invalid_count?: number | null
          risky_count?: number | null
          status?: string
          total_emails?: number | null
          user_id: string
          valid_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          file_name?: string
          id?: string
          invalid_count?: number | null
          risky_count?: number | null
          status?: string
          total_emails?: number | null
          user_id?: string
          valid_count?: number | null
        }
        Relationships: []
      }
      credential_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_used: boolean
          key_code: string
          password_hash: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
          key_code: string
          password_hash?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
          key_code?: string
          password_hash?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      email_validations: {
        Row: {
          created_at: string
          domain: string | null
          domain_exists: boolean | null
          email: string
          id: string
          is_catch_all: boolean | null
          is_disposable: boolean | null
          is_role_based: boolean | null
          mx_records: boolean | null
          status: string
          syntax_valid: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          domain_exists?: boolean | null
          email: string
          id?: string
          is_catch_all?: boolean | null
          is_disposable?: boolean | null
          is_role_based?: boolean | null
          mx_records?: boolean | null
          status: string
          syntax_valid?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          domain_exists?: boolean | null
          email?: string
          id?: string
          is_catch_all?: boolean | null
          is_disposable?: boolean | null
          is_role_based?: boolean | null
          mx_records?: boolean | null
          status?: string
          syntax_valid?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_at: string
          created_at: string
          credential_key_id: string | null
          expires_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          activated_at?: string
          created_at?: string
          credential_key_id?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          activated_at?: string
          created_at?: string
          credential_key_id?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_credential_key_id_fkey"
            columns: ["credential_key_id"]
            isOneToOne: false
            referencedRelation: "credential_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          credential_key_id: string
          id: string
          is_active: boolean
          last_accessed_at: string
          session_token: string
        }
        Insert: {
          created_at?: string
          credential_key_id: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string
          session_token: string
        }
        Update: {
          created_at?: string
          credential_key_id?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_credential_key_id_fkey"
            columns: ["credential_key_id"]
            isOneToOne: false
            referencedRelation: "credential_keys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_subscription: { Args: { p_key_code: string }; Returns: Json }
      credential_login: {
        Args: { p_key_code: string; p_password: string }
        Returns: Json
      }
      has_active_subscription: { Args: { p_user_id: string }; Returns: boolean }
      validate_session: { Args: { p_session_token: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
