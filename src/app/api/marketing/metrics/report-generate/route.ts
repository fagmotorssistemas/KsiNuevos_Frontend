import { NextResponse } from 'next/server'

export async function POST() {
  const base = process.env.METRICS_INTERNAL_API_URL?.replace(/\/$/, '')
  const secret = process.env.METRICS_INTERNAL_SECRET

  if (!base || !secret) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Configura METRICS_INTERNAL_API_URL y METRICS_INTERNAL_SECRET en el servidor (sin NEXT_PUBLIC) para delegar la generación al backend interno.',
      },
      { status: 501 }
    )
  }

  try {
    const r = await fetch(`${base}/internal/metrics/report/generate`, {
      method: 'POST',
      headers: { 'x-internal-secret': secret },
      cache: 'no-store',
    })
    const text = await r.text()
    if (!r.ok) {
      return NextResponse.json({ ok: false, message: text || r.statusText }, { status: 502 })
    }
    return NextResponse.json({ ok: true, message: text })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, message: msg }, { status: 500 })
  }
}
