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
   * Índice del clip cuyo audio completo va como voz en off (audio-only).
   * Gemini arma solo la secuencia narrativa sin este clip.
   */
  voiceOverBaseClipIndex?: number | null
  /**
<<<<<<< HEAD
   * Índices de los clips que van como B-roll VISUAL encima de la voz en off (sin audio),
   * en el orden que el usuario eligió. Si está definido, se usa emplanado lineal en ese orden.
   * Estos clips se excluyen de la secuencia narrativa de Gemini.
   */
  voiceOverOverlayClipIndices?: number[]
=======
   * Opcional con `voiceOverBaseClipIndex`: índices de clips que van encima de la VO (solo vídeo, audio al 0%).
   * Orden = orden de apilado en timeline. Si se omite o queda vacío, se usan clips `visual_only` + emplanado semántico.
   */
  voiceOverOverlayClipIndices?: number[] | null
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
}

export function isPipelineInputMeta(x: unknown): x is VideoJobV2PipelineInputMeta {
  if (typeof x !== 'object' || x === null || !('_v2_pipeline_input' in x)) return false
  const o = x as VideoJobV2PipelineInputMeta
  if (o._v2_pipeline_input !== true) return false
  return (
    Array.isArray(o.clipKinds) ||
    Array.isArray(o.clipDurationsSec) ||
    typeof o.voiceOverBaseClipIndex === 'number' ||
<<<<<<< HEAD
    Array.isArray(o.voiceOverOverlayClipIndices)
=======
    (Array.isArray(o.voiceOverOverlayClipIndices) && o.voiceOverOverlayClipIndices.length > 0)
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
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

<<<<<<< HEAD
/**
 * Valida y normaliza la lista de índices de clips que van como B-roll visual encima del VO.
 * Elimina duplicados, fuera de rango y el índice del clip VO si está repetido.
 */
export function normalizeVoiceOverOverlayClipIndices(
  raw: unknown,
  clipCount: number,
  voiceOverBaseClipIndex?: number
): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const seen = new Set<number>()
  const out: number[] = []
  for (const x of raw) {
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isInteger(n) || n < 0 || n >= clipCount) continue
    if (n === voiceOverBaseClipIndex) continue
=======
/** Índices únicos válidos, sin el clip base de VO; conserva el orden enviado. */
export function normalizeVoiceOverOverlayClipIndices(
  raw: unknown,
  clipCount: number,
  voBaseIndex: number
): number[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: number[] = []
  const seen = new Set<number>()
  for (const x of raw) {
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isInteger(n) || n < 0 || n >= clipCount) continue
    if (n === voBaseIndex) continue
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
<<<<<<< HEAD
  return out.length > 0 ? out : undefined
=======
  return out
>>>>>>> dba973794c298690ae51e150ba94f3cc10ae6c8c
}
