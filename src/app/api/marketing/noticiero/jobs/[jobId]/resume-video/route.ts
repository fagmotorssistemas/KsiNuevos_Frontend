import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getNoticieroJob, updateNoticieroJob } from '@/lib/noticiero/jobs'
import { scheduleNoticieroPipeline } from '@/lib/noticiero/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const { jobId } = await params

  try {
    const job = await getNoticieroJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Noticiero no encontrado' }, { status: 404 })
    }

    if (job.status === 'completed' && job.final_video_url) {
      return NextResponse.json({ job, message: 'El video ya está completado' })
    }

    const heygenVideoUrl = job.heygen_video_url?.trim()
    if (!heygenVideoUrl) {
      return NextResponse.json(
        { error: 'No hay video de HeyGen guardado. Regenera el noticiero desde cero.' },
        { status: 400 }
      )
    }

    await updateNoticieroJob(jobId, { error_message: null })

    const { after } = await import('next/server')
    after(() => {
      scheduleNoticieroPipeline(jobId)
    })

    const updated = await getNoticieroJob(jobId)
    return NextResponse.json({
      job: updated,
      message: 'Composición reanudada en el servidor. Actualiza en unos segundos.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error reanudando composición'
    console.error('[noticiero/resume-video]', err)

    try {
      await updateNoticieroJob(jobId, {
        status: 'compositing',
        error_message: message,
      })
    } catch {
      /* ignore */
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
