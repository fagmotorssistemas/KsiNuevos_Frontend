import type { PermissionMap } from './types'
import { MODULE_SUBMODULES, type ModuleSlug } from './catalog'
import type { PermissionContext } from './context'

export const ADMIN_PROGRAMACION_ROLE = 'admin_programacion'

/** Rutas financieras sensibles: admin_programacion no entra, admin sí. */
export const ADMIN_PROGRAMACION_BLOCKED_PREFIXES = [
  '/wallet',
  '/cartera-manual',
  '/mensajes-cartera',
  '/employee',
  '/marcaciones',
  '/treasury',
  '/financing',
  '/cobros',
  '/pagos',
  '/admin/permisos',
] as const

const ADMIN_PROGRAMACION_BLOCKED_SUBMODULES = new Set([
  'cartera-clientes',
  'cartera-manual',
  'mensajes-cartera',
  'empleados-finanzas',
  'tesoreria',
  'movimientos-financiamiento',
  'cobros',
  'pagos',
  'permisos-roles',
])

function normalizeRole(value: string | null | undefined): string {
  return (value ?? '').toString().toLowerCase().trim()
}

export function isAdminProgramacionRole(ctx: PermissionContext): boolean {
  return (
    normalizeRole(ctx.catalogBaseRole) === ADMIN_PROGRAMACION_ROLE ||
    normalizeRole(ctx.baseRole) === ADMIN_PROGRAMACION_ROLE
  )
}

export function isPathBlockedForAdminProgramacion(
  pathname: string,
  ctx: PermissionContext
): boolean {
  if (!isAdminProgramacionRole(ctx)) return false
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/'
  return ADMIN_PROGRAMACION_BLOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}

export function isAppAdminRole(ctx: PermissionContext): boolean {
  return isAdminLikeRole(ctx.baseRole, ctx.catalogBaseRole)
}

/** Vista de admin en módulos operativos (Ventas, etc.), incluye admin_programacion. */
export function isAdminLikeRole(
  baseRole?: string | null,
  catalogBaseRole?: string | null
): boolean {
  const base = normalizeRole(baseRole)
  const catalog = normalizeRole(catalogBaseRole)
  return base === 'admin' || catalog === ADMIN_PROGRAMACION_ROLE || base === ADMIN_PROGRAMACION_ROLE
}

/** Admin del panel de permisos: excluye admin_programacion. */
export function isFullSystemAdmin(ctx: PermissionContext): boolean {
  return normalizeRole(ctx.baseRole) === 'admin' && !isAdminProgramacionRole(ctx)
}

export function hasAccessMap(map: PermissionMap, submoduleSlug: string): boolean {
  return map[submoduleSlug]?.can_read === true
}

export function hasAnyReadPermission(map: PermissionMap): boolean {
  return Object.values(map).some((p) => p?.can_read === true)
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
  if (isAdminProgramacionRole(ctx) && ADMIN_PROGRAMACION_BLOCKED_SUBMODULES.has(submoduleSlug)) {
    return false
  }
  if (isAppAdminRole(ctx)) return true
  return hasAccessMap(ctx.map, submoduleSlug)
}
