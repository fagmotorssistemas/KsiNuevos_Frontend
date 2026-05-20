import type { PermissionMap } from './types'
import { MODULE_SUBMODULES, type ModuleSlug } from './catalog'
import type { PermissionContext } from './context'

export function isAppAdminRole(ctx: PermissionContext): boolean {
  return (ctx.baseRole ?? '').toString().toLowerCase().trim() === 'admin'
}

export function hasAccessMap(map: PermissionMap, submoduleSlug: string): boolean {
  return map[submoduleSlug]?.can_read === true
}

export function hasAnySubmoduleAccess(map: PermissionMap, slugs: readonly string[]): boolean {
  return slugs.some((s) => hasAccessMap(map, s))
}

export function canAccessModule(ctx: PermissionContext, moduleSlug: ModuleSlug): boolean {
  if (isAppAdminRole(ctx)) return true
  const slugs = MODULE_SUBMODULES[moduleSlug]
  if (!slugs?.length) return false
  return hasAnySubmoduleAccess(ctx.map, slugs)
}

export function canAccessSubmodule(ctx: PermissionContext, submoduleSlug: string): boolean {
  if (isAppAdminRole(ctx)) return true
  return hasAccessMap(ctx.map, submoduleSlug)
}
