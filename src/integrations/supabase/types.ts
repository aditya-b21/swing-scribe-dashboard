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
      community_access_logs: {
        Row: {
          accessed_at: string
          id: string
          user_email: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          id?: string
          user_email: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          id?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_pinned: boolean | null
          post_type: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          post_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          post_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      community_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          password: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          password: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          password?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          discount_type: string
          discount_value: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          admin_notes: string | null
          can_see_password: boolean | null
          coupon_code: string | null
          created_at: string | null
          discount_amount: number | null
          final_amount: number
          id: string
          payment_amount: number
          payment_proof_url: string | null
          status: string | null
          user_email: string
          user_id: string | null
          user_name: string
          utr_reference: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          can_see_password?: boolean | null
          coupon_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          final_amount: number
          id?: string
          payment_amount: number
          payment_proof_url?: string | null
          status?: string | null
          user_email: string
          user_id?: string | null
          user_name: string
          utr_reference: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          can_see_password?: boolean | null
          coupon_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          final_amount?: number
          id?: string
          payment_amount?: number
          payment_proof_url?: string | null
          status?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
          utr_reference?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_approved: boolean | null
          community_request_status: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_community_member: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          community_request_status?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_community_member?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          community_request_status?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_community_member?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scan_metadata: {
        Row: {
          created_at: string
          filtered_results_count: number | null
          id: string
          scan_date: string
          scan_duration_seconds: number | null
          scan_type: string
          status: string | null
          total_stocks_scanned: number | null
        }
        Insert: {
          created_at?: string
          filtered_results_count?: number | null
          id?: string
          scan_date: string
          scan_duration_seconds?: number | null
          scan_type?: string
          status?: string | null
          total_stocks_scanned?: number | null
        }
        Update: {
          created_at?: string
          filtered_results_count?: number | null
          id?: string
          scan_date?: string
          scan_duration_seconds?: number | null
          scan_type?: string
          status?: string | null
          total_stocks_scanned?: number | null
        }
        Relationships: []
      }
      stock_data: {
        Row: {
          close: number
          created_at: string
          date: string
          exchange: string
          high: number
          id: string
          low: number
          open: number
          symbol: string
          volume: number
        }
        Insert: {
          close: number
          created_at?: string
          date: string
          exchange: string
          high: number
          id?: string
          low: number
          open: number
          symbol: string
          volume: number
        }
        Update: {
          close?: number
          created_at?: string
          date?: string
          exchange?: string
          high?: number
          id?: string
          low?: number
          open?: number
          symbol?: string
          volume?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          buy_price: number
          chart_image_url: string | null
          created_at: string
          id: string
          profit_loss: number | null
          quantity: number
          return_percentage: number | null
          sell_price: number | null
          setup_name: string
          stock_name: string
          trade_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buy_price: number
          chart_image_url?: string | null
          created_at?: string
          id?: string
          profit_loss?: number | null
          quantity?: number
          return_percentage?: number | null
          sell_price?: number | null
          setup_name: string
          stock_name: string
          trade_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buy_price?: number
          chart_image_url?: string | null
          created_at?: string
          id?: string
          profit_loss?: number | null
          quantity?: number
          return_percentage?: number | null
          sell_price?: number | null
          setup_name?: string
          stock_name?: string
          trade_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vcp_scan_results: {
        Row: {
          atr_14: number | null
          breakout_signal: boolean | null
          close_price: number
          created_at: string
          ema_150: number | null
          ema_200: number | null
          ema_50: number | null
          exchange: string
          id: string
          percent_from_52w_high: number | null
          scan_date: string
          symbol: string
          volatility_contraction: number | null
          volume: number
          volume_avg_20: number | null
        }
        Insert: {
          atr_14?: number | null
          breakout_signal?: boolean | null
          close_price: number
          created_at?: string
          ema_150?: number | null
          ema_200?: number | null
          ema_50?: number | null
          exchange: string
          id?: string
          percent_from_52w_high?: number | null
          scan_date: string
          symbol: string
          volatility_contraction?: number | null
          volume: number
          volume_avg_20?: number | null
        }
        Update: {
          atr_14?: number | null
          breakout_signal?: boolean | null
          close_price?: number
          created_at?: string
          ema_150?: number | null
          ema_200?: number | null
          ema_50?: number | null
          exchange?: string
          id?: string
          percent_from_52w_high?: number | null
          scan_date?: string
          symbol?: string
          volatility_contraction?: number | null
          volume?: number
          volume_avg_20?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_email: string }
        Returns: boolean
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
