/**
 * Entradas compartidas del render de Reels (pipeline.ts → shotstack.ts):
 * bloque de voz en off y overlays de marca.
 */

import type { VoBrollTile } from './vo-broll-semantics'

/** Índice reservado: la VO no sale de ningún clip de vídeo (audio externo MP3/WAV). */
export const VOICE_OVER_EXTERNAL_CLIP_INDEX = -1

/** Bloque VO manual: audio completo + B-roll mute + negro; `timelineStartSec` = posición en el Reel. */
export interface VoiceOverIntroRenderInput {
  /** Con `VOICE_OVER_EXTERNAL_CLIP_INDEX`, el audio sale de `externalVoiceAudioUrl` / `voiceOverAudioPath`. */
  voClipIndex: number
  voDurationSec: number
  /** Índices de clips para capas sobre la VO (`visual_only` automático, o lista manual en orden de timeline). */
  brollClipIndicesInFileOrder: number[]
  /** Duración de cada archivo (misma longitud que clipUrls). */
  clipFileDurationsSec: (number | null)[]
  /** Cuántos segmentos narrativos van antes de este bloque (lo decide Claude). */
  insertAfterSegmentCount: number
  /** Opcional; en render se recalcula desde `sequence` + `insertAfterSegmentCount`. */
  timelineStartSec?: number
  /** Si existe, sustituye el emplanado lineal por ventanas alineadas a la VO (semántica). */
  voBrollTiles?: VoBrollTile[]
  /** URL firmada del archivo de audio de VO. */
  externalVoiceAudioUrl?: string
  /**
   * Ruta en Storage del audio VO; el pipeline refresca `externalVoiceAudioUrl` antes de cada render.
   */
  voiceOverAudioPath?: string
  /** Recorte inicial del archivo VO externo para saltar silencio al inicio. */
  externalVoiceTrimStartSec?: number
}

// ─── Brand overlays ───────────────────────────────────────────────────────────

export type BrandConfig = {
  show_brand_overlays: boolean
  vehicle_line_1?: string
  vehicle_line_2?: string
  vehicle_line_3?: string
  vehicle_line_4?: string
  cta_text?: string
  whatsapp_number?: string
  logo_url?: string
  show_watermark?: boolean
}

export type BrandConfigJobRow = {
  show_brand_overlays?: boolean | null
  vehicle_line_1?: string | null
  vehicle_line_2?: string | null
  vehicle_line_3?: string | null
  vehicle_line_4?: string | null
  cta_text?: string | null
  whatsapp_number?: string | null
  logo_url?: string | null
  show_watermark?: boolean | null
}

export function brandConfigFromJobRow(job: BrandConfigJobRow): BrandConfig | null {
  if (!job.show_brand_overlays) return null
  return {
    show_brand_overlays: true,
    vehicle_line_1: job.vehicle_line_1?.trim() || undefined,
    vehicle_line_2: job.vehicle_line_2?.trim() || undefined,
    vehicle_line_3: job.vehicle_line_3?.trim() || undefined,
    vehicle_line_4: job.vehicle_line_4?.trim() || undefined,
    cta_text: job.cta_text?.trim() || undefined,
    whatsapp_number: job.whatsapp_number?.trim() || undefined,
    logo_url: job.logo_url?.trim() || undefined,
    show_watermark: job.show_watermark ?? undefined,
  }
}
