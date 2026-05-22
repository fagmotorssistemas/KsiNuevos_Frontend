import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/** Cliente tipado para tablas de solicitudes a desarrollo (hasta regenerar supabase.ts). */
export function devRequestsDb(supabase: SupabaseClient<Database>) {
  return supabase as SupabaseClient<Database & DevRequestsSchema>
}

type DevRequestsSchema = {
  public: {
    Tables: {
      marketing_dev_requests: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      marketing_dev_request_attachments: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
    }
  }
}
