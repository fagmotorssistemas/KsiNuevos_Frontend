import type { Database } from '@/types/supabase'
import type { PermissionMap } from './types'

type BaseRole = Database['public']['Enums']['user_role_enum']

export type PermissionContext = {
  baseRole: BaseRole | string | null | undefined
  map: PermissionMap
  /** `roles.base_role` del catálogo RBAC (p. ej. admin_programacion). */
  catalogBaseRole?: string | null
}

export function createPermissionContext(
  baseRole: PermissionContext['baseRole'],
  map: PermissionMap,
  catalogBaseRole?: string | null
): PermissionContext {
  return {
    baseRole: baseRole ?? null,
    map,
    catalogBaseRole: catalogBaseRole ?? null,
  }
}
