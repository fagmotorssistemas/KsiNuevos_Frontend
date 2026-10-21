/**
 * POST /api/videos/jobs/start
 *
 * Recibe el jobId y los paths de los archivos ya subidos a Supabase Storage.
 * Actualiza el job con los paths y dispara el pipeline en background.
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeJobStart, type StartJobBody } from '@/lib/videos/execute-job-start'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as StartJobBody
    const result = await executeJobStart(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ jobId: result.jobId, status: result.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/start] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
