export const GUION_PDF_COLORS = {
  accent: '#E30613',
  headerBg: '#0f172a',
  rowAlt: '#f1f5f9',
  border: '#cbd5e1',
  text: '#1e293b',
  muted: '#64748b',
  white: '#ffffff',
} as const

export type GuionTomaPdf = {
  numero: number
  tiempo?: string
  descripcionToma: string
  guion: string
  descripcionGuion?: string
}

export type GuionData = {
  vehiculo: string
  vendedor?: string
  fecha?: string
  tipoGuion?: string
  titulo?: string
  objetivo?: string
  logoUrl?: string
  tomas: GuionTomaPdf[]
}
