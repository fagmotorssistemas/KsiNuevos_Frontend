/**
 * Tipos del sistema Pilares (backend `auto.ksinuevos.com`, rutas `/pilares/*`).
 * Sustituye el flujo de formatos Reel (ficha/pov/duelo) en Guiones V2.
 */

export type PilarSistema = 'pilar1' | 'pilar2' | 'pilar3' | 'pilar4'

export const PILAR_SISTEMAS: PilarSistema[] = ['pilar1', 'pilar2', 'pilar3', 'pilar4']

/** Labels marketing alineados al cronograma semanal (imagen). */
export const PILAR_LABELS: Record<PilarSistema, string> = {
  pilar1: 'Video Autos / Pilar 1',
  pilar2: 'Video Humanizar Marca',
  pilar3: 'Video Educativo',
  pilar4: 'Video Entretenimiento',
}

export const PILAR_SHORT_LABELS: Record<PilarSistema, string> = {
  pilar1: 'AUTOS',
  pilar2: 'HUMANIZAR',
  pilar3: 'EDUCATIVO',
  pilar4: 'ENTRETEN.',
}

export function isPilarSistema(x: string): x is PilarSistema {
  return (PILAR_SISTEMAS as string[]).includes(x)
}

export function getPilarLabel(sistema: string): string {
  return PILAR_LABELS[sistema as PilarSistema] ?? sistema
}

export type PilarAssignmentStatus =
  | 'pendiente_generacion'
  | 'guion_generado'
  | 'descartado'
  | string

export type PilarVehicleData = {
  id?: string
  marca?: string | null
  modelo?: string | null
  año?: number | null
  precio?: number | null
  mileage?: number | null
  color?: string | null
  img_main_url?: string | null
  [key: string]: unknown
}

export type PilarHookPreview = {
  slot_mes?: number
  slot_del_dia?: number
  es_repeticion?: boolean
  hook_categoria: string
  hook_variacion?: number
  hook_texto: string
  momento?: string
}

/** Fila unificada (cualquier pilar) para la UI. */
export type PilarAssignmentRow = {
  assignment_id: string
  sistema: PilarSistema
  status: PilarAssignmentStatus
  hook_categoria: string | null
  hook_variacion: number | null
  hook_texto: string | null
  momento?: string | null
  slot_del_dia?: number | null
  vendedor_id: string | null
  vendedor_nombre: string | null
  vehicle_id: string | null
  vehicle_data?: PilarVehicleData | null
}

export type PilarPlanDelDia = {
  weekday: number
  esperado: number
  asignados: number
  slots?: Array<{
    slot_del_dia: number
    asignado: boolean
    assignment: unknown | null
  }>
  pilar2_dia?: boolean
  pilar3_dia?: boolean
  pilar4_dia?: boolean
  hook_preview?: PilarHookPreview | null
  hooks_preview?: PilarHookPreview[] | null
}

export type PilarBucket = {
  fecha: string
  assignments: unknown[]
  plan_del_dia: PilarPlanDelDia
}

export type PilarAssignmentsResponse = {
  fecha: string
  pilares: Partial<Record<PilarSistema, PilarBucket>>
}

export type PilarGuionEscena = {
  esc: number
  tiempo?: string
  hablante?: string
  movimiento?: string
  accion?: string
  dialogo?: string
  texto_pantalla?: string
}

export type PilarScript = {
  id: string
  assignment_id?: string | null
  sistema: PilarSistema
  hook_categoria: string | null
  hook_variacion?: number | null
  hook_texto: string | null
  momento?: string | null
  status: string
  palabras_count: number | null
  facebook_post_id: string | null
  vendedor_id?: string | null
  vendedor_nombre: string | null
  vehicle_id?: string | null
  vehicle: PilarVehicleData | null
  titulo: string | null
  objetivo: string | null
  texto_hablado: string | null
  guion_escenas: PilarGuionEscena[]
  guion_columnas?: string[] | null
  texto_guion: string | null
  fecha_generacion?: string | null
}

export function getPilarVehicleLabel(v: PilarVehicleData | null | undefined): string {
  if (!v) return ''
  return `${v.marca ?? ''} ${v.modelo ?? ''} ${v.año ?? ''}`.trim()
}

export function getPilarAssignmentTitle(a: PilarAssignmentRow): string {
  const hook = a.hook_texto?.trim()
  if (hook) return hook
  const veh = getPilarVehicleLabel(a.vehicle_data)
  if (veh) return veh
  return getPilarLabel(a.sistema)
}

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null
}

function str(x: unknown): string | null {
  if (typeof x === 'string') return x
  if (typeof x === 'number') return String(x)
  return null
}

