import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { getNoticieroHistory, getNoticieroHistoryById } from '@/lib/noticiero/config-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const id = new URL(request.url).searchParams.get('id')
    if (id) {
      const row = await getNoticieroHistoryById(id)
      if (!row) {
        return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
      }
      return NextResponse.json(row)
    }

    const rows = await getNoticieroHistory(20)
    return NextResponse.json({ items: rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error leyendo historial'
    console.error('[noticiero/history GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
