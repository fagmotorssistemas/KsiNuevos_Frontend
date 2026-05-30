/** Admin ve toda la bandeja; el resto solo solicitudes de su área/rol. */
export function isDevRequestsAdmin(role: string | null | undefined): boolean {
  return (role ?? '').toLowerCase().trim() === 'admin'
}

/** Roles que comparten la misma área operativa (requester_role en BD). */
const DEV_REQUEST_ROLE_GROUPS: Record<string, readonly string[]> = {
  marketing: ['marketing'],
  vendedor: ['vendedor'],
  finanzas: ['finanzas', 'contable'],
  contable: ['finanzas', 'contable'],
  taller: ['taller'],
  abogado: ['abogado', 'abogada'],
  abogada: ['abogado', 'abogada'],
}

const AREA_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  vendedor: 'Ventas',
  finanzas: 'Contabilidad / Finanzas',
  contable: 'Contabilidad / Finanzas',
  taller: 'Taller',
  abogado: 'Legal',
  abogada: 'Legal',
}

/** `null` = sin filtro (admin). Array vacío = sin acceso. */
export function getDevRequestRoleScope(role: string | null | undefined): string[] | null {
  if (isDevRequestsAdmin(role)) return null
  const key = (role ?? '').toLowerCase().trim()
  if (!key) return []
  const group = DEV_REQUEST_ROLE_GROUPS[key]
  if (group) return [...group]
  return [key]
}

export function getDevRequestAreaLabel(role: string | null | undefined): string {
  const key = (role ?? '').toLowerCase().trim()
  return AREA_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'tu área')
}
