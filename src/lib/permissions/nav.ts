import {
  MODULE_SLUGS,
  PRIMARY_NAV_ITEMS,
  RBAC_SUBMODULE_DEFINITIONS,
  VENTAS_PATH_ACCESS,
  type PrimaryNavItem,
} from './catalog'
import { canAccessModule, canAccessSubmodule, isAppAdminRole } from './access'
import type { PermissionContext } from './context'
import { isAccountingModulePath } from './routeAccess'

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Indica si la ruta actual pertenece a un ítem del nav principal (p. ej. /showroom → Ventas). */
export function pathnameBelongsToPrimaryNavItem(pathname: string, item: PrimaryNavItem): boolean {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/'

  if (item.module === MODULE_SLUGS.ventas) {
    return VENTAS_PATH_ACCESS.some(({ prefix }) => pathMatchesPrefix(path, prefix))
  }
  if (item.module === MODULE_SLUGS.finanzas) {
    return isAccountingModulePath(path)
  }
  if (item.module === MODULE_SLUGS.taller) {
    return pathMatchesPrefix(path, '/taller')
  }
  if (item.module === MODULE_SLUGS.legal) {
    return pathMatchesPrefix(path, '/legal')
  }
  if (item.module === MODULE_SLUGS.marketing) {
    return pathMatchesPrefix(path, '/marketing')
  }
  if (item.module === MODULE_SLUGS.gps) {
    return pathMatchesPrefix(path, '/rastreadores')
  }
  if (item.module === MODULE_SLUGS.seguros) {
    return pathMatchesPrefix(path, '/seguros')
  }
  if (item.submodule === 'scraper-marketing') {
    return pathMatchesPrefix(path, '/scraper')
  }
  if (item.submodule === 'monitoreo-reportes') {
    return pathMatchesPrefix(path, '/report')
  }
  if (item.submodule === 'permisos-roles') {
    return pathMatchesPrefix(path, '/admin/permisos')
  }

  const href = item.href.replace(/\/$/, '') || '/'
  return path === href || path.startsWith(`${href}/`)
}

export function resolveActivePrimaryNavItem(
  pathname: string,
  ctx: PermissionContext
): PrimaryNavItem | null {
  for (const item of buildPrimaryNavItems(ctx)) {
    if (pathnameBelongsToPrimaryNavItem(pathname, item)) return item
  }
  return null
}

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

/** Navbar superior: compactar cuando hay varios módulos visibles (p. ej. admin). */
export const PRIMARY_NAV_COMPACT_THRESHOLD = 5

export function shouldCompactPrimaryNav(itemCount: number): boolean {
  return itemCount >= PRIMARY_NAV_COMPACT_THRESHOLD
}

export function getPrimaryNavLinkSizeClasses(itemCount: number): string {
  if (itemCount >= PRIMARY_NAV_COMPACT_THRESHOLD) {
    return 'px-4 py-2 text-sm'
  }
  return 'px-4 py-2.5 text-sm'
}

/** Primera ruta de contabilidad con submódulo activo (orden del catálogo, no /wallet por defecto). */
export function resolveFirstAccountingHref(ctx: PermissionContext): string | null {
  const finanzasSubs = RBAC_SUBMODULE_DEFINITIONS.filter(
    (s) => s.moduleSlug === MODULE_SLUGS.finanzas
  ).sort((a, b) => a.sortOrder - b.sortOrder)

  for (const sub of finanzasSubs) {
    if (!canAccessSubmodule(ctx, sub.slug)) continue
    const prefix = sub.routePrefixes?.[0]
    if (prefix) return prefix
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

const STAFF_DASHBOARD_FALLBACK: Record<string, string> = {
  admin: '/leads',
  vendedor: '/leads',
  marketing: '/marketing',
  finanzas: '/wallet',
  contable: '/wallet',
  abogado: '/legal/cases',
  abogada: '/legal/cases',
  taller: '/taller/dashboard',
}

function resolveStaffRoleFallback(role: string, ctx: PermissionContext): string | null {
  const base = STAFF_DASHBOARD_FALLBACK[role]
  if (!base) return null
  if (role === 'finanzas' || role === 'contable') {
    return resolveFirstAccountingHref(ctx) ?? base
  }
  return base
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

  return resolveStaffRoleFallback(role, ctx) ?? '/home'
}

export function getUserDashboardMenuItem(ctx: PermissionContext): { href: string; label: string } {
  const role = (ctx.baseRole ?? '').toString().toLowerCase().trim()
  if (!role || role === 'cliente') {
    return { href: '/perfil', label: 'Mis Citas' }
  }
  return { href: resolveDefaultDashboardHref(ctx), label: 'Dashboard' }
}
