import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  completeInboxVideoUploads,
  listInboxVideos,
  prepareInboxVideoUploads,
} from '@/lib/videos/marketing-inbox-videos-library'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const data = await listInboxVideos()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[videos/inbox GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      files?: Array<{ filename: string; mimeType?: string }>
      complete?: boolean
      items?: Array<{
        path: string
        originalFilename: string
        mimeType?: string | null
        sizeBytes?: number | null
      }>
    }

    if (body.complete === true) {
      const result = await completeInboxVideoUploads({
        userId: auth.userId,
        items: body.items ?? [],
      })
      return NextResponse.json({ ok: true, ...result })
    }

    const result = await prepareInboxVideoUploads({
      userId: auth.userId,
      files: (body.files ?? []).map((f) => ({ filename: f.filename ?? '' })),
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[videos/inbox POST]', message)
    const status =
      message.includes('Selecciona') ||
      message.startsWith('Máximo') ||
      message.includes('inválida') ||
      message.includes('No es un video') ||
      message.includes('requerido')
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
