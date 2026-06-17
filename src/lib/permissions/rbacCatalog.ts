/**
 * Catálogo RBAC (fuente única).
 *
 * Al agregar una ruta nueva en la app:
 * 1. Añade o crea un submódulo aquí con `routePrefixes: ['/tu-ruta']`.
 * 2. Abre /admin/permisos (sincroniza solo) o pulsa Actualizar.
 * 3. El submódulo aparecerá en Permisos y en el middleware vía `getProtectedRoutePrefixes()`.
 */

export const MODULE_SLUGS = {
  ventas: 'ventas',
  taller: 'taller',
  finanzas: 'finanzas',
  gps: 'gps',
  legal: 'legal',
  seguros: 'seguros',
  marketing: 'marketing',
  admin: 'admin',
} as const

export type ModuleSlug = (typeof MODULE_SLUGS)[keyof typeof MODULE_SLUGS]

export type RbacModuleDef = {
  slug: ModuleSlug
  name: string
  sortOrder: number
}

export type RbacSubmoduleDef = {
  moduleSlug: ModuleSlug
  slug: string
  name: string
  sortOrder: number
  /** Prefijos de ruta Next.js asociados a este permiso */
  routePrefixes?: readonly string[]
}

export const RBAC_MODULE_DEFINITIONS: readonly RbacModuleDef[] = [
  { slug: 'ventas', name: 'Ventas', sortOrder: 10 },
  { slug: 'taller', name: 'Taller', sortOrder: 20 },
  { slug: 'finanzas', name: 'Finanzas', sortOrder: 30 },
  { slug: 'gps', name: 'GPS / Rastreadores', sortOrder: 40 },
  { slug: 'legal', name: 'Legal', sortOrder: 50 },
  { slug: 'seguros', name: 'Seguros', sortOrder: 60 },
  { slug: 'marketing', name: 'Marketing', sortOrder: 70 },
  { slug: 'admin', name: 'Admin', sortOrder: 80 },
]

/** Rutas protegidas a nivel módulo (sin submódulo por prefijo en catálogo) */
const MODULE_LEVEL_ROUTE_PREFIXES: readonly string[] = [
  '/taller',
  '/legal',
  '/marketing',
  '/scraper',
  '/report',
  '/seguros',
  '/rastreadores',
  '/admin',
  '/perfil',
]

/** Herramientas transversales: cualquier usuario staff autenticado (no cliente). */
export const GLOBAL_STAFF_ROUTE_PREFIXES: readonly string[] = ['/solicitudes-desarrollo']

