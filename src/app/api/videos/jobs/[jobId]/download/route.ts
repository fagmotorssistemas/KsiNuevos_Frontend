import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

const REELS_FINAL_BUCKET = 'reels-v2'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function sanitizeFilename(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-\sáéíóúñÁÉÍÓÚÑ]/g, '').trim().slice(0, 80)
  const base = cleaned || 'reel'
  return base.toLowerCase().endsWith('.mp4') ? base : `${base}.mp4`
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_')
  const encoded = encodeURIComponent(filename)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { jobId } = await params
    const supabase = getServiceClient()

    const { data: job, error: jobErr } = await supabase
      .from('video_jobs_v2')
      .select('final_video_url, job_name, status')
      .eq('id', jobId)
      .single()

    if (jobErr || !job?.final_video_url?.trim()) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })
    }

    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'El video aún no está listo' }, { status: 400 })
    }

    const filename = sanitizeFilename(job.job_name?.trim() || `video-job-${jobId.slice(0, 8)}`)
    const storagePath = `${jobId}.mp4`

    const { data: fileData, error: storageErr } = await supabase.storage
      .from(REELS_FINAL_BUCKET)
      .download(storagePath)

    if (!storageErr && fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer())
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': contentDisposition(filename),
          'Content-Length': String(buffer.length),
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    const remote = await fetch(job.final_video_url)
    if (!remote.ok || !remote.body) {
      return NextResponse.json({ error: 'No se pudo obtener el archivo' }, { status: 502 })
    }

    return new NextResponse(remote.body, {
      headers: {
        'Content-Type': remote.headers.get('content-type') ?? 'video/mp4',
        'Content-Disposition': contentDisposition(filename),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
