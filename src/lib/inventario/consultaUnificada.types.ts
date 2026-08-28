export type UnifiedQueryKind = 'placa' | 'cedula' | 'ruc'

export type UnifiedFact = { label: string; value: string; origin?: string }

export type UnifiedRow = {
  title: string
  subtitle?: string | null
  facts: UnifiedFact[]
  rawJson?: string | null
}

export type UnifiedSection = {
  id: string
  title: string
  source: string
  status: 'ok' | 'empty' | 'error' | 'skipped'
  error: string | null
  summary: string | null
  facts: UnifiedFact[]
  rows: UnifiedRow[]
}

export type UnifiedKsiMatch = {
  placa: string
  brand: string
  model: string
  year: number | null
  ownerName: string | null
  idNumber: string | null
}

export type UnifiedConsultaResult = {
  query: string
  kind: UnifiedQueryKind
  queriedAt: string
  sourcesReady: { ecuador: boolean; consultas: boolean }
  identity: {
    placa: string | null
    cedula: string | null
    ruc: string | null
    nombre: string | null
  }
  ksi: UnifiedKsiMatch[]
  sections: UnifiedSection[]
}
