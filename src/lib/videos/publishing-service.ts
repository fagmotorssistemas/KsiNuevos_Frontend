import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { PublishingPlatform } from '@/lib/videos/types'
import { publishFacebookPageReel } from '@/lib/videos/facebook'
import { publishInstagramReel } from '@/lib/videos/instagram'

export function getPublishingServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function isPlatform(x: string): x is PublishingPlatform {
  return x === 'instagram' || x === 'facebook'
}

async function upsertResult(
  supabase: ReturnType<typeof getPublishingServiceClient>,
  row: {
    queue_id: string
    platform: PublishingPlatform
    status: 'published' | 'failed'
    platform_post_id: string | null
    error_message: string | null
  }
) {
  const { error } = await supabase.from('video_publishing_results').upsert(
    {
      queue_id: row.queue_id,
      platform: row.platform,
      status: row.status,
      platform_post_id: row.platform_post_id,
      error_message: row.error_message,
      attempted_at: new Date().toISOString(),
    },
    { onConflict: 'queue_id,platform' }
  )
  if (error) console.error('[publish-queue] upsert result', error)
}

async function finalizeQueueStatusFromResults(
  supabase: ReturnType<typeof getPublishingServiceClient>,
  queueId: string,
  videoId: string,
  neededPlatforms: PublishingPlatform[]
) {
  const { data: results } = await supabase
    .from('video_publishing_results')
    .select('platform, status')
    .eq('queue_id', queueId)

  let allOk = true
  for (const p of neededPlatforms) {
    const r = results?.find((x) => x.platform === p)
    if (!r || r.status !== 'published') allOk = false
  }
  const queueFinalStatus = allOk ? 'published' : 'failed'
  await supabase
    .from('video_publishing_queue')
    .update({ status: queueFinalStatus, updated_at: new Date().toISOString() })
    .eq('id', queueId)

  await supabase
    .from('video_jobs_v2')
    .update({
      social_publish_stage: queueFinalStatus === 'published' ? 'publicado' : 'fallido',
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId)

  return queueFinalStatus
}

export type ExecutePublishOptions = {
  /** Publicar solo en estas redes (reintento parcial o republicación). */
  onlyPlatforms?: PublishingPlatform[]
  /** Permite republicar colas ya marcadas como publicadas o fallidas. */
  republish?: boolean
}

/**
 * Ejecuta publicación para un ítem de cola (Meta APIs + resultados en BD).
 * `onlyPlatforms`: reintento/republicación solo en esas redes; al final se recalcula el estado con todas las plataformas del job.
 */
export async function executePublishForQueueRow(
  queueId: string,
  opts?: ExecutePublishOptions
): Promise<{
  queueFinalStatus: 'published' | 'failed'
  platformsTried: PublishingPlatform[]
  errors: string[]
}> {
  const supabase = getPublishingServiceClient()
  const errors: string[] = []

  const { data: row, error: qErr } = await supabase.from('video_publishing_queue').select('*').eq('id', queueId).single()

  if (qErr || !row) {
    throw new Error(qErr?.message ?? 'Cola no encontrada')
  }

  const isRepublish = !!opts?.republish
  const isPartial = !!(opts?.onlyPlatforms && opts.onlyPlatforms.length > 0)

  if (isRepublish) {
    if (row.status !== 'published' && row.status !== 'failed') {
      throw new Error('Republicar solo aplica a colas publicadas o fallidas')
    }
    if (!opts?.onlyPlatforms?.length) {
      throw new Error('Selecciona al menos una red para republicar')
    }
  } else if (isPartial) {
    if (row.status !== 'failed' && row.status !== 'pending') {
      throw new Error('Reintento solo aplica a cola fallida o pendiente')
    }
  } else if (row.status !== 'pending') {
    throw new Error('La cola debe estar en estado pendiente para publicar')
  }

  const { data: job } = await supabase
    .from('video_jobs_v2')
    .select('final_video_url')
    .eq('id', row.video_id)
    .single()

  const videoUrl = job?.final_video_url ?? null
  if (!videoUrl) {
    const msg = 'El job no tiene final_video_url'
    console.error('[publish-queue]', queueId, msg)
    for (const p of row.platforms) {
      if (!isPlatform(p)) continue
      await upsertResult(supabase, {
        queue_id: queueId,
        platform: p,
        status: 'failed',
        platform_post_id: null,
        error_message: msg,
      })
    }
    await supabase
      .from('video_publishing_queue')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', queueId)
    await supabase
      .from('video_jobs_v2')
      .update({ social_publish_stage: 'fallido', updated_at: new Date().toISOString() })
      .eq('id', row.video_id)
    return { queueFinalStatus: 'failed', platformsTried: row.platforms.filter(isPlatform), errors: [msg] }
  }

  await supabase
    .from('video_publishing_queue')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', queueId)

  const neededAll = row.platforms.filter(isPlatform)
  const targets =
    opts?.onlyPlatforms && opts.onlyPlatforms.length > 0
      ? neededAll.filter((p) => opts.onlyPlatforms!.includes(p))
      : neededAll

  const platformsTried: PublishingPlatform[] = []

  for (const raw of targets) {
    platformsTried.push(raw)
    try {
      if (raw === 'instagram') {
        const { mediaId } = await publishInstagramReel(videoUrl, row.caption)
        await upsertResult(supabase, {
          queue_id: queueId,
          platform: 'instagram',
          status: 'published',
          platform_post_id: mediaId,
          error_message: null,
        })
      } else {
        const { postId } = await publishFacebookPageReel(videoUrl, row.caption)
        await upsertResult(supabase, {
          queue_id: queueId,
          platform: 'facebook',
          status: 'published',
          platform_post_id: postId,
          error_message: null,
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${raw}: ${msg}`)
      console.error(`[publish-queue] fallo ${raw}`, e)
      await upsertResult(supabase, {
        queue_id: queueId,
        platform: raw,
        status: 'failed',
        platform_post_id: null,
        error_message: msg.slice(0, 8000),
      })
    }
  }

  const queueFinalStatus = (await finalizeQueueStatusFromResults(
    supabase,
    queueId,
    row.video_id,
    neededAll
  )) as 'published' | 'failed'

  return { queueFinalStatus, platformsTried, errors }
}

/**
 * Procesa todas las filas pendientes con scheduled_at <= ahora.
 */
export async function processDuePublishingQueue(): Promise<{
  processed: number
  details: Array<{ queueId: string; status: string; errors?: string[] }>
}> {
  const supabase = getPublishingServiceClient()
  const nowIso = new Date().toISOString()

  const { data: due, error } = await supabase
    .from('video_publishing_queue')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)

  if (error) {
    console.error('[publish-queue] list due', error)
    throw new Error(error.message)
  }

  const details: Array<{ queueId: string; status: string; errors?: string[] }> = []
  for (const d of due ?? []) {
    try {
      const r = await executePublishForQueueRow(d.id)
      details.push({ queueId: d.id, status: r.queueFinalStatus, errors: r.errors })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[publish-queue] item', d.id, e)
      details.push({ queueId: d.id, status: 'error', errors: [msg] })
    }
  }

  return { processed: details.length, details }
}
