import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { fetchRawClipsFolderDetail } from '@/lib/videos/raw-clips-library'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { jobId } = await params
    const detail = await fetchRawClipsFolderDetail(jobId)
    if (!detail) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 })
    }
    return NextResponse.json(detail)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-clips/library/jobId]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
