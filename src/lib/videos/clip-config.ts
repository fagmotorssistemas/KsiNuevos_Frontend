/** spoken = con habla (AssemblyAI). visual_only = planos sin habla; solo como vídeo encima del audio de otro clip. */
export type VideoClipKind = 'spoken' | 'visual_only'

/** Máximo de clips en un job multi-clip (subida + transcripción en paralelo). */
export const VIDEO_MAX_CLIPS = 50

/** Vehículo canónico (inventario o captura manual) para contexto en prompts y alineación. */
export interface CanonicalVehicleMeta {
  brand: string
  model: string
  year: string
}

/** Metadatos guardados en selected_clips al iniciar el job (antes del análisis Gemini). */
export interface VideoJobPipelineInputMeta {
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
   * Índices de clips que van como B-roll visual encima de la VO (solo vídeo, audio al 0% en ese bloque).
   * Orden = orden en timeline. Si se omite o queda vacío, el pipeline usa clips `visual_only` + emplanado semántico.
   */
  voiceOverOverlayClipIndices?: number[] | null
  /**
   * Ruta de audio VO: `reel-vo/{jobId}/voice_over.*` en bucket música (subida POST …/voice-over-audio),
   * o legacy `{jobId}/…` en raw-videos. Exclusivo con `voiceOverBaseClipIndex`.
   */
  voiceOverAudioPath?: string | null
  /** Duración en segundos del audio VO (idealmente medida en el navegador al elegir el archivo). */
  voiceOverMp3DurationSec?: number | null
  /** Inicio manual del track musical (segundos desde el comienzo del archivo). */
  musicTrimStartSec?: number | null
  /**
   * Emergencia: hasta 3 índices de clip en orden; el pipeline fuerza el primer segmento hablado de cada uno
   * al inicio del montaje (marca / modelo / año), luego sigue el resto de la automatización.
   */
  manualIntroClipIndices?: number[] | null
  /**
   * Orden manual de clips en el Reel (permutación de índices elegibles: no VO ni planos reservados sobre VO).
   * El pipeline reagrupa los cortes de Gemini en ese orden; el resto (cortes, subtítulos, música) sigue igual.
   */
  manualClipOrderIndices?: number[] | null
  /**
   * Con `manualClipOrderIndices`: incluye obligatoriamente un corte por cada clip del orden y no aplica
   * el recorte automático por duración (~35 s). Útil cuando el reel debe usar todos los clips ordenados.
   */
  forceAllManualOrderClips?: boolean | null
  /** Marca, modelo y año exactos del inventario (o captura manual) para contexto en Gemini. */
  canonicalVehicle?: CanonicalVehicleMeta | null
  /** ID inventario (`inventoryoracle.id`) para detectar `video_scripts` del mismo vehículo. */
  vehicleId?: string | null
  /** Volúmenes de mezcla medidos en el navegador (ffmpeg.wasm) antes del pipeline. */
  reelMusicVolume?: number | null
  reelDialogueVolume?: number | null
}

export function isPipelineInputMeta(x: unknown): x is VideoJobPipelineInputMeta {
  if (typeof x !== 'object' || x === null || !('_v2_pipeline_input' in x)) return false
  const o = x as VideoJobPipelineInputMeta
  if (o._v2_pipeline_input !== true) return false
  const hasVehicle =
    o.canonicalVehicle != null &&
    typeof o.canonicalVehicle === 'object' &&
    [o.canonicalVehicle.brand, o.canonicalVehicle.model, o.canonicalVehicle.year].some(
      (s) => typeof s === 'string' && s.trim().length > 0
    )
  return (
    Array.isArray(o.clipKinds) ||
    Array.isArray(o.clipDurationsSec) ||
    typeof o.voiceOverBaseClipIndex === 'number' ||
    (Array.isArray(o.voiceOverOverlayClipIndices) && o.voiceOverOverlayClipIndices.length > 0) ||
    (typeof o.voiceOverAudioPath === 'string' && o.voiceOverAudioPath.trim().length > 0) ||
    (typeof o.musicTrimStartSec === 'number' && Number.isFinite(o.musicTrimStartSec) && o.musicTrimStartSec >= 0) ||
    (Array.isArray(o.manualIntroClipIndices) && o.manualIntroClipIndices.length > 0) ||
    (Array.isArray(o.manualClipOrderIndices) && o.manualClipOrderIndices.length > 0) ||
    o.forceAllManualOrderClips === true ||
    hasVehicle ||
    (typeof o.vehicleId === 'string' && o.vehicleId.trim().length > 0) ||
    normalizeReelAudioVolume(o.reelMusicVolume) != null ||
    normalizeReelAudioVolume(o.reelDialogueVolume) != null
  )
}

