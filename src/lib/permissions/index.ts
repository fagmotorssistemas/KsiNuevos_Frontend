export type { PermissionAction, PermissionMap, EffectivePermissionRow, SubmodulePermission } from './types'
export { rowsToPermissionMap, hasPermissionMap, hasAnyRead } from './merge'
export {
  fetchEffectivePermissionRows,
  fetchPermissionMap,
  fetchPermissionMapWithTimeout,
  fetchCatalogBaseRole,
  isFullSystemAdminUser,
} from './fetch'
export type { PermissionContext } from './context'
export { createPermissionContext } from './context'
export { hasPermission } from './hasPermission'
export { isAppAdminRole } from './access'
export {
  hasAccessMap,
  hasAnySubmoduleAccess,
  canAccessModule,
  canAccessSubmodule,
  isAdminProgramacionRole,
  isPathBlockedForAdminProgramacion,
  isFullSystemAdmin,
  isAdminLikeRole,
  ADMIN_PROGRAMACION_BLOCKED_PREFIXES,
  ADMIN_PROGRAMACION_ROLE,
} from './access'
export {
  MODULE_SLUGS,
  MODULE_SUBMODULES,
  PRIMARY_NAV_ITEMS,
  VENTAS_PATH_ACCESS,
  ACCOUNTING_PATH_ACCESS,
  MARKETING_PATH_ACCESS,
  ADMIN_FIXED_ACCESS_LINES,
  getProtectedRoutePrefixes,
  findSubmoduleByRoutePrefix,
  RBAC_MODULE_DEFINITIONS,
  RBAC_SUBMODULE_DEFINITIONS,
  type ModuleSlug,
  type PrimaryNavItem,
  type RbacModuleDef,
  type RbacSubmoduleDef,
} from './catalog'
export { syncRbacCatalogToSupabase, type SyncRbacCatalogResult } from './syncCatalog'
export {
  buildPrimaryNavItems,
  shouldCompactPrimaryNav,
  getPrimaryNavLinkSizeClasses,
  PRIMARY_NAV_COMPACT_THRESHOLD,
  canSeePrimaryNavItem,
  resolveDefaultDashboardHref,
  resolveFirstAccountingHref,
  resolvePrimaryNavItemHref,
  resolveActivePrimaryNavItem,
  pathnameBelongsToPrimaryNavItem,
  getUserDashboardMenuItem,
} from './nav'
export {
  isLimitedAccountingFinanceNav,
  ventasRouteDenied,
  accountingRouteDenied,
  canSeeAccountingSidebarHref,
  isAccountingModulePath,
  canSeeVentasSidebarHref,
  marketingRouteDenied,
  canSeeMarketingSidebarHref,
  isMarketingModulePath,
  moduleRouteDenied,
  isTallerOnlyAccess,
  resolveAccessDeniedRedirect,
  isRouteAllowed,
} from './routeAccess'
