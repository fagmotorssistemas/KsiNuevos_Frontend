import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType } from '@/lib/videos/types'
import { getSignedUrlForPath } from '@/lib/videos/storage'
import {
  isPipelineInputMeta,
  normalizeClipDurationsInput,
  normalizeClipKindsInput,
  normalizeMusicTrimStartSec,
} from '@/lib/videos/clip-config'
import { reelAudioVolumesFromPipelineMeta } from '@/lib/videos/audio-balance'
import {
  runMultipleClipsPipelineFromStorage,
  runSingleVideoPipelineFromStorage,
} from '@/lib/videos/pipeline'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const RESUMABLE_STATUSES = new Set([
  'pending',
  'uploading',
  'transcribing',
  'analyzing',
  'rendering',
  'failed',
])

/**
 * Carga el job desde Supabase y ejecuta el pipeline completo (await).
 * Usado por POST /api/videos/jobs/[jobId]/run-pipeline.
 */
export async function runPipelineForJob(jobId: string, opts?: { force?: boolean }): Promise<void> {
  const supabase = getServiceClient()
  const { data: job, error } = await supabase
    .from('video_jobs_v2')
    .select('flow_type, music_track_url, raw_video_paths, selected_clips, status')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new Error('Job no encontrado')
  }

  if (job.status === 'completed' && !opts?.force) {
    console.log(`[VideoV2][${jobId}] Pipeline omitido: job ya completado`)
    return
  }

  if (!RESUMABLE_STATUSES.has(job.status) && !opts?.force) {
    throw new Error(`Estado del job no reanudable: ${job.status}`)
  }

  if (!job.music_track_url) {
    throw new Error('El job no tiene track de música')
  }

  const paths = job.raw_video_paths ?? []
  if (paths.length === 0) {
    throw new Error('El job no tiene clips en Storage')
  }

  const meta = isPipelineInputMeta(job.selected_clips) ? job.selected_clips : undefined
  const signedUrls = await Promise.all(paths.map((path) => getSignedUrlForPath(path)))
  const files = paths.map((path, i) => ({
    buffer: Buffer.alloc(0),
    filename: path.split('/').pop() ?? `clip_${i}.mp4`,
    mimeType: 'video/mp4',
    alreadyUploaded: true as const,
    path,
    signedUrl: signedUrls[i]!,
  }))

  const musicTrimStartSec = normalizeMusicTrimStartSec(meta?.musicTrimStartSec ?? undefined)
  const reelAudioVolumes = reelAudioVolumesFromPipelineMeta(meta)
  const flowType = job.flow_type as FlowType

  console.log(`[VideoV2][${jobId}] runPipelineForJob: flow=${flowType}, clips=${paths.length}`)

  if (flowType === 'single') {
    const f = files[0]!
    await runSingleVideoPipelineFromStorage(
      jobId,
      f.path,
      f.signedUrl,
      job.music_track_url,
      musicTrimStartSec,
      reelAudioVolumes
    )
    return
  }

  await runMultipleClipsPipelineFromStorage(
    jobId,
    files,
    job.music_track_url,
    meta?.clipKinds ? normalizeClipKindsInput(meta.clipKinds, paths.length) : undefined,
    meta?.clipDurationsSec ? normalizeClipDurationsInput(meta.clipDurationsSec, paths.length) : undefined,
    meta?.voiceOverBaseClipIndex ?? undefined,
    meta?.voiceOverOverlayClipIndices ?? undefined,
    meta?.voiceOverAudioPath ?? undefined,
    meta?.voiceOverMp3DurationSec ?? undefined,
    musicTrimStartSec,
    reelAudioVolumes
  )
}
