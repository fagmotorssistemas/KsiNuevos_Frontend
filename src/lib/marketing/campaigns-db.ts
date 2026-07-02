import type { SupabaseClient } from '@supabase/supabase-js'

/** Acceso a tablas del planificador de campañas (pendiente en types generados). */
export function campaignsFrom(supabase: SupabaseClient, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table)
}
