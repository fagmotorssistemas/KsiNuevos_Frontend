import type { SequenceItem } from './segmenter'

export type { VideoClipKind, VideoJobPipelineInputMeta } from './clip-config'
export { isPipelineInputMeta, normalizeClipDurationsInput, VIDEO_MAX_CLIPS } from './clip-config'

export type VideoJobStatus =
  | 'pending'
  | 'uploading'
  | 'transcribing'
  | 'analyzing'
  | 'rendering'
  | 'completed'
  | 'failed'

/** Flujo de publicación en redes (post-render, solo si status = completed). */
export type VideoSocialPublishStage =
  | 'generado'
  | 'aprobado'
  | 'programado'
  | 'publicado'
  | 'fallido'

export type PublishingQueueStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'cancelled'

export type PublishingPlatform = 'instagram' | 'facebook'

export type FlowType = 'single' | 'multiple'

// Formato anterior — se mantiene por compatibilidad con jobs viejos
export interface GeminiSingleAnalysis {
  trim_start: number
  trim_end: number
  trim_duration: number
  hook_text: string
  reason: string
}

export interface GeminiClip {
  clip_index: number
  clip_url: string
  trim_start: number
  trim_duration: number
  reason: string
}

export interface GeminiMultipleAnalysis {
  selected_clips: GeminiClip[]
  total_duration: number
  overall_reason: string
}

// Nuevo formato V2 de análisis basado en segmentos
export interface GeminiSegmentAnalysisResult {
  sequence: SequenceItem[]
  total_duration: number
  overall_strategy: string
  /** Modo VO manual: cortes narrativos antes del bloque de audio completo + B-roll. */
  voice_over_insert_after_count?: number
}

export type GeminiAnalysis =
  | GeminiSingleAnalysis
  | GeminiMultipleAnalysis
  | GeminiSegmentAnalysisResult

export interface VideoJobInventoryJoin {
  id: string
  brand: string
  model: string
  year: number
  plate?: string | null
}

export interface VideoJob {
  id: string
  job_name?: string | null
  inventory_vehicle_id?: string | null
  inventory_vehicle?: VideoJobInventoryJoin | null
  vehicle_line_1?: string | null
  vehicle_line_2?: string | null
  vehicle_line_4?: string | null
  created_at: string
  updated_at: string
  flow_type: FlowType
  raw_video_paths: string[]
  status: VideoJobStatus
  current_step: string | null
  progress_percentage: number
  error_message: string | null
  assemblyai_transcript_id: string | null
  srt_content: string | null
  gemini_analysis: GeminiAnalysis | null
  creatomate_render_id: string | null
  final_video_url: string | null
  final_video_duration: number | null
  /** Etapa de publicación social; null en jobs legacy se trata como generado si ya está completado. */
  social_publish_stage?: VideoSocialPublishStage | string | null
  music_track_url: string | null
  /** Ruta en Storage del PDF de guion opcional. */
  script_pdf_path?: string | null
  /** Texto extraído del PDF para Gemini (guía no estricta). */
  script_text?: string | null
  selected_clips: GeminiClip[] | null
  /** Mapa de segmentos (AssemblyAI + post-proceso); útil para re-render y depuración. */
  segment_map: unknown | null
  /** Subtítulos corregidos a mano; si existe, el re-render prioriza esto sobre AssemblyAI. */
  subtitle_blocks_override?: unknown | null
  adjusted_srt: string | null
}

export interface MusicTrack {
  id: string
  created_at: string
  name: string
  file_path: string
  public_url: string
  duration_seconds: number | null
  is_active: boolean
}

export interface CreatomateWebhookPayload {
  id: string
  status: 'succeeded' | 'failed' | 'planned' | 'rendering'
  url?: string
  snapshot_url?: string
  metadata?: string
  error_message?: string
  duration?: number
  file_size?: number
}

export interface PipelineContext {
  jobId: string
  flowType: FlowType
  rawVideoPaths: string[]
  musicTrackUrl: string
}