export const RBAC_SUBMODULE_DEFINITIONS: readonly RbacSubmoduleDef[] = [
  // Ventas
  { moduleSlug: 'ventas', slug: 'leads-pipeline', name: 'Leads y pipeline', sortOrder: 1, routePrefixes: ['/leads'] },
  { moduleSlug: 'ventas', slug: 'inventario-vehiculos', name: 'Inventario de vehículos', sortOrder: 2, routePrefixes: ['/inventory'] },
  { moduleSlug: 'ventas', slug: 'proformas-credito', name: 'Proformas de crédito', sortOrder: 3, routePrefixes: ['/finance'] },
  { moduleSlug: 'ventas', slug: 'solicitudes-web', name: 'Solicitudes web', sortOrder: 4, routePrefixes: ['/requests'] },
  { moduleSlug: 'ventas', slug: 'visitas-showroom', name: 'Visitas showroom', sortOrder: 5, routePrefixes: ['/showroom', '/agenda'] },
  { moduleSlug: 'ventas', slug: 'tareas-ventas', name: 'Tareas', sortOrder: 6, routePrefixes: ['/tareas'] },
  // Taller (acceso por prefijo /taller en moduleRouteDenied; submódulos para permisos granulares)
  { moduleSlug: 'taller', slug: 'ordenes-trabajo', name: 'Órdenes de trabajo', sortOrder: 1 },
  { moduleSlug: 'taller', slug: 'clientes-taller', name: 'Clientes taller', sortOrder: 2 },
  { moduleSlug: 'taller', slug: 'inventario-taller', name: 'Inventario taller', sortOrder: 3 },
  { moduleSlug: 'taller', slug: 'proveedores', name: 'Proveedores', sortOrder: 4 },
  { moduleSlug: 'taller', slug: 'gastos-pagos', name: 'Gastos y pagos', sortOrder: 5 },
  { moduleSlug: 'taller', slug: 'personal-taller', name: 'Personal', sortOrder: 6 },
  // Finanzas
  { moduleSlug: 'finanzas', slug: 'cartera-clientes', name: 'Cartera de clientes', sortOrder: 1, routePrefixes: ['/wallet'] },
  { moduleSlug: 'finanzas', slug: 'cartera-manual', name: 'Cartera manual', sortOrder: 2, routePrefixes: ['/cartera-manual'] },
  { moduleSlug: 'finanzas', slug: 'cuotas-pb', name: 'Cuotas (PB)', sortOrder: 3 },
  { moduleSlug: 'finanzas', slug: 'contratos-pb', name: 'Contratos (PB)', sortOrder: 4, routePrefixes: ['/contracts'] },
  { moduleSlug: 'finanzas', slug: 'asesoria-financiamiento', name: 'Asesoría financiamiento', sortOrder: 5 },
  { moduleSlug: 'finanzas', slug: 'notas-de-ventas', name: 'Notas de ventas', sortOrder: 6, routePrefixes: ['/notasdeventas'] },
  { moduleSlug: 'finanzas', slug: 'dashboard-finanzas', name: 'Dashboard', sortOrder: 7, routePrefixes: ['/dashboard'] },
  { moduleSlug: 'finanzas', slug: 'empleados-finanzas', name: 'Personal', sortOrder: 8, routePrefixes: ['/employee'] },
  { moduleSlug: 'finanzas', slug: 'tesoreria', name: 'Tesorería', sortOrder: 9, routePrefixes: ['/treasury'] },
  { moduleSlug: 'finanzas', slug: 'reporte-ventas', name: 'Reporte de ventas', sortOrder: 10, routePrefixes: ['/salesreport'] },
  { moduleSlug: 'finanzas', slug: 'movimientos-financiamiento', name: 'Movimientos / financiamiento', sortOrder: 11, routePrefixes: ['/financing'] },
  { moduleSlug: 'finanzas', slug: 'cobros', name: 'Cobros', sortOrder: 12, routePrefixes: ['/cobros'] },
  { moduleSlug: 'finanzas', slug: 'pagos', name: 'Pagos', sortOrder: 13, routePrefixes: ['/pagos'] },
  { moduleSlug: 'finanzas', slug: 'inventario-finanzas', name: 'Inventario (contable)', sortOrder: 14, routePrefixes: ['/inventario'] },
  { moduleSlug: 'finanzas', slug: 'comprobantes', name: 'Comprobantes', sortOrder: 15, routePrefixes: ['/comprobantes'] },
  { moduleSlug: 'finanzas', slug: 'billing-finanzas', name: 'Facturación', sortOrder: 16, routePrefixes: ['/billing'] },
  { moduleSlug: 'finanzas', slug: 'seguros-cartera', name: 'Seguros (cartera)', sortOrder: 17, routePrefixes: ['/insurance'] },
  // GPS
  { moduleSlug: 'gps', slug: 'inventario-gps', name: 'Inventario GPS', sortOrder: 1 },
  { moduleSlug: 'gps', slug: 'ventas-rastreador', name: 'Ventas rastreador', sortOrder: 2 },
  { moduleSlug: 'gps', slug: 'cuotas-rastreador', name: 'Cuotas rastreador', sortOrder: 3 },
  { moduleSlug: 'gps', slug: 'sims', name: 'SIMs', sortOrder: 4 },
  // Legal
  { moduleSlug: 'legal', slug: 'casos', name: 'Casos', sortOrder: 1 },
  { moduleSlug: 'legal', slug: 'eventos-caso', name: 'Eventos de caso', sortOrder: 2 },
  { moduleSlug: 'legal', slug: 'tareas-caso', name: 'Tareas de caso', sortOrder: 3 },
  { moduleSlug: 'legal', slug: 'etapas-proceso', name: 'Etapas de proceso', sortOrder: 4 },
  // Seguros
  { moduleSlug: 'seguros', slug: 'polizas', name: 'Pólizas', sortOrder: 1 },
  { moduleSlug: 'seguros', slug: 'aseguradoras', name: 'Aseguradoras', sortOrder: 2 },
  { moduleSlug: 'seguros', slug: 'brokers', name: 'Brokers', sortOrder: 3 },
  // Marketing
  { moduleSlug: 'marketing', slug: 'publicaciones-sociales', name: 'Publicaciones sociales', sortOrder: 1, routePrefixes: ['/marketing/publicaciones'] },
  { moduleSlug: 'marketing', slug: 'video-automation', name: 'Video automation', sortOrder: 2, routePrefixes: ['/marketing/videos', '/marketing/biblioteca-clips'] },
  { moduleSlug: 'marketing', slug: 'blog-posts', name: 'Blog posts', sortOrder: 3, routePrefixes: ['/marketing/noticiero'] },
  { moduleSlug: 'marketing', slug: 'metricas-campana', name: 'Métricas de campaña', sortOrder: 4, routePrefixes: ['/marketing/metricas', '/marketing/inventariado-marketing'] },
  { moduleSlug: 'marketing', slug: 'plan-videos', name: 'Plan de videos', sortOrder: 5, routePrefixes: ['/marketing/guiones', '/marketing/planificador'] },
  { moduleSlug: 'marketing', slug: 'scraper-marketing', name: 'Scraper', sortOrder: 6 },
  // Admin — solo pantallas que existen hoy
  { moduleSlug: 'admin', slug: 'permisos-roles', name: 'Permisos y usuarios', sortOrder: 1, routePrefixes: ['/admin/permisos'] },
  { moduleSlug: 'admin', slug: 'monitoreo-reportes', name: 'Monitoreo y reportes', sortOrder: 2, routePrefixes: ['/report'] },
]

