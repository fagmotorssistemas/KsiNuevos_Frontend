import type { EffectivePermissionRow, PermissionMap } from './types'

export function rowsToPermissionMap(rows: EffectivePermissionRow[] | null | undefined): PermissionMap {
  const map: PermissionMap = {}
  if (!rows) return map
  for (const r of rows) {
    const on = r.can_read === true
    map[r.submodule_slug] = {
      can_read: on,
      can_write: on,
      can_delete: on,
    }
  }
  return map
}

/** @deprecated Usar hasAccessMap desde ./access */
export function hasPermissionMap(map: PermissionMap, submoduleSlug: string): boolean {
  return map[submoduleSlug]?.can_read === true
}

/** @deprecated Usar hasAnySubmoduleAccess desde ./access */
export function hasAnyRead(map: PermissionMap, slugs: string[]): boolean {
  return slugs.some((s) => hasPermissionMap(map, s))
}
