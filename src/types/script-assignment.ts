export type ScriptAssignmentStatus =
  | 'pendiente_keywords'
  | 'keywords_recibidos'
  | 'guion_generado'
  | 'descartado'
  | string

export type ScriptAssignmentRow = {
  assignment_id: string
  vendedor_id: string
  vendedor_nombre: string
  guion_tipo: string | null
  vehicle_id: string
  vehicle_marca: string
  vehicle_modelo: string
  vehicle_año: number | null
  palabras_clave: string[]
  status: ScriptAssignmentStatus
  palabras_clave_at: string | null
}

export type AssignmentsByDateResponse = {
  fecha: string
  total: number
  pendiente_keywords: number
  keywords_recibidos: number
  guion_generado: number
  assignments: ScriptAssignmentRow[]
}

export type MonthOverviewItem = {
  fecha: string
  assignment_id: string
  vehicle_label: string
  guion_generado: boolean
  status: string
}

export type MonthOverviewResponse = {
  mes: string
  items: MonthOverviewItem[]
}

export type GeneratedScriptApi = {
  id: string
  guion_tipo?: string | null
  objecion_tipo?: string | null
  status?: string | null
  palabras_count?: number | null
  guion_titulo?: string | null
  guion_objetivo?: string | null
  texto_hablado?: string | null
  guion_escenas?: unknown
  texto_guion?: string | null
  vehicle?: Record<string, unknown>
}

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  pendiente_keywords: 'Pendiente',
  keywords_recibidos: 'Keywords listas',
  guion_generado: 'Guión generado',
  descartado: 'Descartado',
}

export function getAssignmentVehicleLabel(a: ScriptAssignmentRow): string {
  const label = `${a.vehicle_marca} ${a.vehicle_modelo} ${a.vehicle_año ?? ''}`.trim()
  return label || a.vehicle_id
}

export function parseKeywordsInput(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean)
}
