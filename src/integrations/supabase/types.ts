export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string;
          actor_credential_key_id: string | null;
          created_at: string;
          details: Json | null;
          id: string;
          ip_address: string | null;
          target_credential_key_id: string | null;
        };
        Insert: {
          action_type: string;
          actor_credential_key_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          ip_address?: string | null;
          target_credential_key_id?: string | null;
        };
        Update: {
          action_type?: string;
          actor_credential_key_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          ip_address?: string | null;
          target_credential_key_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_credential_key_id_fkey";
            columns: ["actor_credential_key_id"];
            isOneToOne: false;
            referencedRelation: "credential_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_target_credential_key_id_fkey";
            columns: ["target_credential_key_id"];
            isOneToOne: false;
            referencedRelation: "credential_keys";
            referencedColumns: ["id"];
          }
        ];
      };
      bulk_uploads: {
        Row: {
          completed_at: string | null;
          country: string | null;
          created_at: string;
          file_name: string;
          id: string;
          invalid_count: number | null;
          invalid_csv_path: string | null;
          risky_count: number | null;
          status: string;
          total_emails: number | null;
          user_id: string;
          valid_count: number | null;
          valid_csv_path: string | null;
        };
        Insert: {
          completed_at?: string | null;
          country?: string | null;
          created_at?: string;
          file_name: string;
          id?: string;
          invalid_count?: number | null;
          invalid_csv_path?: string | null;
          risky_count?: number | null;
          status?: string;
          total_emails?: number | null;
          user_id: string;
          valid_count?: number | null;
          valid_csv_path?: string | null;
        };
        Update: {
          completed_at?: string | null;
          country?: string | null;
          created_at?: string;
          file_name?: string;
          id?: string;
          invalid_count?: number | null;
          invalid_csv_path?: string | null;
          risky_count?: number | null;
          status?: string;
          total_emails?: number | null;
          user_id?: string;
          valid_count?: number | null;
          valid_csv_path?: string | null;
        };
        Relationships: [];
      };
      credential_keys: {
        Row: {
          created_at: string;
          created_by: string | null;
          email_limit: number | null;
          emails_validated: number | null;
          expires_at: string | null;
          id: string;
          is_used: boolean;
          key_code: string;
          password_hash: string | null;
          subscription_hours: number | null;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email_limit?: number | null;
          emails_validated?: number | null;
          expires_at?: string | null;
          id?: string;
          is_used?: boolean;
          key_code: string;
          password_hash?: string | null;
          subscription_hours?: number | null;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email_limit?: number | null;
          emails_validated?: number | null;
          expires_at?: string | null;
          id?: string;
          is_used?: boolean;
          key_code?: string;
          password_hash?: string | null;
          subscription_hours?: number | null;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [];
      };
      email_validations: {
        Row: {
          country: string | null;
          created_at: string;
          domain: string | null;
          domain_exists: boolean | null;
          email: string;
          id: string;
          is_catch_all: boolean | null;
          is_disposable: boolean | null;
          is_role_based: boolean | null;
          mx_records: boolean | null;
          status: string;
          syntax_valid: boolean | null;
          user_id: string;
        };
        Insert: {
          country?: string | null;
          created_at?: string;
          domain?: string | null;
          domain_exists?: boolean | null;
          email: string;
          id?: string;
          is_catch_all?: boolean | null;
          is_disposable?: boolean | null;
          is_role_based?: boolean | null;
          mx_records?: boolean | null;
          status: string;
          syntax_valid?: boolean | null;
          user_id: string;
        };
        Update: {
          country?: string | null;
          created_at?: string;
          domain?: string | null;
          domain_exists?: boolean | null;
          email?: string;
          id?: string;
          is_catch_all?: boolean | null;
          is_disposable?: boolean | null;
          is_role_based?: boolean | null;
          mx_records?: boolean | null;
          status?: string;
          syntax_valid?: boolean | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          activated_at: string;
          created_at: string;
          credential_key_id: string | null;
          expires_at: string;
          id: string;
          is_active: boolean;
          user_id: string | null;
        };
        Insert: {
          activated_at?: string;
          created_at?: string;
          credential_key_id?: string | null;
          expires_at: string;
          id?: string;
          is_active?: boolean;
          user_id?: string | null;
        };
        Update: {
          activated_at?: string;
          created_at?: string;
          credential_key_id?: string | null;
          expires_at?: string;
          id?: string;
          is_active?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_credential_key_id_fkey";
            columns: ["credential_key_id"];
            isOneToOne: false;
            referencedRelation: "credential_keys";
            referencedColumns: ["id"];
          }
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          credential_key_id: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          created_at?: string;
          credential_key_id: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          created_at?: string;
          credential_key_id?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_credential_key_id_fkey";
            columns: ["credential_key_id"];
            isOneToOne: false;
            referencedRelation: "credential_keys";
            referencedColumns: ["id"];
          }
        ];
      };
      user_sessions: {
        Row: {
          created_at: string;
          credential_key_id: string;
          id: string;
          is_active: boolean;
          last_accessed_at: string;
          session_token: string;
        };
        Insert: {
          created_at?: string;
          credential_key_id: string;
          id?: string;
          is_active?: boolean;
          last_accessed_at?: string;
          session_token: string;
        };
        Update: {
          created_at?: string;
          credential_key_id?: string;
          id?: string;
          is_active?: boolean;
          last_accessed_at?: string;
          session_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_sessions_credential_key_id_fkey";
            columns: ["credential_key_id"];
            isOneToOne: false;
            referencedRelation: "credential_keys";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_subscription: { Args: { p_key_code: string }; Returns: Json };
      create_bulk_upload: {
        Args: {
          p_country?: string;
          p_file_name: string;
          p_session_token: string;
          p_total_emails: number;
        };
        Returns: Json;
      };
      batch_save_email_validations: {
        Args: { p_credential_key_id: string; p_validations: Json };
        Returns: Json;
      };
      check_and_increment_email_count: {
        Args: { p_count?: number; p_session_token: string };
        Returns: Json;
      };
      create_credential_key:
         {
            Args: {
              p_created_by?: string;
              p_email_limit?: number;
              p_key_code: string;
              p_password: string;
              p_session_token: string;
              p_subscription_hours?: number;
            };
            Returns: Json;
          };
      credential_login: {
        Args: { p_key_code: string; p_password: string };
        Returns: Json;
      };
      delete_bulk_upload: {
        Args: { p_session_token: string; p_upload_id: string };
        Returns: Json;
      };
      delete_credential_key: {
        Args: { p_key_id: string; p_session_token: string };
        Returns: Json;
      };
      delete_email_validation: {
        Args: { p_session_token: string; p_validation_id: string };
        Returns: Json;
      };
      get_activity_logs: {
        Args: {
          p_action_type?: string;
          p_limit?: number;
          p_offset?: number;
          p_session_token: string;
        };
        Returns: Json;
      };
      get_all_credential_keys: {
        Args: { p_session_token: string };
        Returns: Json;
      };

      get_bulk_upload_by_id: {
        Args: { p_session_token: string; p_upload_id: string };
        Returns: Json;
      };
      get_user_bulk_uploads: {
        Args: {
          p_session_token: string;
        };
        Returns: Json;
      };
      get_email_usage: { Args: { p_session_token: string }; Returns: Json };
      get_user_email_validations: {
        Args: { p_limit?: number; p_session_token: string };
        Returns: Json;
      };
      get_user_subscription: {
        Args: { p_session_token: string };
        Returns: Json;
      };
      has_active_subscription: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          p_credential_key_id: string;
          p_role: Database["public"]["Enums"]["app_role"];
        };
        Returns: boolean;
      };
      is_admin: { Args: { p_session_token: string }; Returns: boolean };
      log_activity: {
        Args: {
          p_action_type: string;
          p_actor_credential_key_id: string;
          p_details?: Json;
          p_target_credential_key_id?: string;
        };
        Returns: string;
      };
      save_email_validation: {
        Args: {
          p_credential_key_id: string;
          p_domain: string;
          p_domain_exists: boolean;
          p_email: string;
          p_is_catch_all: boolean;
          p_is_disposable: boolean;
          p_is_role_based: boolean;
          p_mx_records: boolean;
          p_status: string;
          p_syntax_valid: boolean;
        };
        Returns: string;
      };
      update_bulk_upload:
        | {
            Args: {
              p_invalid_count: number;
              p_risky_count: number;
              p_session_token: string;
              p_status?: string;
              p_upload_id: string;
              p_valid_count: number;
              p_invalid_csv_path: string;
              p_valid_csv_path: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_invalid_count: number;
              p_invalid_csv_path?: string;
              p_risky_count: number;
              p_session_token: string;
              p_status?: string;
              p_upload_id: string;
              p_valid_count: number;
              p_valid_csv_path?: string;
            };
            Returns: Json;
          };
      update_bulk_upload_counts: {
        Args: {
          p_invalid_count: number;
          p_risky_count: number;
          p_session_token: string;
          p_upload_id: string;
          p_valid_count: number;
        };
        Returns: Json;
      };
      validate_session: { Args: { p_session_token: string }; Returns: Json };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
