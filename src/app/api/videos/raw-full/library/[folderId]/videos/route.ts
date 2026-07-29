import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  deleteRawFullVideo,
  prepareAppendRawFullVideos,
} from '@/lib/videos/raw-full-videos-library'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { folderId } = await params
    const body = (await request.json()) as {
      files?: Array<{ filename: string; mimeType?: string }>
    }
    const files = (body.files ?? [])
      .map((f) => ({ filename: f.filename?.trim() ?? '' }))
      .filter((f) => f.filename)

    const result = await prepareAppendRawFullVideos(folderId, files)
    return NextResponse.json({ folderId, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/folderId/videos POST]', message)
    const status =
      message === 'Carpeta no encontrada'
        ? 404
        : message.startsWith('Máximo') || message.includes('Selecciona')
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { folderId } = await params
    const body = (await request.json()) as { path?: string }
    const path = body.path?.trim()
    if (!path) {
      return NextResponse.json({ error: 'path es requerido' }, { status: 400 })
    }
    const result = await deleteRawFullVideo(folderId, path)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/folderId/videos DELETE]', message)
    const status =
      message.includes('no encontrada') || message.includes('no encontrado')
        ? 404
        : message.includes('inválida') || message.includes('No es un video')
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