/** Normaliza un assignment crudo del backend a fila UI. */
export function normalizePilarAssignment(
  sistema: PilarSistema,
  raw: unknown
): PilarAssignmentRow | null {
  const o = asRecord(raw)
  if (!o) return null
  const id = str(o.assignment_id) || str(o.id)
  if (!id) return null

  const vehicleRaw = asRecord(o.vehicle_data) ?? asRecord(o.vehicle)
  return {
    assignment_id: id,
    sistema,
    status: str(o.status) || 'pendiente_generacion',
    hook_categoria: str(o.hook_categoria),
    hook_variacion:
      typeof o.hook_variacion === 'number'
        ? o.hook_variacion
        : o.hook_variacion != null
          ? Number(o.hook_variacion)
          : null,
    hook_texto: str(o.hook_texto),
    momento: str(o.momento),
    slot_del_dia:
      typeof o.slot_del_dia === 'number'
        ? o.slot_del_dia
        : o.slot_del_dia != null
          ? Number(o.slot_del_dia)
          : null,
    vendedor_id: str(o.vendedor_id),
    vendedor_nombre: str(o.vendedor_nombre),
    vehicle_id: str(o.vehicle_id),
    vehicle_data: vehicleRaw as PilarVehicleData | null,
  }
}

export function flattenPilarAssignments(
  res: PilarAssignmentsResponse
): PilarAssignmentRow[] {
  const out: PilarAssignmentRow[] = []
  for (const sistema of PILAR_SISTEMAS) {
    const bucket = res.pilares?.[sistema]
    if (!bucket) continue
    for (const raw of bucket.assignments ?? []) {
      const row = normalizePilarAssignment(sistema, raw)
      if (row) out.push(row)
    }
    // También toma assignments anidados en slots (por si el array top viene vacío)
    for (const slot of bucket.plan_del_dia?.slots ?? []) {
      if (!slot.assignment) continue
      const row = normalizePilarAssignment(sistema, slot.assignment)
      if (row && !out.some((x) => x.assignment_id === row.assignment_id)) {
        out.push(row)
      }
    }
  }
  return out
}

export function normalizePilarScript(raw: unknown, fallbackSistema?: PilarSistema): PilarScript | null {
  const o = asRecord(raw)
  if (!o) return null
  const id = str(o.id)
  if (!id) return null
  const sistemaRaw = str(o.sistema) || fallbackSistema
  if (!sistemaRaw || !isPilarSistema(sistemaRaw)) return null

  const vehicle =
    (asRecord(o.vehicle) as PilarVehicleData | null) ??
    (asRecord(o.vehicle_data) as PilarVehicleData | null)

  const escenas = Array.isArray(o.guion_escenas) ? (o.guion_escenas as PilarGuionEscena[]) : []
  const statusRaw = str(o.status) || 'generado'

  return {
    id,
    assignment_id: str(o.assignment_id),
    sistema: sistemaRaw,
    hook_categoria: str(o.hook_categoria),
    hook_variacion: typeof o.hook_variacion === 'number' ? o.hook_variacion : null,
    hook_texto: str(o.hook_texto),
    momento: str(o.momento),
    status: statusRaw,
    palabras_count: typeof o.palabras_count === 'number' ? o.palabras_count : null,
    facebook_post_id: str(o.facebook_post_id),
    vendedor_id: str(o.vendedor_id),
    vendedor_nombre: str(o.vendedor_nombre) || str(o.responsable) || 'Marketing',
    vehicle_id: str(o.vehicle_id),
    vehicle,
    titulo: str(o.titulo),
    objetivo: str(o.objetivo),
    texto_hablado: str(o.texto_hablado),
    guion_escenas: escenas,
    guion_columnas: Array.isArray(o.guion_columnas) ? (o.guion_columnas as string[]) : null,
    texto_guion: str(o.texto_guion),
    fecha_generacion: str(o.fecha_generacion),
  }
}

/** Adapta un script de pilar al shape que usan PDF / detalle legacy de reels. */
export function pilarScriptToReelCompat(script: PilarScript) {
  return {
    id: script.id,
    assignment_id: script.assignment_id,
    formato: script.sistema as unknown as import('@/types/reel').ReelFormato,
    variante: script.hook_categoria,
    status: script.status,
    palabras_count: script.palabras_count,
    facebook_post_id: script.facebook_post_id,
    vendedor_nombre: script.vendedor_nombre,
    vendedor_secundario_nombre: null,
    vehicle: script.vehicle,
    vehicle_2: null,
    titulo: script.titulo || script.hook_texto,
    objetivo: script.objetivo,
    texto_hablado: script.texto_hablado,
    guion_escenas: script.guion_escenas,
    guion_columnas: script.guion_columnas,
    texto_guion: script.texto_guion,
    fecha_generacion: script.fecha_generacion,
  }
}

export function isPilarGuionListo(status: string | null | undefined): boolean {
  const v = (status ?? '').toLowerCase()
  return v === 'guion_generado' || v === 'generado'
}

export function findPilarScriptForAssignment(
  scripts: PilarScript[],
  assignment: PilarAssignmentRow
): PilarScript | null {
  const byId = scripts.find((s) => s.assignment_id === assignment.assignment_id)
  if (byId) return byId
  return (
    scripts.find(
      (s) =>
        s.sistema === assignment.sistema &&
        (s.hook_texto ?? '') === (assignment.hook_texto ?? '')
    ) ?? null
  )
}
