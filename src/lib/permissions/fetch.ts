import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { EffectivePermissionRow } from './types'
import { rowsToPermissionMap } from './merge'
import type { PermissionMap } from './types'
import { ADMIN_PROGRAMACION_ROLE } from './access'

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

function unwrapCatalogBaseRole(roles: unknown): string | null {
  if (!roles) return null
  const row = Array.isArray(roles) ? roles[0] : roles
  if (row && typeof row === 'object' && 'base_role' in row) {
    const value = (row as { base_role?: string | null }).base_role
    return value ?? null
  }
  return null
}

/** Rol de catálogo (`roles.base_role`), p. ej. admin_programacion. */
export async function fetchCatalogBaseRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profile_roles')
    .select('roles(base_role)')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[permissions] fetchCatalogBaseRole', error)
    return null
  }

  return unwrapCatalogBaseRole((data as { roles?: unknown } | null)?.roles)
}

export async function isFullSystemAdminUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  profileRole: string | null | undefined
): Promise<boolean> {
  if ((profileRole ?? '').toString().toLowerCase().trim() !== 'admin') return false
  const catalog = await fetchCatalogBaseRole(supabase, userId)
  return (catalog ?? '').toString().toLowerCase().trim() !== ADMIN_PROGRAMACION_ROLE
}

const PERMISSION_FETCH_TIMEOUT_MS = 8_000

/** Evita bloquear login si el RPC tarda o no responde */
export async function fetchPermissionMapWithTimeout(
  supabase: SupabaseClient<Database>,
  timeoutMs = PERMISSION_FETCH_TIMEOUT_MS
): Promise<PermissionMap> {
  try {
    return await Promise.race([
      fetchPermissionMap(supabase),
      new Promise<PermissionMap>((resolve) => {
        setTimeout(() => resolve({}), timeoutMs)
      }),
    ])
  } catch (e) {
    console.error('[permissions] fetchPermissionMapWithTimeout', e)
    return {}
  }
}
