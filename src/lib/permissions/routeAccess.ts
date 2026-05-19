import type { PermissionAction, PermissionMap } from './types'
import { hasAnyRead, hasPermissionMap } from './merge'
import { hasPermission, type PermissionContext } from './hasPermission'

/** Lectura en cualquier submódulo del taller */
const TALLER_READ_SLUGS = [
  'ordenes-trabajo',
  'clientes-taller',
  'inventario-taller',
  'proveedores',
  'gastos-pagos',
  'personal-taller',
] as const

const SEGUROS_APP_SLUGS = ['polizas', 'aseguradoras', 'brokers'] as const

const MARKETING_APP_SLUGS = [
  'publicaciones-sociales',
  'video-automation',
  'blog-posts',
  'metricas-campana',
  'plan-videos',
  'scraper-marketing',
] as const

const LEGAL_APP_SLUGS = ['casos', 'eventos-caso', 'tareas-caso', 'etapas-proceso'] as const

const GPS_APP_SLUGS = ['inventario-gps', 'ventas-rastreador', 'cuotas-rastreador', 'sims'] as const

/** Submódulos catalogados bajo módulo Admin (lectura en cualquiera = “herramientas admin”). */
const ADMIN_APP_READ_SLUGS = [
  'gestion-usuarios',
  'agentes-prompts-ia',
  'configuracion',
  'permisos-roles',
  'plantillas-documentos',
  'monitoreo-reportes',
  'auditoria-modulos',
  'incidentes-soporte',
  'backup-exportacion',
  'api-webhooks',
] as const

/** Rutas de contabilidad (layout accounting) → submódulo mínimo para GET */
const ACCOUNTING_PATH_PERM: { prefix: string; slug: string; action: PermissionAction }[] = [
  { prefix: '/dashboard', slug: 'dashboard-finanzas', action: 'read' },
  { prefix: '/wallet', slug: 'cartera-clientes', action: 'read' },
  { prefix: '/cartera-manual', slug: 'cartera-manual', action: 'read' },
  { prefix: '/employee', slug: 'empleados-finanzas', action: 'read' },
  { prefix: '/treasury', slug: 'tesoreria', action: 'read' },
  { prefix: '/salesreport', slug: 'reporte-ventas', action: 'read' },
  { prefix: '/financing', slug: 'movimientos-financiamiento', action: 'read' },
  { prefix: '/cobros', slug: 'cobros', action: 'read' },
  { prefix: '/pagos', slug: 'pagos', action: 'read' },
  { prefix: '/notasdeventas', slug: 'notas-de-ventas', action: 'read' },
  { prefix: '/inventario', slug: 'inventario-finanzas', action: 'read' },
  { prefix: '/contracts', slug: 'contratos-pb', action: 'read' },
  { prefix: '/comprobantes', slug: 'comprobantes', action: 'read' },
  { prefix: '/insurance', slug: 'seguros-cartera', action: 'read' },
  { prefix: '/billing', slug: 'billing-finanzas', action: 'read' },
]

function firstMatchingPrefix<T extends { prefix: string }>(pathname: string, rules: T[]): T | undefined {
  const sorted = [...rules].sort((a, b) => b.prefix.length - a.prefix.length)
  return sorted.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
}

function normalizedBaseRole(ctx: PermissionContext): string {
  return (ctx.baseRole ?? '').toString().toLowerCase().trim()
}

/** `profiles.role === 'admin'`: acceso fijo (nav admin + middleware), sin depender del mapa RBAC. */
export function isAppAdminRole(ctx: PermissionContext): boolean {
  return normalizedBaseRole(ctx) === 'admin'
}

export function mayAccessTallerRoutes(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  const r = normalizedBaseRole(ctx)
  if (r === 'taller' || r === 'contable') return true
  return hasAnyRead(ctx.map, [...TALLER_READ_SLUGS])
}

export function mayAccessSegurosAppRoutes(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  if (normalizedBaseRole(ctx) === 'contable') return true
  return hasAnyRead(ctx.map, [...SEGUROS_APP_SLUGS])
}

export function mayAccessMarketingRoutes(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  const r = normalizedBaseRole(ctx)
  if (r === 'marketing' || r === 'contable') return true
  return hasAnyRead(ctx.map, [...MARKETING_APP_SLUGS])
}

export function mayAccessLegalRoutes(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  const r = normalizedBaseRole(ctx)
  if (r === 'abogado' || r === 'abogada' || r === 'finanzas') return true
  return hasAnyRead(ctx.map, [...LEGAL_APP_SLUGS])
}

export function mayAccessGpsRoutes(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  return hasAnyRead(ctx.map, [...GPS_APP_SLUGS])
}

export function mayAccessAdminAppRoutes(ctx: PermissionContext): boolean {
  if (isAppAdminRole(ctx)) return true
  return hasAnyRead(ctx.map, [...ADMIN_APP_READ_SLUGS])
}

export function mayAccessAdminTemplates(ctx: PermissionContext): boolean {
  return hasPermission(ctx, 'plantillas-documentos', 'read')
}

/** Usuario con notas pero sin cartera → menú / flujo “limitado” (reemplaza lista de UUIDs en env). */
export function isLimitedAccountingFinanceNav(map: PermissionMap): boolean {
  return (
    hasPermissionMap(map, 'notas-de-ventas', 'read') &&
    !hasPermissionMap(map, 'cartera-clientes', 'read')
  )
}

/**
 * Si la ruta está mapeada a un submódulo de contabilidad y no hay permiso, devuelve slug faltante.
 * `admin` no llega aquí si se acorta antes en middleware.
 */
export function accountingRouteDenied(
  pathname: string,
  ctx: PermissionContext
): { slug: string; action: PermissionAction } | null {
  const rule = firstMatchingPrefix(pathname, ACCOUNTING_PATH_PERM)
  if (!rule) return null
  if (hasPermission(ctx, rule.slug, rule.action)) return null
  return { slug: rule.slug, action: rule.action }
}

/** Menú lateral contable: solo ítems con permiso de lectura en la ruta. */
export function canSeeAccountingSidebarHref(href: string, ctx: PermissionContext): boolean {
  const rule = firstMatchingPrefix(href, ACCOUNTING_PATH_PERM)
  if (!rule) return true
  return hasPermission(ctx, rule.slug, rule.action)
}
