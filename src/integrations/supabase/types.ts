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
      ad_campaigns: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          created_at: string
          duration_days: number
          ends_at: string
          id: string
          owner_user_id: string
          placement_type: Database["public"]["Enums"]["ad_placement"]
          priority: number
          sparks_cost: number
          starts_at: string
          status: Database["public"]["Enums"]["ad_status"]
          updated_at: string
          worker_id: string
        }
        Insert: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          created_at?: string
          duration_days: number
          ends_at: string
          id?: string
          owner_user_id: string
          placement_type?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          sparks_cost?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
          worker_id: string
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          created_at?: string
          duration_days?: number
          ends_at?: string
          id?: string
          owner_user_id?: string
          placement_type?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          sparks_cost?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      ad_clicks: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          placement: string | null
          viewer_point: unknown
          viewer_user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          placement?: string | null
          viewer_point?: unknown
          viewer_user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          placement?: string | null
          viewer_point?: unknown
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          placement: string | null
          user_agent: string | null
          viewer_latitude: number | null
          viewer_longitude: number | null
          viewer_user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          placement?: string | null
          user_agent?: string | null
          viewer_latitude?: number | null
          viewer_longitude?: number | null
          viewer_user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          placement?: string | null
          user_agent?: string | null
          viewer_latitude?: number | null
          viewer_longitude?: number | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "native_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_geo_targets: {
        Row: {
          area: string | null
          campaign_id: string
          center: unknown
          city: string | null
          country: string | null
          created_at: string
          radius_km: number
        }
        Insert: {
          area?: string | null
          campaign_id: string
          center: unknown
          city?: string | null
          country?: string | null
          created_at?: string
          radius_km: number
        }
        Update: {
          area?: string | null
          campaign_id?: string
          center?: unknown
          city?: string | null
          country?: string | null
          created_at?: string
          radius_km?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_geo_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          campaign_id: string
          created_at: string
          hour_bucket: string
          id: string
          placement: string | null
          viewer_point: unknown
          viewer_user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          hour_bucket?: string
          id?: string
          placement?: string | null
          viewer_point?: unknown
          viewer_user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          hour_bucket?: string
          id?: string
          placement?: string | null
          viewer_point?: unknown
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ad_pricing_rules: {
        Row: {
          active: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          active?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          active?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      avatar_reset_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blood_requests: {
        Row: {
          blood_group: string
          city: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
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
      contact_reveals: {
        Row: {
          client_user_id: string
          created_at: string
          decided_at: string | null
          id: string
          request_message: string | null
          status: string
          updated_at: string
          worker_user_id: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          request_message?: string | null
          status?: string
          updated_at?: string
          worker_user_id: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          request_message?: string | null
          status?: string
          updated_at?: string
          worker_user_id?: string
        }
        Relationships: []
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
      featured_events: {
        Row: {
          created_at: string
          event_type: string
          featured_id: string | null
          id: string
          viewer_user_id: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          featured_id?: string | null
          id?: string
          viewer_user_id?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          featured_id?: string | null
          id?: string
          viewer_user_id?: string | null
          worker_id?: string
        }
        Relationships: []
      }
      featured_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          worker_id?: string
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
      job_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          job_id: string
          message: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          job_id: string
          message?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget: number | null
          category: string
          city: string | null
          created_at: string
          description: string
          id: string
          poster_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          category?: string
          city?: string | null
          created_at?: string
          description?: string
          id?: string
          poster_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          category?: string
          city?: string | null
          created_at?: string
          description?: string
          id?: string
          poster_id?: string
          status?: string
          title?: string
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
          target_latitude: number | null
          target_longitude: number | null
          target_radius_km: number | null
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
          target_latitude?: number | null
          target_longitude?: number | null
          target_radius_km?: number | null
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
          target_latitude?: number | null
          target_longitude?: number | null
          target_radius_km?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string
          bonus_sparks: number
          created_at: string
          currency: string
          decided_at: string | null
          decided_by: string | null
          id: string
          package_id: string | null
          payment_method: string
          price_amount: number
          proof_url: string | null
          reference: string
          sparks_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          bonus_sparks?: number
          created_at?: string
          currency: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          package_id?: string | null
          payment_method: string
          price_amount: number
          proof_url?: string | null
          reference?: string
          sparks_amount: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          bonus_sparks?: number
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string
          price_amount?: number
          proof_url?: string | null
          reference?: string
          sparks_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "sparks_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          easypaisa_account_name: string | null
          easypaisa_number: string | null
          easypaisa_qr_url: string | null
          id: number
          instructions: string | null
          jazzcash_account_name: string | null
          jazzcash_number: string | null
          jazzcash_qr_url: string | null
          updated_at: string
          updated_by: string | null
          usdt_address: string | null
          usdt_network: string | null
          usdt_qr_url: string | null
        }
        Insert: {
          easypaisa_account_name?: string | null
          easypaisa_number?: string | null
          easypaisa_qr_url?: string | null
          id?: number
          instructions?: string | null
          jazzcash_account_name?: string | null
          jazzcash_number?: string | null
          jazzcash_qr_url?: string | null
          updated_at?: string
          updated_by?: string | null
          usdt_address?: string | null
          usdt_network?: string | null
          usdt_qr_url?: string | null
        }
        Update: {
          easypaisa_account_name?: string | null
          easypaisa_number?: string | null
          easypaisa_qr_url?: string | null
          id?: number
          instructions?: string | null
          jazzcash_account_name?: string | null
          jazzcash_number?: string | null
          jazzcash_qr_url?: string | null
          updated_at?: string
          updated_by?: string | null
          usdt_address?: string | null
          usdt_network?: string | null
          usdt_qr_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blood_group: string | null
          city: string | null
          contact_methods: Json
          created_at: string
          donor_status: string
          full_name: string
          id: string
          is_blood_donor: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          show_contact: boolean
          updated_at: string
          use_whatsapp: boolean
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: string | null
          city?: string | null
          contact_methods?: Json
          created_at?: string
          donor_status?: string
          full_name?: string
          id?: string
          is_blood_donor?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          show_contact?: boolean
          updated_at?: string
          use_whatsapp?: boolean
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          blood_group?: string | null
          city?: string | null
          contact_methods?: Json
          created_at?: string
          donor_status?: string
          full_name?: string
          id?: string
          is_blood_donor?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          show_contact?: boolean
          updated_at?: string
          use_whatsapp?: boolean
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          device_id: string | null
          endpoint: string | null
          fcm_token: string | null
          id: string
          p256dh: string | null
          platform: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          device_id?: string | null
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          p256dh?: string | null
          platform: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          device_id?: string | null
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          p256dh?: string | null
          platform?: string
          updated_at?: string
          user_agent?: string | null
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
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sparks_packages: {
        Row: {
          bonus_sparks: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_pkr: number
          price_usdt: number
          sort_order: number
          sparks: number
          updated_at: string
        }
        Insert: {
          bonus_sparks?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_pkr?: number
          price_usdt?: number
          sort_order?: number
          sparks: number
          updated_at?: string
        }
        Update: {
          bonus_sparks?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_pkr?: number
          price_usdt?: number
          sort_order?: number
          sparks?: number
          updated_at?: string
        }
        Relationships: []
      }
      sparks_transactions: {
        Row: {
          campaign_id: string | null
          created_at: string
          delta: number
          id: string
          notes: string | null
          owner_user_id: string
          payment_method: string | null
          payment_request_id: string | null
          reason: Database["public"]["Enums"]["sparks_reason"]
          status: string
          worker_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          delta: number
          id?: string
          notes?: string | null
          owner_user_id: string
          payment_method?: string | null
          payment_request_id?: string | null
          reason: Database["public"]["Enums"]["sparks_reason"]
          status?: string
          worker_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          notes?: string | null
          owner_user_id?: string
          payment_method?: string | null
          payment_request_id?: string | null
          reason?: Database["public"]["Enums"]["sparks_reason"]
          status?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sparks_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sparks_wallets: {
        Row: {
          balance: number
          created_at: string
          owner_user_id: string
          total_purchased: number
          total_spent: number
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          owner_user_id: string
          total_purchased?: number
          total_spent?: number
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          owner_user_id?: string
          total_purchased?: number
          total_spent?: number
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
      worker_location_change_requests: {
        Row: {
          admin_comment: string
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          decided_at: string | null
          decided_by: string | null
          id: string
          reason: string
          requested_latitude: number
          requested_longitude: number
          status: string
          updated_at: string
          worker_user_id: string
        }
        Insert: {
          admin_comment?: string
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string
          requested_latitude: number
          requested_longitude: number
          status?: string
          updated_at?: string
          worker_user_id: string
        }
        Update: {
          admin_comment?: string
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string
          requested_latitude?: number
          requested_longitude?: number
          status?: string
          updated_at?: string
          worker_user_id?: string
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
          expertise_tags: string[]
          id: string
          latitude: number | null
          longitude: number | null
          main_category: string | null
          profession: string
          service_areas: string[] | null
          sub_category: string | null
          uid: string | null
          updated_at: string
          user_id: string
          verified: boolean
          workplace_location: unknown
        }
        Insert: {
          available?: boolean
          city?: string | null
          cnic?: string | null
          created_at?: string
          description?: string | null
          experience?: number
          expertise_tags?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          main_category?: string | null
          profession: string
          service_areas?: string[] | null
          sub_category?: string | null
          uid?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          workplace_location?: unknown
        }
        Update: {
          available?: boolean
          city?: string | null
          cnic?: string | null
          created_at?: string
          description?: string | null
          experience?: number
          expertise_tags?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          main_category?: string | null
          profession?: string
          service_areas?: string[] | null
          sub_category?: string | null
          uid?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          workplace_location?: unknown
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
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _spend_sparks: {
        Args: {
          _amount: number
          _campaign_id: string
          _owner_user_id: string
          _reason: Database["public"]["Enums"]["sparks_reason"]
          _worker_id: string
        }
        Returns: undefined
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_credit_sparks: {
        Args: {
          p_amount: number
          p_notes?: string
          p_reason?: string
          p_user: string
        }
        Returns: number
      }
      admin_debit_sparks: {
        Args: {
          p_amount: number
          p_notes?: string
          p_reason?: string
          p_user: string
        }
        Returns: number
      }
      admin_grant_sparks: {
        Args: { _amount: number; _notes?: string; _worker_id: string }
        Returns: number
      }
      approve_payment_request: {
        Args: { p_id: string; p_note?: string }
        Returns: string
      }
      calc_sparks_cost: {
        Args: {
          _ad_type: Database["public"]["Enums"]["ad_type"]
          _duration_days: number
          _radius_km: number
        }
        Returns: number
      }
      can_view_contact: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      create_ad_campaign:
        | {
            Args: {
              _ad_type: Database["public"]["Enums"]["ad_type"]
              _area?: string
              _center_lat: number
              _center_lng: number
              _city?: string
              _country?: string
              _duration_days: number
              _radius_km: number
              _worker_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _ad_type: Database["public"]["Enums"]["ad_type"]
              _area?: string
              _center_lat: number
              _center_lng: number
              _city?: string
              _country?: string
              _duration_days: number
              _placement_type?: Database["public"]["Enums"]["ad_placement"]
              _radius_km: number
              _worker_id: string
            }
            Returns: string
          }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_campaigns: { Args: never; Returns: number }
      generate_worker_uid: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_ad_stats: {
        Args: { _days?: number }
        Returns: {
          ad_id: string
          clicks: number
          ctr: number
          impressions: number
        }[]
      }
      get_featured_stats: {
        Args: { _days?: number }
        Returns: {
          clicks: number
          ctr: number
          impressions: number
          worker_id: string
        }[]
      }
      get_nearby_blood_donors: {
        Args: {
          radius_km?: number
          req_blood_group: string
          req_lat: number
          req_lng: number
        }
        Returns: {
          blood_group: string
          city: string
          distance_km: number
          full_name: string
          user_id: string
        }[]
      }
      get_nearby_blood_requests: {
        Args: {
          donor_blood_group: string
          donor_lat: number
          donor_lng: number
          radius_km?: number
        }
        Returns: {
          blood_group: string
          city: string
          created_at: string
          distance_km: number
          id: string
          message: string
          requester_id: string
          requester_name: string
          urgency: string
        }[]
      }
      get_nearby_workers: {
        Args: {
          lat: number
          lng: number
          max_results?: number
          radius_meters?: number
        }
        Returns: {
          distance: number
          id: string
          name: string
        }[]
      }
      get_promoted_explore:
        | {
            Args: {
              _exclude_campaign_ids?: string[]
              _limit?: number
              _offset?: number
              _viewer_lat: number
              _viewer_lng: number
            }
            Returns: {
              campaign_id: string
              distance_km: number
              ends_at: string
              priority: number
              user_id: string
              worker_id: string
            }[]
          }
        | {
            Args: {
              _exclude_campaign_ids?: string[]
              _limit?: number
              _main_category?: string
              _offset?: number
              _radius_km?: number
              _search?: string
              _sub_category?: string
              _viewer_lat: number
              _viewer_lng: number
            }
            Returns: {
              campaign_id: string
              distance_km: number
              ends_at: string
              match_score: number
              priority: number
              user_id: string
              worker_id: string
            }[]
          }
      get_promoted_workers: {
        Args: {
          _limit?: number
          _max_viewer_radius_km?: number
          _placement?: Database["public"]["Enums"]["ad_placement"]
          _viewer_lat: number
          _viewer_lng: number
        }
        Returns: {
          campaign_id: string
          distance_km: number
          ends_at: string
          priority: number
          user_id: string
          worker_id: string
        }[]
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
      get_top_rated_promoted: {
        Args: {
          _limit?: number
          _placement?: Database["public"]["Enums"]["ad_placement"]
          _viewer_lat: number
          _viewer_lng: number
        }
        Returns: {
          avg_rating: number
          campaign_id: string
          distance_km: number
          ends_at: string
          priority: number
          user_id: string
          worker_id: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      grant_sparks: {
        Args: { _amount: number; _notes?: string; _worker_id: string }
        Returns: number
      }
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean }
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
      invoke_send_push: {
        Args: {
          _body: string
          _tag: string
          _title: string
          _urgent: boolean
          _url: string
          _user_id: string
        }
        Returns: undefined
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      phone_exists: { Args: { _phone: string }; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reject_payment_request: {
        Args: { p_id: string; p_note?: string }
        Returns: string
      }
      set_campaign_status: {
        Args: {
          _campaign_id: string
          _status: Database["public"]["Enums"]["ad_status"]
        }
        Returns: undefined
      }
      set_worker_location: {
        Args: { lat: number; lng: number }
        Returns: undefined
      }
      spend_sparks: {
        Args: {
          p_amount: number
          p_campaign_id?: string
          p_notes?: string
          p_reason?: string
        }
        Returns: number
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      ad_placement: "homepage" | "explore"
      ad_status: "active" | "paused" | "expired" | "rejected"
      ad_type: "local" | "international"
      analytics_event_type:
        | "profile_view"
        | "contact_click"
        | "message_received"
        | "conversion"
      app_role:
        | "customer"
        | "worker"
        | "admin"
        | "manager"
        | "ads_manager"
        | "moderator"
      boost_status: "pending" | "active" | "expired" | "rejected"
      boost_type: "featured_listing" | "priority_ranking" | "urgent_boost"
      message_status: "sent" | "delivered" | "seen" | "failed"
      sparks_reason:
        | "admin_grant"
        | "campaign_spend"
        | "refund"
        | "admin_adjust"
        | "purchase"
        | "admin_added"
        | "ad_spent"
        | "bonus"
        | "deduction"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      ad_placement: ["homepage", "explore"],
      ad_status: ["active", "paused", "expired", "rejected"],
      ad_type: ["local", "international"],
      analytics_event_type: [
        "profile_view",
        "contact_click",
        "message_received",
        "conversion",
      ],
      app_role: [
        "customer",
        "worker",
        "admin",
        "manager",
        "ads_manager",
        "moderator",
      ],
      boost_status: ["pending", "active", "expired", "rejected"],
      boost_type: ["featured_listing", "priority_ranking", "urgent_boost"],
      message_status: ["sent", "delivered", "seen", "failed"],
      sparks_reason: [
        "admin_grant",
        "campaign_spend",
        "refund",
        "admin_adjust",
        "purchase",
        "admin_added",
        "ad_spent",
        "bonus",
        "deduction",
      ],
    },
  },
} as const
