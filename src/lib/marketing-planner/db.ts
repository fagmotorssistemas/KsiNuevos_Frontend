import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Acceso a tablas del planificador mientras no estén en types/supabase.ts generado.
 */
export function plannerFrom(supabase: SupabaseClient, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table)
}