function buildModuleSubmodules(): Record<ModuleSlug, readonly string[]> {
  const acc = {} as Record<ModuleSlug, string[]>
  for (const mod of Object.values(MODULE_SLUGS)) {
    acc[mod] = []
  }
  for (const s of RBAC_SUBMODULE_DEFINITIONS) {
    acc[s.moduleSlug].push(s.slug)
  }
  return acc
}

function buildPathAccess(moduleSlug: ModuleSlug): { prefix: string; submodule: string }[] {
  const rows: { prefix: string; submodule: string }[] = []
  for (const s of RBAC_SUBMODULE_DEFINITIONS) {
    if (s.moduleSlug !== moduleSlug || !s.routePrefixes?.length) continue
    for (const prefix of s.routePrefixes) {
      rows.push({ prefix, submodule: s.slug })
    }
  }
  return rows.sort((a, b) => b.prefix.length - a.prefix.length)
}

export const MODULE_SUBMODULES = buildModuleSubmodules()

export const VENTAS_PATH_ACCESS = buildPathAccess('ventas')

export const ACCOUNTING_PATH_ACCESS = buildPathAccess('finanzas')

export const MARKETING_PATH_ACCESS = buildPathAccess('marketing')

/** Prefijos para middleware y documentación */
export function getProtectedRoutePrefixes(): string[] {
  const fromSubmodules = RBAC_SUBMODULE_DEFINITIONS.flatMap((s) => s.routePrefixes ?? [])
  return [...new Set([...fromSubmodules, ...MODULE_LEVEL_ROUTE_PREFIXES, ...GLOBAL_STAFF_ROUTE_PREFIXES])]
}

export function findSubmoduleByRoutePrefix(pathname: string): RbacSubmoduleDef | null {
  const sorted = [...RBAC_SUBMODULE_DEFINITIONS].sort((a, b) => {
    const maxA = Math.max(0, ...(a.routePrefixes?.map((p) => p.length) ?? [0]))
    const maxB = Math.max(0, ...(b.routePrefixes?.map((p) => p.length) ?? [0]))
    return maxB - maxA
  })
  for (const s of sorted) {
    if (!s.routePrefixes) continue
    for (const prefix of s.routePrefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return s
    }
  }
  return null
}
