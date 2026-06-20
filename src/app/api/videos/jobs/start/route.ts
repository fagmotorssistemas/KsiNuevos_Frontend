/**
 * POST /api/videos/jobs/start
 *
 * Recibe el jobId y los paths de los archivos ya subidos a Supabase Storage.
 * Actualiza el job con los paths y dispara el pipeline en background.
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeJobStart, type StartJobBody } from '@/lib/videos/execute-job-start'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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
