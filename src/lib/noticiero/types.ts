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

export interface GenerateScriptRequest {
  mode: NoticieroMode
  vehicle?: NoticieroVehicle
  customTopic?: string
}

export interface GenerateScriptResponse {
  script: string
  bannerTitle: string
}

export interface GenerateAvatarRequest {
  script: string
}

export interface GenerateAvatarResponse {
  videoId: string
  videoUrl: string
}

export interface GenerateVideoRequest {
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
    background: {
      type: 'color'
      value: string
    }
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
  error?: string | null
}

export interface HeyGenStatusResponse {
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

export type NoticieroPipelineStep =
  | 'idle'
  | 'script'
  | 'avatar'
  | 'video'
  | 'social'
  | 'done'
  | 'error'

export interface NoticieroPipelineState {
  step: NoticieroPipelineStep
  script: string | null
  bannerTitle: string | null
  heygenVideoUrl: string | null
  finalVideoUrl: string | null
  error: string | null
  instagramResult: { mediaId: string; containerId: string } | null
  facebookResult: { postId: string } | null
  socialError: string | null
}
