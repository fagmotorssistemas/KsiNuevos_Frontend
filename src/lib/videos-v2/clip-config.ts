/** spoken = con habla (AssemblyAI). visual_only = planos sin habla; solo como vídeo encima del audio de otro clip. */
export type VideoClipKind = 'spoken' | 'visual_only'

/** Máximo de clips en un job multi-clip (subida + transcripción en paralelo). */
export const VIDEO_V2_MAX_CLIPS = 50

/** Metadatos guardados en selected_clips al iniciar el job (antes del análisis Gemini). */
export interface VideoJobV2PipelineInputMeta {
  _v2_pipeline_input: true
  /** Si se omitió, el pipeline clasifica cada clip solo con AssemblyAI. */
  clipKinds?: VideoClipKind[]
  /** Duración en segundos por índice de clip (desde el navegador). */
  clipDurationsSec?: (number | null)[]
  /**
   * Índice del clip cuyo audio completo abre el Reel (voz en off manual).
   * Los planos mute encima son solo clips `visual_only` (Assembly sin habla), en orden; el hueco restante va en negro.
   * Gemini arma solo el tramo posterior (sin este clip ni B-roll en el prompt).
   */
  voiceOverBaseClipIndex?: number | null
}

export function isPipelineInputMeta(x: unknown): x is VideoJobV2PipelineInputMeta {
  if (typeof x !== 'object' || x === null || !('_v2_pipeline_input' in x)) return false
  const o = x as VideoJobV2PipelineInputMeta
  if (o._v2_pipeline_input !== true) return false
  return (
    Array.isArray(o.clipKinds) ||
    Array.isArray(o.clipDurationsSec) ||
    typeof o.voiceOverBaseClipIndex === 'number'
  )
}

export function defaultClipKinds(count: number): VideoClipKind[] {
  return Array.from({ length: count }, () => 'spoken' as const)
}

export function normalizeClipKindsInput(
  raw: unknown,
  clipCount: number
): VideoClipKind[] {
  const base = defaultClipKinds(clipCount)
  if (!Array.isArray(raw) || raw.length !== clipCount) return base
  return raw.map((k) => (k === 'visual_only' ? 'visual_only' : 'spoken'))
}

/** Normaliza duraciones enviadas desde el cliente (misma longitud que clips). */
export function normalizeClipDurationsInput(
  raw: unknown,
  clipCount: number
): (number | null)[] | undefined {
  if (!Array.isArray(raw) || raw.length !== clipCount) return undefined
  return raw.map((x) => {
    if (x === null || x === undefined) return null
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isFinite(n) || n <= 0.05) return null
    return Number(n.toFixed(3))
  })
}

/** Índice de clip base voz en off (opcional). null/omitido = flujo automático con Gemini. */
export function normalizeVoiceOverBaseClipIndex(
  raw: unknown,
  clipCount: number
): number | undefined {
  if (raw === null || raw === undefined) return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(n) || n < 0 || n >= clipCount) return undefined
  return n
}
