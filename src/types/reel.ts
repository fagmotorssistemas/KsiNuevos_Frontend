/**
 * Tipos del sistema nuevo de Reels (backend `auto.ksinuevos.com`, rutas `/reels/*`).
 * Tablas Supabase: `reel_format_assignments` y `reel_scripts` (independientes de
 * `video_scripts` / `script_vehicle_assignments`, que usa el módulo "Guiones").
 */

export type ReelFormato =
  | 'ficha_rapida'
  | 'pov_gancho'
  | 'duelo'
  | 'financiamiento'
  | 'detras_camaras'

export const REEL_FORMATOS: ReelFormato[] = [
  'ficha_rapida',
  'pov_gancho',
  'duelo',
  'financiamiento',
  'detras_camaras',
]

export const REEL_FORMATO_LABELS: Record<ReelFormato, string> = {
  ficha_rapida: 'Ficha Rápida',
  pov_gancho: 'POV / Gancho',
  duelo: 'Duelo',
  financiamiento: 'Financiamiento',
  detras_camaras: 'Detrás de Cámaras',
}

export function getReelFormatoLabel(formato: string): string {
  if (formato in REEL_FORMATO_LABELS) {
    return REEL_FORMATO_LABELS[formato as ReelFormato]
  }
  // Compat Guiones V2 / pilares (script.formato puede traer sistema)
  const pilarLabels: Record<string, string> = {
    pilar1: 'Video Autos / Pilar 1',
    pilar2: 'Video Humanizar Marca',
    pilar3: 'Video Educativo',
    pilar4: 'Video Entretenimiento',
  }
  return pilarLabels[formato] ?? formato
}

/** Ficha / Duelo / Financiamiento / Detrás: assignee técnico; label fijo "Marketing". */
export const REEL_FORMATOS_MARKETING: ReelFormato[] = [
  'ficha_rapida',
  'duelo',
  'financiamiento',
  'detras_camaras',
]

/** POV: personas reales (Vanessa, Felipe, Xavier). */
export const REEL_FORMATOS_CON_PERSONA: ReelFormato[] = ['pov_gancho']

export function isReelMarketingFormato(formato: string): boolean {
  return (REEL_FORMATOS_MARKETING as string[]).includes(formato)
}

/** Nombre visible del assignee.
 * Ficha/Duelo/Financiamiento/Detrás → "Marketing".
 * POV → solo Vanessa / Felipe / Xavier (la cámara es Marketing, no se muestra).
 */
export function getReelAssigneeLabel(row: {
  formato: string
  vendedor_nombre?: string | null
  vendedor_secundario_nombre?: string | null
}): string {
  if (isReelMarketingFormato(row.formato)) return 'Marketing'
  return row.vendedor_nombre?.trim() || 'Sin asignar'
}

export type ReelAssignmentStatus =
  | 'pendiente_generacion'
  | 'guion_generado'
  | 'descartado'
  | string

export const REEL_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  pendiente_generacion: 'Pendiente de generación',
  guion_generado: 'Guión generado',
  descartado: 'Descartado',
}

/**
 * Fila de `GET /reels/assignments?fecha=...`.
 * `vehicle_data`/`vehicle_data_2` traen el vehículo completo (marca, modelo,
 * año, precio, km, color...) para poder mostrarlo aunque el guion todavía
 * esté `pendiente_generacion` (antes solo venía el UUID en `vehicle_id`).
 */
export type ReelAssignmentRow = {
  assignment_id: string
  formato: ReelFormato
  variante: string | null
  vendedor_id: string
  vendedor_nombre: string
  vendedor_secundario_id: string | null
  vendedor_secundario_nombre: string | null
  vehicle_id: string
  vehicle_id_2: string | null
  vehicle_data?: ReelVehicleData | null
  vehicle_data_2?: ReelVehicleData | null
  status: ReelAssignmentStatus
}

export type ReelAssignmentsResponse = {
  fecha: string
  assignments: ReelAssignmentRow[]
}

/** `hablante`: VENDEDOR | VENDEDOR_2 | CAMARA | "" (corte sin diálogo) */
export type ReelHablante = 'VENDEDOR' | 'VENDEDOR_2' | 'CAMARA' | '' | string

export type ReelVehicleData = {
  marca?: string | null
  modelo?: string | null
  año?: number | null
  precio?: number | null
  mileage?: number | null
  color?: string | null
  img_main_url?: string | null
  [key: string]: unknown
}

export type ReelGuionEscena = {
  esc: number
  tiempo?: string
  hablante?: ReelHablante
  movimiento?: string
  accion?: string
  dialogo?: string
  texto_pantalla?: string
}

export const DEFAULT_REEL_GUION_COLUMNAS = [
  'esc',
  'tiempo',
  'hablante',
  'movimiento',
  'accion',
  'dialogo',
  'texto_pantalla',
]

