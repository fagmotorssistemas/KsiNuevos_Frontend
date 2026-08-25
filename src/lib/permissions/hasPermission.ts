import { canAccessSubmodule, hasAccessMap, isAppAdminRole } from './access'
import type { PermissionContext } from './context'
import type { PermissionAction } from './types'

export type { PermissionContext } from './context'
export { isAppAdminRole } from './access'

export function hasPermission(
  ctx: PermissionContext,
  submoduleSlug: string,
  _action: PermissionAction = 'read'
): boolean {
  if (!canAccessSubmodule(ctx, submoduleSlug)) return false
  if (isAppAdminRole(ctx)) return true
  return hasAccessMap(ctx.map, submoduleSlug)
}
