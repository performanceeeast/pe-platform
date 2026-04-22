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
      aged_inventory: {
        Row: {
          created_at: string
          created_by: string | null
          date_in_stock: string | null
          description: string | null
          id: string
          make: string | null
          model_name: string | null
          notes: string | null
          sold_at: string | null
          sold_by_user_id: string | null
          spiff_amount: number
          stock_number: string
          store_id: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_in_stock?: string | null
          description?: string | null
          id?: string
          make?: string | null
          model_name?: string | null
          notes?: string | null
          sold_at?: string | null
          sold_by_user_id?: string | null
          spiff_amount?: number
          stock_number: string
          store_id: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_in_stock?: string | null
          description?: string | null
          id?: string
          make?: string | null
          model_name?: string | null
          notes?: string | null
          sold_at?: string | null
          sold_by_user_id?: string | null
          spiff_amount?: number
          stock_number?: string
          store_id?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aged_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appt_date: string
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          kept: boolean
          lead_source_id: string | null
          notes: string | null
          salesperson_user_id: string | null
          sold: boolean
          store_id: string
          unit_interested: string | null
          updated_at: string
        }
        Insert: {
          appt_date: string
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          kept?: boolean
          lead_source_id?: string | null
          notes?: string | null
          salesperson_user_id?: string | null
          sold?: boolean
          store_id: string
          unit_interested?: string | null
          updated_at?: string
        }
        Update: {
          appt_date?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          kept?: boolean
          lead_source_id?: string | null
          notes?: string | null
          salesperson_user_id?: string | null
          sold?: boolean
          store_id?: string
          unit_interested?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      be_spiffs: {
        Row: {
          all_products_bonus: number
          amount: number
          created_at: string
          fni_product_id: string
          id: string
          month: number
          store_id: string
          updated_at: string
          year: number
        }
        Insert: {
          all_products_bonus?: number
          amount?: number
          created_at?: string
          fni_product_id: string
          id?: string
          month: number
          store_id: string
          updated_at?: string
          year: number
        }
        Update: {
          all_products_bonus?: number
          amount?: number
          created_at?: string
          fni_product_id?: string
          id?: string
          month?: number
          store_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "be_spiffs_fni_product_id_fkey"
            columns: ["fni_product_id"]
            isOneToOne: false
            referencedRelation: "fni_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "be_spiffs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events_cache: {
        Row: {
          created_task_id: string | null
          description: string | null
          end_time: string
          google_event_id: string
          id: string
          location: string | null
          start_time: string
          synced_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_task_id?: string | null
          description?: string | null
          end_time: string
          google_event_id: string
          id?: string
          location?: string | null
          start_time: string
          synced_at?: string
          title: string
          user_id: string
        }
        Update: {
          created_task_id?: string | null
          description?: string | null
          end_time?: string
          google_event_id?: string
          id?: string
          location?: string | null
          start_time?: string
          synced_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_cache_created_task_id_fkey"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          month: number
          name: string
          prize: string | null
          store_id: string
          updated_at: string
          winner_user_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          month: number
          name: string
          prize?: string | null
          store_id: string
          updated_at?: string
          winner_user_id?: string | null
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          month?: number
          name?: string
          prize?: string | null
          store_id?: string
          updated_at?: string
          winner_user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_lead_counts: {
        Row: {
          count_date: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          store_id: string
          total_leads: number
          updated_at: string
        }
        Insert: {
          count_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          store_id: string
          total_leads?: number
          updated_at?: string
        }
        Update: {
          count_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          store_id?: string
          total_leads?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_lead_counts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_fni_products: {
        Row: {
          created_at: string
          deal_id: string
          fni_product_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          fni_product_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          fni_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_fni_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_fni_products_fni_product_id_fkey"
            columns: ["fni_product_id"]
            isOneToOne: false
            referencedRelation: "fni_products"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          back_end_total: number | null
          created_at: string
          created_by: string | null
          customer_name: string
          deal_date: string
          deal_number: string | null
          finance_manager_user_id: string | null
          finance_reserve: number | null
          id: string
          notes: string | null
          pga_total: number | null
          salesperson_user_id: string | null
          status: Database["public"]["Enums"]["deal_status"]
          stock_number: string | null
          store_id: string
          unit_count: number
          unit_type_id: string | null
          updated_at: string
        }
        Insert: {
          back_end_total?: number | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          deal_date: string
          deal_number?: string | null
          finance_manager_user_id?: string | null
          finance_reserve?: number | null
          id?: string
          notes?: string | null
          pga_total?: number | null
          salesperson_user_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          stock_number?: string | null
          store_id: string
          unit_count?: number
          unit_type_id?: string | null
          updated_at?: string
        }
        Update: {
          back_end_total?: number | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          deal_date?: string
          deal_number?: string | null
          finance_manager_user_id?: string | null
          finance_reserve?: number | null
          id?: string
          notes?: string | null
          pga_total?: number | null
          salesperson_user_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          stock_number?: string | null
          store_id?: string
          unit_count?: number
          unit_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_unit_type_id_fkey"
            columns: ["unit_type_id"]
            isOneToOne: false
            referencedRelation: "unit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      fni_products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fni_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          original_pdf_url: string | null
          processed_at: string | null
          tasks_extracted_count: number
          transcribed_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          id?: string
          original_pdf_url?: string | null
          processed_at?: string | null
          tasks_extracted_count?: number
          transcribed_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          original_pdf_url?: string | null
          processed_at?: string | null
          tasks_extracted_count?: number
          transcribed_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pga_tiers: {
        Row: {
          created_at: string
          id: string
          max_amount: number
          min_amount: number
          month: number
          spiff_amount: number
          store_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_amount: number
          min_amount: number
          month: number
          spiff_amount: number
          store_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          max_amount?: number
          min_amount?: number
          month?: number
          spiff_amount?: number
          store_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pga_tiers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"]
          description: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_end_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_docs: {
        Row: {
          created_at: string
          effective_end: string | null
          effective_start: string | null
          id: string
          notes: string | null
          storage_path: string
          store_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          effective_end?: string | null
          effective_start?: string | null
          id?: string
          notes?: string | null
          storage_path: string
          store_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          effective_end?: string | null
          effective_start?: string | null
          id?: string
          notes?: string | null
          storage_path?: string
          store_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_docs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_ops: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"]
          description: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          last_generated_at: string | null
          next_due: string
          template_description: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          last_generated_at?: string | null
          next_due: string
          template_description?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          last_generated_at?: string | null
          next_due?: string
          template_description?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          default_app_role: Database["public"]["Enums"]["app_role"]
          department: Database["public"]["Enums"]["app_department"]
          id: string
          name: string
          rank: Database["public"]["Enums"]["role_rank"]
          slug: string
        }
        Insert: {
          created_at?: string
          default_app_role: Database["public"]["Enums"]["app_role"]
          department: Database["public"]["Enums"]["app_department"]
          id?: string
          name: string
          rank: Database["public"]["Enums"]["role_rank"]
          slug: string
        }
        Update: {
          created_at?: string
          default_app_role?: Database["public"]["Enums"]["app_role"]
          department?: Database["public"]["Enums"]["app_department"]
          id?: string
          name?: string
          rank?: Database["public"]["Enums"]["role_rank"]
          slug?: string
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          created_at: string
          id: string
          month: number
          payout: number
          store_id: string
          stretch: number
          stretch_payout: number
          target: number
          unit_type_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          payout?: number
          store_id: string
          stretch?: number
          stretch_payout?: number
          target?: number
          unit_type_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          payout?: number
          store_id?: string
          stretch?: number
          stretch_payout?: number
          target?: number
          unit_type_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_unit_type_id_fkey"
            columns: ["unit_type_id"]
            isOneToOne: false
            referencedRelation: "unit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          actual_value: number | null
          assigned_by_user_id: string | null
          assigned_to_user_id: string
          created_at: string
          id: string
          metric: string
          notes: string | null
          period_end: string
          period_start: string
          store_id: string
          target_value: number
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          assigned_by_user_id?: string | null
          assigned_to_user_id: string
          created_at?: string
          id?: string
          metric: string
          notes?: string | null
          period_end: string
          period_start: string
          store_id: string
          target_value: number
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string
          created_at?: string
          id?: string
          metric?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          store_id?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["department"]
          description: string | null
          due_date: string | null
          id: string
          note_id: string | null
          priority: number
          project_id: string | null
          source: Database["public"]["Enums"]["task_source"]
          source_ref: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          due_date?: string | null
          id?: string
          note_id?: string | null
          priority?: number
          project_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          due_date?: string | null
          id?: string
          note_id?: string | null
          priority?: number
          project_id?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_log: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          lead_source_id: string | null
          notes: string | null
          salesperson_user_id: string | null
          store_id: string
          traffic_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          lead_source_id?: string | null
          notes?: string | null
          salesperson_user_id?: string | null
          store_id: string
          traffic_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          lead_source_id?: string | null
          notes?: string | null
          salesperson_user_id?: string | null
          store_id?: string
          traffic_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_log_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_types_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          active: boolean
          created_at: string
          department: Database["public"]["Enums"]["app_department"] | null
          email: string | null
          full_name: string | null
          id: string
          primary_store_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          role_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["app_department"] | null
          email?: string | null
          full_name?: string | null
          id: string
          primary_store_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["app_department"] | null
          email?: string | null
          full_name?: string | null
          id?: string
          primary_store_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_primary_store_id_fkey"
            columns: ["primary_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_grants: {
        Row: {
          granted_at: string
          granted_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_grants_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_store_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_user_can_edit_deal: {
        Args: { p_deal_id: string }
        Returns: boolean
      }
      current_user_can_manage_sales_config: {
        Args: { p_store_id: string }
        Returns: boolean
      }
      current_user_has_role_slug: { Args: { p_slug: string }; Returns: boolean }
      current_user_has_store_access: {
        Args: { p_store_id: string }
        Returns: boolean
      }
      current_user_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_department: "ops" | "sales" | "service" | "parts" | "fni" | "admin"
      app_role: "owner" | "gm" | "manager" | "employee"
      deal_status:
        | "pending_finance"
        | "pending_salesperson"
        | "complete"
        | "delivered"
      department:
        | "sales"
        | "service"
        | "parts"
        | "fni"
        | "h2_grow"
        | "personal"
        | "other"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      recurring_frequency:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "yearly"
      role_rank: "owner" | "manager" | "senior" | "employee"
      task_source:
        | "handwritten"
        | "calendar"
        | "manual"
        | "recurring"
        | "email"
        | "claude"
      task_status:
        | "inbox"
        | "today"
        | "this_week"
        | "waiting"
        | "done"
        | "archived"
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
      app_department: ["ops", "sales", "service", "parts", "fni", "admin"],
      app_role: ["owner", "gm", "manager", "employee"],
      deal_status: [
        "pending_finance",
        "pending_salesperson",
        "complete",
        "delivered",
      ],
      department: [
        "sales",
        "service",
        "parts",
        "fni",
        "h2_grow",
        "personal",
        "other",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      recurring_frequency: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ],
      role_rank: ["owner", "manager", "senior", "employee"],
      task_source: [
        "handwritten",
        "calendar",
        "manual",
        "recurring",
        "email",
        "claude",
      ],
      task_status: [
        "inbox",
        "today",
        "this_week",
        "waiting",
        "done",
        "archived",
      ],
    },
  },
} as const
