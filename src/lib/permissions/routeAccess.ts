import type { PermissionMap } from './types'
import {
  ACCOUNTING_PATH_ACCESS,
  MODULE_SLUGS,
  VENTAS_PATH_ACCESS,
} from './catalog'
import { canAccessModule, canAccessSubmodule, hasAccessMap, hasAnyReadPermission } from './access'
import type { PermissionContext } from './context'
import { isAppAdminRole } from './access'
import { resolveDefaultDashboardHref } from './nav'

function firstMatchingPrefix<T extends { prefix: string }>(
  pathname: string,
  rules: T[]
): T | undefined {
  const sorted = [...rules].sort((a, b) => b.prefix.length - a.prefix.length)
  return sorted.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
}

/** Usuario con notas pero sin cartera → flujo contable limitado */
export function isLimitedAccountingFinanceNav(map: PermissionMap): boolean {
  return hasAccessMap(map, 'notas-de-ventas') && !hasAccessMap(map, 'cartera-clientes')
}

export function ventasRouteDenied(pathname: string, ctx: PermissionContext): string | null {
  if (isAppAdminRole(ctx)) return null
  const rule = firstMatchingPrefix(pathname, VENTAS_PATH_ACCESS)
  if (!rule) return null
  if (canAccessSubmodule(ctx, rule.submodule)) return null
  return rule.submodule
}

export function accountingRouteDenied(pathname: string, ctx: PermissionContext): string | null {
  if (isAppAdminRole(ctx)) return null
  const rule = firstMatchingPrefix(pathname, ACCOUNTING_PATH_ACCESS)
  if (!rule) return null
  if (canAccessSubmodule(ctx, rule.submodule)) return null
  return rule.submodule
}

export function canSeeAccountingSidebarHref(href: string, ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  const rule = firstMatchingPrefix(href, ACCOUNTING_PATH_ACCESS)
  if (!rule) return true
  return canAccessSubmodule(ctx, rule.submodule)
}

export function isAccountingModulePath(pathname: string): boolean {
  return ACCOUNTING_PATH_ACCESS.some(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function canSeeVentasSidebarHref(href: string, ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  const rule = firstMatchingPrefix(href, VENTAS_PATH_ACCESS)
  if (!rule) return true
  return canAccessSubmodule(ctx, rule.submodule)
}

/** Bloqueo de ruta por módulo del nav (taller, legal, marketing, gps, seguros, admin tools) */
export function moduleRouteDenied(pathname: string, ctx: PermissionContext): string | null {
  if (isAppAdminRole(ctx)) return null

  if (pathname === '/taller' || pathname.startsWith('/taller/')) {
    return canAccessModule(ctx, MODULE_SLUGS.taller) ? null : MODULE_SLUGS.taller
  }
  if (pathname === '/legal' || pathname.startsWith('/legal/')) {
    return canAccessModule(ctx, MODULE_SLUGS.legal) ? null : MODULE_SLUGS.legal
  }
  if (pathname === '/marketing/planificador' || pathname.startsWith('/marketing/planificador/')) {
    if (!canAccessModule(ctx, MODULE_SLUGS.marketing)) return MODULE_SLUGS.marketing
    const role = (ctx.baseRole ?? '').toString().toLowerCase().trim()
    if (role === 'contable') return 'planificador'
    return null
  }
  if (pathname === '/marketing' || pathname.startsWith('/marketing/')) {
    return canAccessModule(ctx, MODULE_SLUGS.marketing) ? null : MODULE_SLUGS.marketing
  }
  if (pathname === '/scraper' || pathname.startsWith('/scraper/')) {
    return canAccessSubmodule(ctx, 'scraper-marketing') ? null : 'scraper-marketing'
  }
  if (pathname === '/report' || pathname.startsWith('/report/')) {
    return canAccessSubmodule(ctx, 'monitoreo-reportes') ? null : 'monitoreo-reportes'
  }
  if (pathname === '/seguros' || pathname.startsWith('/seguros/')) {
    return canAccessModule(ctx, MODULE_SLUGS.seguros) ? null : MODULE_SLUGS.seguros
  }
  if (pathname === '/rastreadores' || pathname.startsWith('/rastreadores/')) {
    return canAccessModule(ctx, MODULE_SLUGS.gps) ? null : MODULE_SLUGS.gps
  }
  if (pathname === '/admin/permisos' || pathname.startsWith('/admin/permisos/')) {
    return isAppAdminRole(ctx) ? null : 'permisos-roles'
  }

  return null
}

/** Solo acceso a taller (sin otros módulos de empresa en nav) */
export function isTallerOnlyAccess(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return false
  return (
    canAccessModule(ctx, MODULE_SLUGS.taller) &&
    !canAccessModule(ctx, MODULE_SLUGS.ventas) &&
    !canAccessModule(ctx, MODULE_SLUGS.finanzas) &&
    !canAccessModule(ctx, MODULE_SLUGS.marketing)
  )
}

export function resolveAccessDeniedRedirect(
  _pathname: string,
  ctx: PermissionContext
): string {
  return resolveDefaultDashboardHref(ctx)
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Si el rol staff no tiene ningún permiso activo en BD, permitir rutas del módulo según enum (evita bucle a /home). */
function staffEnumPathAllowed(pathname: string, ctx: PermissionContext): boolean {
  if (hasAnyReadPermission(ctx.map)) return false
  const role = (ctx.baseRole ?? '').toString().toLowerCase().trim()
  if (!role || role === 'cliente' || isAppAdminRole(ctx)) return false

  if (role === 'finanzas' || role === 'contable') {
    if (ACCOUNTING_PATH_ACCESS.some(({ prefix }) => pathMatchesPrefix(pathname, prefix))) {
      return true
    }
    if (role === 'contable' && pathMatchesPrefix(pathname, '/rastreadores')) return true
    if (
      role === 'finanzas' &&
      (pathMatchesPrefix(pathname, '/legal') ||
        pathMatchesPrefix(pathname, '/rastreadores') ||
        pathMatchesPrefix(pathname, '/seguros'))
    ) {
      return true
    }
    return false
  }
  if (role === 'vendedor') {
    return VENTAS_PATH_ACCESS.some(({ prefix }) => pathMatchesPrefix(pathname, prefix))
  }
  if (role === 'marketing') {
    if (pathMatchesPrefix(pathname, '/marketing/planificador')) return true
    return pathMatchesPrefix(pathname, '/marketing')
  }
  if (role === 'contable' && pathMatchesPrefix(pathname, '/marketing/planificador')) {
    return false
  }
  if (role === 'abogado' || role === 'abogada') return pathMatchesPrefix(pathname, '/legal')
  if (role === 'taller') return pathMatchesPrefix(pathname, '/taller')
  return false
}

export function isRouteAllowed(pathname: string, ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  if (staffEnumPathAllowed(pathname, ctx)) return true

  if (isTallerOnlyAccess(ctx)) {
    const onTaller = pathname === '/taller' || pathname.startsWith('/taller/')
    if (!onTaller) return false
  }

  const checks = [
    ventasRouteDenied(pathname, ctx),
    accountingRouteDenied(pathname, ctx),
    moduleRouteDenied(pathname, ctx),
  ]

  return checks.every((d) => d === null)
}
