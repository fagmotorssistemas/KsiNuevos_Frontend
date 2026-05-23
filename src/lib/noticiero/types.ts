import type { VideoSocialPublishStage } from '@/lib/videos/types'

/** Vehículo de inventoryoracle usado en el noticiero */
export interface NoticieroVehicle {
  id: string
  brand: string
  model: string
  year: number | string | null
  color: string
  version: string
  price: number | string | null
  transmission: string
  fuel_type: string
  engine_displacement: string
  drive_type: string
  passenger_capacity: number | string | null
  type_body: string
  horse_power?: number | string | null
  mileage?: number | string | null
  img_main_url?: string | null
}

export type NoticieroMode = 'vehicle' | 'custom'

export type NoticieroJobStatus =
  | 'pending'
  | 'script'
  | 'avatar'
  | 'compositing'
  | 'completed'
  | 'failed'

export type NoticieroSocialPublishStage = VideoSocialPublishStage

export interface NoticieroJob {
  id: string
  created_at: string
  updated_at: string
  created_by: string | null
  job_name: string | null
  status: NoticieroJobStatus
  current_step: string | null
  progress_percentage: number
  error_message: string | null
  mode: NoticieroMode
  vehicle_id: string | null
  custom_topic: string | null
  vehicle_snapshot: NoticieroVehicle | null
  script_text: string | null
  banner_title: string | null
  heygen_background_url: string | null
  heygen_avatar_id: string | null
  heygen_voice_id: string | null
  heygen_video_id: string | null
  heygen_video_url: string | null
  creatomate_render_id: string | null
  final_video_url: string | null
  social_publish_stage: NoticieroSocialPublishStage | string | null
}

export interface StartPipelineRequest {
  mode: NoticieroMode
  vehicle?: NoticieroVehicle
  customTopic?: string
  bannerTitle?: string
  backgroundUrl?: string | null
  avatarId?: string
  voiceId?: string
}

export type GenerateScriptMode = NoticieroMode | 'creative_auto'

export interface GenerateScriptRequest {
  mode: GenerateScriptMode
  vehicle?: NoticieroVehicle
  customTopic?: string
  /** Si el usuario editó el titular en la UI, se respeta al generar el guión. */
  bannerTitle?: string
}

export interface GenerateBannerTitleRequest {
  mode: 'vehicle' | 'custom' | 'manual'
  vehicle?: NoticieroVehicle
  customTopic?: string
  bannerTitle?: string
  /** vehicle: true = Gemini, false = limpieza local rápida */
  useAi?: boolean
}

export interface GenerateScriptResponse {
  script: string
  bannerTitle: string
}

export interface GenerateAvatarRequest {
  script: string
  /** URL pública de imagen en bucket noticiero-fondos; null/omitido = fondo blanco */
  backgroundUrl?: string | null
  avatarId?: string
  voiceId?: string
}

export interface GenerateAvatarResponse {
  videoId: string
  videoUrl: string
}

export interface GenerateVideoRequest {
  jobId?: string
  heygenVideoUrl: string
  mode: NoticieroMode
  vehicle?: NoticieroVehicle
  customTopic?: string
}

export interface GenerateVideoResponse {
  videoUrl: string
  bannerTitle: string
  renderId: string
}

export type NoticieroPipelineStep =
  | 'idle'
  | 'script'
  | 'avatar'
  | 'video'
  | 'done'
  | 'error'

// ─── HeyGen ─────────────────────────────────────────────────────────────────

export interface HeyGenGenerateBody {
  video_inputs: Array<{
    character: {
      type: 'avatar'
      avatar_id: string
      avatar_style: string
    }
    voice: {
      type: 'text'
      voice_id: string
      input_text: string
    }
    background:
      | { type: 'color'; value: string }
      | { type: 'image'; url: string }
  }>
  dimension: { width: number; height: number }
}

export interface HeyGenGenerateResponse {
  data?: { video_id?: string }
  video_id?: string
  error?: string | null
}

export interface HeyGenStatusData {
  status?: string
  video_url?: string
  error?: string | { message?: string; detail?: string; code?: number } | null
}

export interface HeyGenStatusResponse {
  code?: number
  message?: string
  data?: HeyGenStatusData
  status?: string
  video_url?: string
}

// ─── Creatomate v1 (plantilla) ───────────────────────────────────────────────

export interface CreatomateV1RenderRequest {
  template_id: string
  modifications: Record<string, string>
}

export interface CreatomateV1RenderResponse {
  id: string
  status: string
  url?: string
  error_message?: string
}

export type NoticieroPublishingQueueStatus =
  | 'pending'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled'

export type NoticieroPublishingPlatform = 'instagram' | 'facebook'

// ─── Publicación automática ─────────────────────────────────────────────────

export type NoticieroVehicleOrder =
  | 'price_desc'
  | 'price_asc'
  | 'newest'
  | 'is_featured'
  | 'mileage_desc'
  | 'mileage_asc'

export type NoticieroCreativeMode = 'predefined' | 'gemini_auto' | 'both'

export type NoticieroDayContentType = 'vehicle' | 'creative'

export type NoticieroHistoryStatus = 'pending' | 'completed' | 'error'

export interface NoticieroConfig {
  id: string
  publish_days: string[]
  publish_time: string
  vehicle_order: NoticieroVehicleOrder
  creative_mode: NoticieroCreativeMode
  creative_topics: string[]
  avatar_rotation: string[]
  day_type_config: Record<string, NoticieroDayContentType>
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
}

export interface NoticieroHistory {
  id: string
  published_at: string
  day_of_week: string
  content_type: string
  avatar_id: string
  vehicle_id: string | null
  creative_topic: string | null
  generated_script: string
  heygen_video_url: string | null
  final_video_url: string | null
  instagram_post_id: string | null
  facebook_post_id: string | null
  status: NoticieroHistoryStatus
  error_message: string | null
  inventoryoracle?: {
    brand: string
    model: string
    year: number | string | null
  } | null
}

export interface NoticieroConfigUpdatePayload {
  publish_days: string[]
  publish_time: string
  vehicle_order: NoticieroVehicleOrder
  creative_mode: NoticieroCreativeMode
  creative_topics: string[]
  avatar_rotation: string[]
  day_type_config: Record<string, NoticieroDayContentType>
  is_active: boolean
}

export interface AutoPublishResult {
  skipped?: boolean
  reason?: string
  historyId?: string
  contentType?: string
  avatarId?: string
  script?: string
  heygenVideoUrl?: string
  finalVideoUrl?: string
  instagramPostId?: string | null
  facebookPostId?: string | null
  status?: NoticieroHistoryStatus
  error?: string
}
