import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { completeRawFullVideoUpload } from '@/lib/videos/raw-full-videos-library'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      folderId?: string
      paths?: string[]
      append?: boolean
    }
    const result = await completeRawFullVideoUpload({
      folderId: body.folderId ?? '',
      paths: body.paths ?? [],
      append: body.append === true,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[raw-full/library/complete]', message)
    const status =
      message.includes('requerido') || message.includes('inválida') || message.startsWith('Máximo')
        ? 400
        : message.includes('no encontrada')
          ? 404
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
