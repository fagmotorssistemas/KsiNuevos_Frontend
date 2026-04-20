import { NextRequest, NextResponse } from 'next/server'
import { getCreatomateRenderScriptForJob } from '@/lib/videos-v2/pipeline'

/**
 * GET — JSON de composición Creatomate (RenderScript plano) para cargar en el Preview SDK con `setSource`.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    if (!jobId) {
      return NextResponse.json({ error: 'jobId requerido' }, { status: 400 })
    }
    const source = await getCreatomateRenderScriptForJob(jobId)
    return NextResponse.json({ source })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
