export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      camera_configs: {
        Row: {
          camera_name: string
          camera_url: string | null
          created_at: string | null
          detection_enabled: boolean | null
          id: string
          is_active: boolean | null
          location: string
          updated_at: string | null
        }
        Insert: {
          camera_name: string
          camera_url?: string | null
          created_at?: string | null
          detection_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          location: string
          updated_at?: string | null
        }
        Update: {
          camera_name?: string
          camera_url?: string | null
          created_at?: string | null
          detection_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          location?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fare_rates: {
        Row: {
          created_at: string | null
          grace_period_minutes: number | null
          hourly_rate: number
          id: string
          is_active: boolean | null
          minimum_charge: number | null
          rate_name: string
        }
        Insert: {
          created_at?: string | null
          grace_period_minutes?: number | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          minimum_charge?: number | null
          rate_name: string
        }
        Update: {
          created_at?: string | null
          grace_period_minutes?: number | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          minimum_charge?: number | null
          rate_name?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          details: Json | null
          id: string
          log_type: string | null
          message: string
          timestamp: string | null
        }
        Insert: {
          details?: Json | null
          id?: string
          log_type?: string | null
          message: string
          timestamp?: string | null
        }
        Update: {
          details?: Json | null
          id?: string
          log_type?: string | null
          message?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      vehicle_detections: {
        Row: {
          camera_location: string | null
          confidence_score: number | null
          created_at: string | null
          detection_timestamp: string | null
          duration_hours: number | null
          entry_time: string | null
          exit_time: string | null
          fare_amount: number | null
          hourly_rate: number | null
          id: string
          image_url: string | null
          plate_number: string
          status: string | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          camera_location?: string | null
          confidence_score?: number | null
          created_at?: string | null
          detection_timestamp?: string | null
          duration_hours?: number | null
          entry_time?: string | null
          exit_time?: string | null
          fare_amount?: number | null
          hourly_rate?: number | null
          id?: string
          image_url?: string | null
          plate_number: string
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          camera_location?: string | null
          confidence_score?: number | null
          created_at?: string | null
          detection_timestamp?: string | null
          duration_hours?: number | null
          entry_time?: string | null
          exit_time?: string | null
          fare_amount?: number | null
          hourly_rate?: number | null
          id?: string
          image_url?: string | null
          plate_number?: string
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_vehicle_fare: {
        Args: {
          entry_timestamp: string
          exit_timestamp: string
          rate_per_hour?: number
          minimum_charge?: number
          grace_minutes?: number
        }
        Returns: {
          duration_hours: number
          fare_amount: number
        }[]
      }
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
