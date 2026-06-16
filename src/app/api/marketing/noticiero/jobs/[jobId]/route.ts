import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getNoticieroJob, updateNoticieroJob } from '@/lib/noticiero/jobs'
import type { NoticieroJobStatus } from '@/lib/noticiero/types'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUS: NoticieroJobStatus[] = [
  'pending',
  'script',
  'avatar',
  'compositing',
  'completed',
  'failed',
]

const ALLOWED_SOCIAL = ['generado', 'aprobado', 'programado', 'publicado', 'fallido'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { jobId } = await params
  let job = await getNoticieroJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Noticiero no encontrado' }, { status: 404 })
  }

  if (job.final_video_url?.trim() && job.error_message) {
    await updateNoticieroJob(jobId, { error_message: null })
    job = { ...job, error_message: null }
  }

  return NextResponse.json(job)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { jobId } = await params

  try {
    const body = (await request.json()) as {
      status?: NoticieroJobStatus
      current_step?: string
      progress_percentage?: number
      script_text?: string
      banner_title?: string
      heygen_video_id?: string
      heygen_video_url?: string
      final_video_url?: string
      creatomate_render_id?: string
      error_message?: string | null
      job_name?: string
      social_publish_stage?: string
    }

    if (body.status && !ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json({ error: 'status no permitido' }, { status: 400 })
    }

    if (
      body.social_publish_stage &&
      !ALLOWED_SOCIAL.includes(body.social_publish_stage as (typeof ALLOWED_SOCIAL)[number])
    ) {
      return NextResponse.json({ error: 'social_publish_stage no permitido' }, { status: 400 })
    }

    const job = await getNoticieroJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Noticiero no encontrado' }, { status: 404 })
    }

    const willBeCompleted = body.status === 'completed' || job.status === 'completed'
    const hasFinalVideo = Boolean(body.final_video_url?.trim() || job.final_video_url?.trim())

    if (body.social_publish_stage) {
      // Mismo PATCH puede enviar status: 'completed' + social_publish_stage; validar después de considerar el body.
      if (!willBeCompleted && !hasFinalVideo) {
        return NextResponse.json(
          {
            error:
              'social_publish_stage solo aplica cuando el noticiero está completado (falta video final o status completed)',
          },
          { status: 400 }
        )
      }
    }

    // Si hay video final pero el status quedó atascado en compositing/avatar, normalizar a completed.
    const patch = { ...body }
    if (
      hasFinalVideo &&
      patch.status !== 'failed' &&
      (patch.status === 'completed' || job.status === 'compositing' || job.status === 'avatar')
    ) {
      if (!patch.status) patch.status = 'completed'
      if (patch.social_publish_stage === 'generado' || (!job.social_publish_stage && !patch.social_publish_stage)) {
        patch.social_publish_stage = patch.social_publish_stage ?? 'generado'
      }
    }

    await updateNoticieroJob(jobId, patch)
    const updated = await getNoticieroJob(jobId)
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error actualizando job'
    console.error('[noticiero/jobs/patch]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { jobId } = await params
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { error } = await supabase.from('noticiero_jobs').delete().eq('id', jobId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
