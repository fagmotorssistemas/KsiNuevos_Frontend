import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  deleteRawFullVideoFolder,
  fetchRawFullVideoFolderDetail,
} from '@/lib/videos/raw-full-videos-library'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { folderId } = await params
    const detail = await fetchRawFullVideoFolderDetail(folderId)
    if (!detail) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 })
    }
    return NextResponse.json(detail)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/folderId GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
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
    await deleteRawFullVideoFolder(folderId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/folderId DELETE]', message)
    const status = message.includes('no encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
