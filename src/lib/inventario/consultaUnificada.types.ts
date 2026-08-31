export type UnifiedQueryKind = 'placa' | 'cedula' | 'ruc' | 'nombre'

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
  report?: UnifiedReadableReport | null
}

export type ReportOwner = {
  name: string
  cedula: string | null
  source: string
}

export type ReportCitation = {
  number: string
  date: string | null
  entity: string
  amount: string | null
  points: string | null
  motive: string
  status: string
  pending: boolean
  plate: string | null
  scope: 'vehicle' | 'owner'
  otherVehicle: boolean
}

export type UnifiedReadableReport = {
  title: string
  kind: UnifiedQueryKind
  vehicle: { label: string; value: string }[]
  owners: {
    conflict: boolean
    ecuador: ReportOwner | null
    consultas: ReportOwner | null
    note: string | null
  }
  debts: {
    sri: string
    pendingFinesCount: number
    pendingAmount: string
    totalCitations: number
  }
  ownerDebts: {
    pendingFinesCount: number
    pendingAmount: string
    totalCitations: number
  }
  pendingCitations: ReportCitation[]
  ownerPendingCitations: ReportCitation[]
  infractionHistory: { label: string; years: string[]; statuses: string[] }[]
  ownerInfractionHistory: { label: string; years: string[]; statuses: string[] }[]
  person: { label: string; value: string }[]
  activity: string | null
  judicial: {
    consulted: boolean
    total: number
    roleNote: string
    transit: number
    other: { id: string; action: string; date: string | null; status: string; role: string; plainAction: string }[]
    years: string
  }
  alerts: string[]
  sourcesNote: {
    title: string
    body: string
  } | null
  ksi: UnifiedKsiMatch[]
  manualReview: {
    required: boolean
    title: string
    steps: string[]
  } | null
  ai: {
    conclusions: string[]
    investigationSummary: string
    error: string | null
  } | null
}
