import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  createPermissionContext,
  fetchCatalogBaseRole,
  isFullSystemAdmin,
  isRouteAllowed,
  rowsToPermissionMap,
  type EffectivePermissionRow,
} from '@/lib/permissions'
import type { Database } from '@/types/supabase'

export const SATJE_ACTIVE_STATUSES = ['pendiente', 'en_proceso', 'esperando_captcha'] as const

export async function requireSatjeAccess(): Promise<
  | { supabase: SupabaseClient<Database>; user: User }
  | { response: NextResponse }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }

  const [{ data: profile }, catalogBaseRole, { data: permRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    fetchCatalogBaseRole(supabase, user.id),
    supabase.rpc('get_my_effective_permissions'),
  ])

  const ctx = createPermissionContext(profile?.role ?? null, rowsToPermissionMap((permRows ?? []) as EffectivePermissionRow[]), catalogBaseRole)
  if (!isFullSystemAdmin(ctx) && !isRouteAllowed('/inventario', ctx)) {
    return { response: NextResponse.json({ error: 'Sin permiso para consultar SATJE' }, { status: 403 }) }
  }

  return { supabase, user }
}
