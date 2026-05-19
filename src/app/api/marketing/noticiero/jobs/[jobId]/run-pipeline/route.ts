import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getNoticieroJob } from '@/lib/noticiero/jobs'
import { scheduleNoticieroPipeline } from '@/lib/noticiero/pipeline'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  const { jobId } = await params

  const job = await getNoticieroJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Noticiero no encontrado' }, { status: 404 })
  }

  if (job.status === 'completed' && job.final_video_url) {
    return NextResponse.json({ job, message: 'Ya completado' })
  }

  after(() => {
    scheduleNoticieroPipeline(jobId)
  })

  return NextResponse.json({
    jobId,
    message: 'Pipeline reanudado en el servidor',
  })
}
