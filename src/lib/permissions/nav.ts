import {
  ACCOUNTING_PATH_ACCESS,
  MODULE_SLUGS,
  PRIMARY_NAV_ITEMS,
  type PrimaryNavItem,
} from './catalog'
import { canAccessModule, canAccessSubmodule, isAppAdminRole } from './access'
import type { PermissionContext } from './context'

export function canSeePrimaryNavItem(ctx: PermissionContext, item: PrimaryNavItem): boolean {
  if (isAppAdminRole(ctx)) return true
  if (item.module) return canAccessModule(ctx, item.module)
  if (item.submodule) return canAccessSubmodule(ctx, item.submodule)
  return false
}

export function buildPrimaryNavItems(ctx: PermissionContext): PrimaryNavItem[] {
  if (isAppAdminRole(ctx)) return [...PRIMARY_NAV_ITEMS]
  return PRIMARY_NAV_ITEMS.filter((item) => canSeePrimaryNavItem(ctx, item))
}

/** Primera ruta de contabilidad con submódulo activo (no asumir /wallet). */
export function resolveFirstAccountingHref(ctx: PermissionContext): string | null {
  for (const { prefix, submodule } of ACCOUNTING_PATH_ACCESS) {
    if (canAccessSubmodule(ctx, submodule)) return prefix
  }
  return null
}

/** Destino al abrir un ítem del nav principal (p. ej. Contabilidad → primera ruta permitida). */
export function resolvePrimaryNavItemHref(item: PrimaryNavItem, ctx: PermissionContext): string | null {
  if (!canSeePrimaryNavItem(ctx, item)) return null
  if (item.module === MODULE_SLUGS.finanzas) {
    return resolveFirstAccountingHref(ctx) ?? item.href
  }
  return item.href
}

/** Login / enlace Dashboard: primer módulo habilitado en el orden del nav. */
export function resolveDefaultDashboardHref(ctx: PermissionContext): string {
  const role = (ctx.baseRole ?? '').toString().toLowerCase().trim()

  if (role === 'cliente') return '/perfil'
  if (isAppAdminRole(ctx)) return '/leads'

  for (const item of PRIMARY_NAV_ITEMS) {
    if (item.submodule === 'permisos-roles' && !isAppAdminRole(ctx)) continue
    const href = resolvePrimaryNavItemHref(item, ctx)
    if (href) return href
  }

  if (role === 'taller') return '/taller/dashboard'
  if (role) return '/home'
  return '/home'
}

export function getUserDashboardMenuItem(ctx: PermissionContext): { href: string; label: string } {
  const role = (ctx.baseRole ?? '').toString().toLowerCase().trim()
  if (!role || role === 'cliente') {
    return { href: '/perfil', label: 'Mis Citas' }
  }
  return { href: resolveDefaultDashboardHref(ctx), label: 'Dashboard' }
}