/** Volumen Shotstack 0..1 guardado en metadatos del job. */
export function normalizeReelAudioVolume(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) return undefined
  return Number(n.toFixed(3))
}

/** Inicio manual de música en segundos (>=0), con tope de seguridad para payloads inválidos. */
export function normalizeMusicTrimStartSec(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Number(Math.min(n, 60 * 60 * 2).toFixed(3))
}

export function defaultClipKinds(count: number): VideoClipKind[] {
  return Array.from({ length: count }, () => 'spoken' as const)
}

export function normalizeClipKindsInput(raw: unknown, clipCount: number): VideoClipKind[] {
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
export function normalizeVoiceOverBaseClipIndex(raw: unknown, clipCount: number): number | undefined {
  if (raw === null || raw === undefined) return undefined
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(n) || n < 0 || n >= clipCount) return undefined
  return n
}

/**
 * Valida y normaliza índices de clips que van como B-roll visual encima del VO.
 * Elimina duplicados, fuera de rango y el índice del clip VO.
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
    if (typeof voiceOverBaseClipIndex === 'number' && n === voiceOverBaseClipIndex) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out.length > 0 ? out : undefined
}

/** Índices de clips visuales encima de la VO desde archivo MP3 (sin clip base de VO). */
export function normalizeVoiceOverMp3OverlayIndices(raw: unknown, clipCount: number): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const seen = new Set<number>()
  const out: number[] = []
  for (const x of raw) {
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isInteger(n) || n < 0 || n >= clipCount) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out.length > 0 ? out : undefined
}

/**
 * Hasta 3 clips distintos en orden, para intro fija manual. Excluye índice de VO y clips reservados como overlay.
 */
export function normalizeManualIntroClipIndices(
  raw: unknown,
  clipCount: number,
  voiceOverBaseClipIndex?: number,
  voiceOverOverlayClipIndices?: number[]
): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const blocked = new Set<number>()
  if (typeof voiceOverBaseClipIndex === 'number') blocked.add(voiceOverBaseClipIndex)
  for (const x of voiceOverOverlayClipIndices ?? []) {
    if (Number.isInteger(x) && x >= 0 && x < clipCount) blocked.add(x)
  }
  const out: number[] = []
  const seen = new Set<number>()
  for (const x of raw) {
    if (out.length >= 3) break
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isInteger(n) || n < 0 || n >= clipCount) continue
    if (blocked.has(n)) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out.length > 0 ? out : undefined
}

/**
 * Permutación exacta de todos los índices de clip que participan en el montaje narrativo (no bloqueados).
 */
export function normalizeManualClipOrderIndices(
  raw: unknown,
  clipCount: number,
  voiceOverBaseClipIndex?: number,
  voiceOverOverlayClipIndices?: number[]
): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const blocked = new Set<number>()
  if (typeof voiceOverBaseClipIndex === 'number') blocked.add(voiceOverBaseClipIndex)
  for (const x of voiceOverOverlayClipIndices ?? []) {
    if (Number.isInteger(x) && x >= 0 && x < clipCount) blocked.add(x)
  }
  const eligible: number[] = []
  for (let i = 0; i < clipCount; i++) {
    if (!blocked.has(i)) eligible.push(i)
  }
  if (eligible.length === 0) return undefined
  if (raw.length !== eligible.length) return undefined
  const seen = new Set<number>()
  for (const x of raw) {
    const n = typeof x === 'number' ? x : Number(x)
    if (!Number.isInteger(n) || n < 0 || n >= clipCount) return undefined
    if (blocked.has(n)) return undefined
    if (seen.has(n)) return undefined
    seen.add(n)
  }
  if (seen.size !== eligible.length) return undefined
  return raw.map((x) => (typeof x === 'number' ? x : Number(x))) as number[]
}

export function normalizeCanonicalVehicle(raw: unknown): CanonicalVehicleMeta | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const o = raw as Record<string, unknown>
  const brand = typeof o.brand === 'string' ? o.brand.trim() : ''
  const model = typeof o.model === 'string' ? o.model.trim() : ''
  const year = typeof o.year === 'string' ? o.year.trim() : ''
  if (!brand && !model && !year) return undefined
  return { brand, model, year }
}
