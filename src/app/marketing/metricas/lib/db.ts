import type { SupabaseClient } from '@supabase/supabase-js'

/** Tablas/vistas no tipadas en `Database` — mantener RLS seguro en Supabase. */
export function metricsDb(supabase: SupabaseClient): any {
  return supabase
}
