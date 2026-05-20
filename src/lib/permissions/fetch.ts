import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { EffectivePermissionRow } from './types'
import { rowsToPermissionMap } from './merge'
import type { PermissionMap } from './types'

export async function fetchEffectivePermissionRows(
  supabase: SupabaseClient<Database>
): Promise<EffectivePermissionRow[]> {
  const { data, error } = await supabase.rpc('get_my_effective_permissions')
  if (error) {
    console.error('[permissions] get_my_effective_permissions', error)
    return []
  }
  return (data ?? []) as EffectivePermissionRow[]
}

export async function fetchPermissionMap(supabase: SupabaseClient<Database>): Promise<PermissionMap> {
  const rows = await fetchEffectivePermissionRows(supabase)
  return rowsToPermissionMap(rows)
}
