import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronOrMarketing } from '@/lib/videos/api-marketing-auth'
import { processDuePublishingQueue } from '@/lib/videos/publishing-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function handle(request: NextRequest) {
  const auth = await authorizeCronOrMarketing(request)
  if (!auth.ok) return auth.response

  try {
    const summary = await processDuePublishingQueue()
    console.log('[publish/process]', JSON.stringify(summary))
    return NextResponse.json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error procesando cola'
    console.error('[publish/process]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Vercel Cron invoca GET por defecto. */
export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
