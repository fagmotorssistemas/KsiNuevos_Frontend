export type PermissionAction = 'read' | 'write' | 'delete'

export type SubmodulePermission = {
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

/** slug de submódulo → flags efectivos (OR entre roles asignados) */
export type PermissionMap = Record<string, SubmodulePermission>

export type EffectivePermissionRow = {
  submodule_slug: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}