/** Forma completa del guion — igual en `run`, `assignments/:id/generate` y `by-vendor`. */
export type ReelScript = {
  id: string
  /** No confirmado en la doc, pero `reel_scripts` tiene esta columna; útil para matchear contra un assignment. */
  assignment_id?: string | null
  formato: ReelFormato
  variante: string | null
  status: string
  palabras_count: number | null
  facebook_post_id: string | null
  vendedor_nombre: string | null
  vendedor_secundario_nombre: string | null
  vehicle: ReelVehicleData | null
  vehicle_2: ReelVehicleData | null
  titulo: string | null
  objetivo: string | null
  texto_hablado: string | null
  guion_escenas: ReelGuionEscena[]
  guion_columnas: string[] | null
  texto_guion: string | null
  fecha_generacion?: string | null
}

/** Encuentra, entre los guiones de un vendedor, el que corresponde a un assignment. */
export function findReelScriptForAssignment(
  scripts: ReelScript[],
  assignment: Pick<
    ReelAssignmentRow,
    'assignment_id' | 'formato' | 'variante' | 'vehicle_id' | 'vehicle_data'
  >
): ReelScript | null {
  const byAssignmentId = scripts.find((s) => s.assignment_id === assignment.assignment_id)
  if (byAssignmentId) return byAssignmentId

  const variante = (assignment.variante ?? '').trim().toLowerCase()
  const byFormatoVariante = scripts.filter(
    (s) =>
      s.formato === assignment.formato &&
      (s.variante ?? '').trim().toLowerCase() === variante
  )
  if (byFormatoVariante.length === 1) return byFormatoVariante[0]
  if (byFormatoVariante.length > 1) {
    const byVehicle = byFormatoVariante.find((s) => reelScriptMatchesVehicle(s, assignment))
    if (byVehicle) return byVehicle
  }

  const byVehicleOnly = scripts.find(
    (s) => s.formato === assignment.formato && reelScriptMatchesVehicle(s, assignment)
  )
  return byVehicleOnly ?? null
}

function reelScriptMatchesVehicle(
  script: ReelScript,
  assignment: Pick<ReelAssignmentRow, 'vehicle_id' | 'vehicle_data'>
): boolean {
  const v = script.vehicle
  if (!v) return false
  const scriptVehicleId =
    (typeof v.id === 'string' && v.id) ||
    (typeof v.inventory_vehicle_id === 'string' && v.inventory_vehicle_id) ||
    null
  if (scriptVehicleId && scriptVehicleId === assignment.vehicle_id) return true

  const aLabel = getReelVehicleLabel(assignment.vehicle_data).toLowerCase()
  const sLabel = getReelVehicleLabel(v).toLowerCase()
  if (!aLabel || !sLabel) return false
  return aLabel.includes(sLabel) || sLabel.includes(aLabel)
}

export function getReelVehicleLabel(v: ReelVehicleData | null | undefined): string {
  if (!v) return ''
  return `${v.marca ?? ''} ${v.modelo ?? ''} ${v.año ?? ''}`.trim()
}

/** Vehículo de una asignación: usa `vehicle_data` si vino poblado, si no cae al UUID. */
export function getReelAssignmentVehicleLabel(
  a: Pick<ReelAssignmentRow, 'vehicle_id' | 'vehicle_data'>
): string {
  return getReelVehicleLabel(a.vehicle_data) || a.vehicle_id
}

export function formatReelPrecio(v: ReelVehicleData | null | undefined): string | null {
  const precio = v?.precio
  if (precio == null || Number.isNaN(Number(precio))) return null
  try {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(precio))
  } catch {
    return `$${precio}`
  }
}

export function formatReelKilometraje(v: ReelVehicleData | null | undefined): string | null {
  const km = v?.mileage
  if (km == null || Number.isNaN(Number(km))) return null
  return `${new Intl.NumberFormat('es-EC').format(Number(km))} km`
}

/**
 * Resuelve el nombre a mostrar para un `hablante`.
 * - VENDEDOR → quien sale (Vanessa / Felipe / Xavier en POV)
 * - CAMARA / VENDEDOR_2 → Marketing (quien graba; ya no es otro vendedor)
 */
export function resolveHablanteLabel(
  hablante: ReelHablante | undefined,
  script: Pick<ReelScript, 'formato' | 'vendedor_nombre' | 'vendedor_secundario_nombre'>
): string | null {
  const h = (hablante ?? '').trim().toUpperCase()
  if (!h) return null
  if (h === 'VENDEDOR') return script.vendedor_nombre?.trim() || 'Vendedor'
  if (h === 'VENDEDOR_2' || h === 'CAMARA') {
    const sec = script.vendedor_secundario_nombre?.trim()
    if (sec && sec.toLowerCase() !== 'marketing') {
      // Datos viejos: si aún viene un vendedor, igual preferimos Marketing en POV.
      if (script.formato === 'pov_gancho' || script.formato === 'detras_camaras') {
        return 'Marketing'
      }
      return sec
    }
    return 'Marketing'
  }
  return h
}

export function getReelScriptTitle(script: Pick<ReelScript, 'titulo' | 'formato'>): string {
  return script.titulo?.trim() || getReelFormatoLabel(script.formato)
}
