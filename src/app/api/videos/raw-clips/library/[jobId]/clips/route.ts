import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { deleteRawClip } from '@/lib/videos/raw-clips-library'

export const dynamic = 'force-dynamic'

interface DeleteClipBody {
  path: string
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { jobId } = await params
    const body = (await request.json()) as DeleteClipBody
    const path = body.path?.trim()

    if (!path) {
      return NextResponse.json({ error: 'path es requerido' }, { status: 400 })
    }

    const result = await deleteRawClip(jobId, path)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-clips/library/jobId/clips DELETE]', message)
    const status =
      message === 'Carpeta no encontrada' || message === 'Clip no encontrado en esta carpeta'
        ? 404
        : message === 'Ruta de clip inválida' || message === 'No es un clip de video'
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
