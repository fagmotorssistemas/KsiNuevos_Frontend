import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  computeAndPersistPilarDayCompliance,
  getStoredPilarComplianceForDate,
  getStoredPilarComplianceForMonth,
} from '@/lib/marketing/pilar-compliance'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isValidYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value)
}

/**
 * GET /api/pilares/compliance?fecha=YYYY-MM-DD&recompute=1
 * GET /api/pilares/compliance?month=YYYY-MM
 */
export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const fecha = request.nextUrl.searchParams.get('fecha')
  const month = request.nextUrl.searchParams.get('month')
  const recompute = request.nextUrl.searchParams.get('recompute') === '1'

  try {
    if (fecha) {
      if (!isValidYmd(fecha)) {
        return NextResponse.json({ error: 'fecha inválida' }, { status: 400 })
      }
      if (recompute) {
        const day = await computeAndPersistPilarDayCompliance(fecha)
        return NextResponse.json({ day })
      }
      const stored = await getStoredPilarComplianceForDate(fecha)
      if (stored) return NextResponse.json({ day: stored })
      const day = await computeAndPersistPilarDayCompliance(fecha)
      return NextResponse.json({ day })
    }

    if (month) {
      if (!isValidMonth(month)) {
        return NextResponse.json({ error: 'month inválido' }, { status: 400 })
      }
      const days = await getStoredPilarComplianceForMonth(month)
      return NextResponse.json({ month, days })
    }

    return NextResponse.json(
      { error: 'Indica fecha=YYYY-MM-DD o month=YYYY-MM' },
      { status: 400 }
    )
  } catch (e) {
    console.error('[api/pilares/compliance GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error de cumplimiento' },
      { status: 500 }
    )
  }
}

/** POST /api/pilares/compliance  { fecha: "YYYY-MM-DD" } → recalcula y guarda */
export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  let body: { fecha?: string } = {}
  try {
    body = (await request.json()) as { fecha?: string }
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const fecha = body.fecha?.trim() ?? ''
  if (!isValidYmd(fecha)) {
    return NextResponse.json({ error: 'fecha inválida' }, { status: 400 })
  }

  try {
    const day = await computeAndPersistPilarDayCompliance(fecha)
    return NextResponse.json({ day })
  } catch (e) {
    console.error('[api/pilares/compliance POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error recalculando' },
      { status: 500 }
    )
  }
}
