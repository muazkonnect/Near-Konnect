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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_placement_settings: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          frequency_max: number
          frequency_min: number
          id: string
          placement_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          frequency_max?: number
          frequency_min?: number
          id?: string
          placement_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          frequency_max?: number
          frequency_min?: number
          id?: string
          placement_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      blood_requests: {
        Row: {
          blood_group: string
          city: string | null
          created_at: string
          id: string
          message: string | null
          requester_id: string
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          blood_group: string
          city?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          blood_group?: string
          city?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_requester_id_fkey_profiles"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          service_description: string
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          booking_date: string
          booking_time?: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          service_description?: string
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          service_description?: string
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey_profiles"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      featured_services: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          owner_user_id: string | null
          priority: number
          rotation_seed: number
          service_id: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          owner_user_id?: string | null
          priority?: number
          rotation_seed?: number
          service_id: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          owner_user_id?: string | null
          priority?: number
          rotation_seed?: number
          service_id?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_key: string | null
          created_at: string
          delivered_at: string | null
          id: string
          message_text: string
          receiver_id: string
          seen_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
          updated_at: string
        }
        Insert: {
          conversation_key?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          message_text: string
          receiver_id: string
          seen_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
        }
        Update: {
          conversation_key?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          message_text?: string
          receiver_id?: string
          seen_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey_profiles"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey_profiles"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      native_ads: {
        Row: {
          ad_type: string
          created_at: string
          created_by: string | null
          cta_label: string
          cta_url: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          placement: string
          priority: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ad_type?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string
          cta_url: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          priority?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ad_type?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string
          cta_url?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          priority?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blood_group: string | null
          city: string | null
          created_at: string
          donor_status: string
          full_name: string
          id: string
          is_blood_donor: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          donor_status?: string
          full_name?: string
          id?: string
          is_blood_donor?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          donor_status?: string
          full_name?: string
          id?: string
          is_blood_donor?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          rating: number
          review_text: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          rating: number
          review_text?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
          review_text?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey_profiles"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_analytics_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id: string
          metadata: Json
          owner_user_id: string | null
          service_id: string
          source: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          metadata?: Json
          owner_user_id?: string | null
          service_id: string
          source?: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          metadata?: Json
          owner_user_id?: string | null
          service_id?: string
          source?: string
        }
        Relationships: []
      }
      service_boosts: {
        Row: {
          boost_type: Database["public"]["Enums"]["boost_type"]
          created_at: string
          ends_at: string | null
          id: string
          metadata: Json
          owner_user_id: string
          price_cents: number | null
          service_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["boost_status"]
          updated_at: string
          visibility_multiplier: number
        }
        Insert: {
          boost_type: Database["public"]["Enums"]["boost_type"]
          created_at?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          owner_user_id: string
          price_cents?: number | null
          service_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string
          visibility_multiplier?: number
        }
        Update: {
          boost_type?: Database["public"]["Enums"]["boost_type"]
          created_at?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          owner_user_id?: string
          price_cents?: number | null
          service_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string
          visibility_multiplier?: number
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          available: boolean
          city: string | null
          cnic: string | null
          created_at: string
          description: string | null
          experience: number
          id: string
          latitude: number | null
          longitude: number | null
          main_category: string | null
          profession: string
          service_areas: string[] | null
          sub_category: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          available?: boolean
          city?: string | null
          cnic?: string | null
          created_at?: string
          description?: string | null
          experience?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          main_category?: string | null
          profession: string
          service_areas?: string[] | null
          sub_category?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          available?: boolean
          city?: string | null
          cnic?: string | null
          created_at?: string
          description?: string | null
          experience?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          main_category?: string | null
          profession?: string
          service_areas?: string[] | null
          sub_category?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "workers_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_service_analytics_summary: {
        Args: { _days?: number; _owner_user_id: string; _service_id: string }
        Returns: {
          contact_clicks: number
          conversion_rate: number
          conversions: number
          messages_received: number
          profile_views: number
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      analytics_event_type:
        | "profile_view"
        | "contact_click"
        | "message_received"
        | "conversion"
      app_role: "customer" | "worker" | "admin"
      boost_status: "pending" | "active" | "expired" | "rejected"
      boost_type: "featured_listing" | "priority_ranking" | "urgent_boost"
      message_status: "sent" | "delivered" | "seen" | "failed"
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
    Enums: {
      analytics_event_type: [
        "profile_view",
        "contact_click",
        "message_received",
        "conversion",
      ],
      app_role: ["customer", "worker", "admin"],
      boost_status: ["pending", "active", "expired", "rejected"],
      boost_type: ["featured_listing", "priority_ranking", "urgent_boost"],
      message_status: ["sent", "delivered", "seen", "failed"],
    },
  },
} as const
