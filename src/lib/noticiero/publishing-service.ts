import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { NoticieroPublishingPlatform } from './types'
import { publishFacebookPageReel } from '@/lib/videos/facebook'
import { publishInstagramReel } from '@/lib/videos/instagram'

export function getNoticieroPublishingClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function isPlatform(x: string): x is NoticieroPublishingPlatform {
  return x === 'instagram' || x === 'facebook'
}

async function upsertResult(
  supabase: ReturnType<typeof getNoticieroPublishingClient>,
  row: {
    queue_id: string
    platform: NoticieroPublishingPlatform
    status: 'published' | 'failed'
    platform_post_id: string | null
    error_message: string | null
  }
) {
  const { error } = await supabase.from('noticiero_publishing_results').upsert(
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
  if (error) console.error('[noticiero/publish] upsert result', error)
}

async function finalizeQueueStatus(
  supabase: ReturnType<typeof getNoticieroPublishingClient>,
  queueId: string,
  jobId: string,
  neededPlatforms: NoticieroPublishingPlatform[]
) {
  const { data: results } = await supabase
    .from('noticiero_publishing_results')
    .select('platform, status')
    .eq('queue_id', queueId)

  let allOk = true
  for (const p of neededPlatforms) {
    const r = results?.find((x) => x.platform === p)
    if (!r || r.status !== 'published') allOk = false
  }

  const queueFinalStatus = allOk ? 'published' : 'failed'
  await supabase
    .from('noticiero_publishing_queue')
    .update({ status: queueFinalStatus, updated_at: new Date().toISOString() })
    .eq('id', queueId)

  await supabase
    .from('noticiero_jobs')
    .update({
      social_publish_stage: queueFinalStatus === 'published' ? 'publicado' : 'fallido',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  return queueFinalStatus
}

export async function executeNoticieroPublishForQueueRow(
  queueId: string,
  opts?: { onlyPlatforms?: NoticieroPublishingPlatform[] }
): Promise<{
  queueFinalStatus: 'published' | 'failed'
  platformsTried: NoticieroPublishingPlatform[]
  errors: string[]
}> {
  const supabase = getNoticieroPublishingClient()
  const errors: string[] = []

  const { data: row, error: qErr } = await supabase
    .from('noticiero_publishing_queue')
    .select('*')
    .eq('id', queueId)
    .single()

  if (qErr || !row) throw new Error(qErr?.message ?? 'Cola no encontrada')

  const isPartialRetry = !!(opts?.onlyPlatforms && opts.onlyPlatforms.length > 0)
  if (isPartialRetry) {
    if (row.status !== 'failed' && row.status !== 'pending') {
      throw new Error('Reintento solo aplica a cola fallida o pendiente')
    }
  } else if (row.status !== 'pending') {
    throw new Error('La cola debe estar en estado pendiente para publicar')
  }

  const { data: job } = await supabase
    .from('noticiero_jobs')
    .select('final_video_url')
    .eq('id', row.noticiero_job_id)
    .single()

  const videoUrl = job?.final_video_url ?? null
  if (!videoUrl) {
    const msg = 'El noticiero no tiene video final'
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
      .from('noticiero_publishing_queue')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', queueId)
    await supabase
      .from('noticiero_jobs')
      .update({ social_publish_stage: 'fallido', updated_at: new Date().toISOString() })
      .eq('id', row.noticiero_job_id)
    return { queueFinalStatus: 'failed', platformsTried: row.platforms.filter(isPlatform), errors: [msg] }
  }

  await supabase
    .from('noticiero_publishing_queue')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', queueId)

  const neededAll = row.platforms.filter(isPlatform)
  const targets =
    opts?.onlyPlatforms && opts.onlyPlatforms.length > 0
      ? neededAll.filter((p) => opts.onlyPlatforms!.includes(p))
      : neededAll

  const platformsTried: NoticieroPublishingPlatform[] = []

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
      await upsertResult(supabase, {
        queue_id: queueId,
        platform: raw,
        status: 'failed',
        platform_post_id: null,
        error_message: msg.slice(0, 8000),
      })
    }
  }

  const queueFinalStatus = (await finalizeQueueStatus(
    supabase,
    queueId,
    row.noticiero_job_id,
    neededAll
  )) as 'published' | 'failed'

  return { queueFinalStatus, platformsTried, errors }
}

export async function processDueNoticieroPublishingQueue(): Promise<{
  processed: number
  details: Array<{ queueId: string; status: string; errors?: string[] }>
}> {
  const supabase = getNoticieroPublishingClient()
  const nowIso = new Date().toISOString()

  const { data: due, error } = await supabase
    .from('noticiero_publishing_queue')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)

  if (error) throw new Error(error.message)

  const details: Array<{ queueId: string; status: string; errors?: string[] }> = []
  for (const d of due ?? []) {
    try {
      const r = await executeNoticieroPublishForQueueRow(d.id)
      details.push({ queueId: d.id, status: r.queueFinalStatus, errors: r.errors })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      details.push({ queueId: d.id, status: 'error', errors: [msg] })
    }
  }

  return { processed: details.length, details }
}
