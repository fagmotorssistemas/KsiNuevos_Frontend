import { NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { deleteInboxVideo } from '@/lib/videos/marketing-inbox-videos-library'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }
    await deleteInboxVideo(id.trim())
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[videos/inbox DELETE]', message)
    const status = message.includes('no encontrado') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
