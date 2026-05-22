import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { NoticieroJob, NoticieroJobStatus, NoticieroMode, NoticieroVehicle } from './types'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function createNoticieroJob(input: {
  jobName: string
  mode: NoticieroMode
  vehicle?: NoticieroVehicle | null
  customTopic?: string
  bannerTitle?: string
  heygenBackgroundUrl?: string | null
  heygenAvatarId?: string | null
  heygenVoiceId?: string | null
  createdBy?: string
}): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('noticiero_jobs')
    .insert({
      job_name: input.jobName,
      mode: input.mode,
      vehicle_id: input.vehicle?.id ?? null,
      custom_topic: input.customTopic ?? null,
      vehicle_snapshot: (input.vehicle ?? null) as unknown as Database['public']['Tables']['noticiero_jobs']['Insert']['vehicle_snapshot'],
      banner_title: input.bannerTitle ?? null,
      heygen_background_url: input.heygenBackgroundUrl ?? null,
      heygen_avatar_id: input.heygenAvatarId ?? null,
      heygen_voice_id: input.heygenVoiceId ?? null,
      created_by: input.createdBy ?? null,
      status: 'pending',
      current_step: 'script',
      progress_percentage: 0,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('[noticiero/jobs] create error:', error)
    throw new Error(error?.message ?? 'No se pudo crear el job del noticiero')
  }

  return data.id
}

export async function updateNoticieroJob(
  jobId: string,
  patch: {
    status?: NoticieroJobStatus
    current_step?: string | null
    progress_percentage?: number
    script_text?: string | null
    banner_title?: string | null
    heygen_background_url?: string | null
    heygen_avatar_id?: string | null
    heygen_voice_id?: string | null
    heygen_video_id?: string | null
    heygen_video_url?: string | null
    final_video_url?: string | null
    creatomate_render_id?: string | null
    error_message?: string | null
    job_name?: string | null
    social_publish_stage?: string | null
  }
): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('noticiero_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    console.error('[noticiero/jobs] update error:', error)
    throw new Error(error.message)
  }
}

export async function getNoticieroJob(jobId: string): Promise<NoticieroJob | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from('noticiero_jobs').select('*').eq('id', jobId).single()
  if (error || !data) return null
  return data as unknown as NoticieroJob
}
