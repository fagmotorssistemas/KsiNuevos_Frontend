import type { EffectivePermissionRow, PermissionAction, PermissionMap } from './types'

export function rowsToPermissionMap(rows: EffectivePermissionRow[] | null | undefined): PermissionMap {
  const map: PermissionMap = {}
  if (!rows) return map
  for (const r of rows) {
    map[r.submodule_slug] = {
      can_read: r.can_read,
      can_write: r.can_write,
      can_delete: r.can_delete,
    }
  }
  return map
}

export function hasPermissionMap(
  map: PermissionMap,
  submoduleSlug: string,
  action: PermissionAction
): boolean {
  const p = map[submoduleSlug]
  if (!p) return false
  if (action === 'read') return p.can_read
  if (action === 'write') return p.can_write
  return p.can_delete
}

export function hasAnyRead(map: PermissionMap, slugs: string[]): boolean {
  return slugs.some((s) => hasPermissionMap(map, s, 'read'))
}
