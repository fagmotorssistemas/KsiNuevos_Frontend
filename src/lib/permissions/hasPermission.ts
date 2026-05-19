import type { Database } from '@/types/supabase'
import type { PermissionAction, PermissionMap } from './types'
import { hasPermissionMap } from './merge'

type BaseRole = Database['public']['Enums']['user_role_enum']

export type PermissionContext = {
  /** Rol base del enum en `profiles.role` */
  baseRole: BaseRole | string | null | undefined
  /** Resultado de `get_my_effective_permissions` ya fusionado */
  map: PermissionMap
}

/**
 * Comprueba permiso granular. `admin` (enum) siempre true.
 * Uso: componentes cliente, guards y middleware (pasar el mismo `PermissionContext`).
 */
export function hasPermission(
  ctx: PermissionContext,
  submoduleSlug: string,
  action: PermissionAction
): boolean {
  const r = (ctx.baseRole ?? '').toString().toLowerCase().trim()
  if (r === 'admin') return true
  return hasPermissionMap(ctx.map, submoduleSlug, action)
}
