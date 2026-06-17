/**
 * POST /api/videos/jobs/create-from-library
 *
 * Crea un job nuevo copiando clips ya existentes en raw-videos-v2 (sin re-subir desde el navegador).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { FlowType } from '@/lib/videos/types'
import { VIDEO_MAX_CLIPS } from '@/lib/videos/clip-config'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

const RAW_BUCKET = 'raw-videos-v2'
const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)$/i

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function sanitizeStorageFilename(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() || 'video.mp4'
  const dot = base.lastIndexOf('.')
  const extRaw = dot >= 0 ? base.slice(dot).toLowerCase() : ''
  const stem = dot >= 0 ? base.slice(0, dot) : base
  const ext = /^\.[a-z0-9]{1,8}$/.test(extRaw) ? extRaw : '.mp4'
  const slug = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'clip'
  return `${slug}${ext}`
}

function isVideoClipPath(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  return VIDEO_EXT.test(base)
}

interface CreateFromLibraryBody {
  sourceJobId: string
  sourcePaths: string[]
  flowType: FlowType
  musicTrackId: string
  jobName?: string
  show_brand_overlays?: boolean | null
  vehicle_line_1?: string | null
  vehicle_line_2?: string | null
  vehicle_line_3?: string | null
  vehicle_line_4?: string | null
  cta_text?: string | null
  whatsapp_number?: string | null
  logo_url?: string | null
  show_watermark?: boolean | null
}

function pickBrandInsertFields(body: CreateFromLibraryBody) {
  const out: Record<string, string | boolean> = {}
  if (body.show_brand_overlays !== undefined && body.show_brand_overlays !== null) {
    out.show_brand_overlays = body.show_brand_overlays
  }
  if (body.show_watermark !== undefined && body.show_watermark !== null) {
    out.show_watermark = body.show_watermark
  }
  const textKeys = [
    'vehicle_line_1',
    'vehicle_line_2',
    'vehicle_line_3',
    'vehicle_line_4',
    'cta_text',
    'whatsapp_number',
    'logo_url',
  ] as const
  for (const key of textKeys) {
    const v = body[key]
    if (v !== undefined && v !== null && String(v).trim()) {
      out[key] = String(v)
    }
  }
  return out
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as CreateFromLibraryBody
    const { sourceJobId, sourcePaths, flowType, musicTrackId, jobName } = body

    if (!sourceJobId?.trim() || !sourcePaths?.length || !flowType || !musicTrackId) {
      return NextResponse.json(
        { error: 'sourceJobId, sourcePaths, flowType y musicTrackId son requeridos' },
        { status: 400 }
      )
    }

    const normalizedSourceJobId = sourceJobId.trim()
    const paths = sourcePaths.map((p) => p.trim()).filter(Boolean)

    if (paths.length > VIDEO_MAX_CLIPS) {
      return NextResponse.json(
        { error: `Máximo ${VIDEO_MAX_CLIPS} clips permitidos por job` },
        { status: 400 }
      )
    }

    if (flowType === 'multiple' && paths.length < 2) {
      return NextResponse.json(
        { error: 'El flujo múltiple requiere al menos 2 clips' },
        { status: 400 }
      )
    }

    for (const p of paths) {
      if (!p.startsWith(`${normalizedSourceJobId}/`)) {
        return NextResponse.json(
          { error: `Ruta no válida para el job origen: ${p}` },
          { status: 400 }
        )
      }
      if (!isVideoClipPath(p)) {
        return NextResponse.json(
          { error: `No es un clip de video: ${p}` },
          { status: 400 }
        )
      }
    }

    const supabase = getServiceClient()

    const { data: musicTrack, error: musicError } = await supabase
      .from('music_tracks_v2')
      .select('public_url')
      .eq('id', musicTrackId)
      .eq('is_active', true)
      .single()

    if (musicError || !musicTrack) {
      return NextResponse.json(
        { error: 'Track de música no encontrado o inactivo' },
        { status: 404 }
      )
    }

    const normalizedJobName =
      typeof jobName === 'string' && jobName.trim().length > 0
        ? jobName.trim().slice(0, 100)
        : null

    const brandInsertFields = pickBrandInsertFields(body)

    const baseInsert = {
      flow_type: flowType,
      raw_video_paths: [] as string[],
      status: 'pending',
      current_step: 'Copiando clips de biblioteca...',
      progress_percentage: 5,
      music_track_url: musicTrack.public_url,
      ...brandInsertFields,
    }

    const insertPayload = normalizedJobName
      ? { ...baseInsert, job_name: normalizedJobName }
      : baseInsert

    const { data: job, error: insertError } = await supabase
      .from('video_jobs_v2')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError || !job) {
      return NextResponse.json(
        { error: `Error creando job: ${insertError?.message ?? 'desconocido'}` },
        { status: 500 }
      )
    }

    const newJobId = job.id
    const destPaths: string[] = []

    for (let i = 0; i < paths.length; i++) {
      const sourcePath = paths[i]!
      const filename = sourcePath.split('/').pop() ?? `clip_${i}.mp4`
      const safeFilename = sanitizeStorageFilename(filename)
      const timestamp = Date.now() + i
      const destPath =
        flowType === 'single'
          ? `${newJobId}/${timestamp}_${safeFilename}`
          : `${newJobId}/clip_${i}_${timestamp}_${safeFilename}`

      const { error: copyError } = await supabase.storage
        .from(RAW_BUCKET)
        .copy(sourcePath, destPath)

      if (copyError) {
        await supabase.from('video_jobs_v2').delete().eq('id', newJobId)
        return NextResponse.json(
          { error: `Error copiando clip "${filename}": ${copyError.message}` },
          { status: 500 }
        )
      }

      destPaths.push(destPath)
    }

    const scriptPath = `${newJobId}/guion_${Date.now()}.pdf`
    const { data: scriptSigned, error: scriptSignedError } = await supabase.storage
      .from(RAW_BUCKET)
      .createSignedUploadUrl(scriptPath)

    if (scriptSignedError || !scriptSigned) {
      return NextResponse.json(
        {
          error: `Error preparando guion: ${scriptSignedError?.message ?? 'desconocido'}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      jobId: newJobId,
      paths: destPaths,
      scriptUpload: {
        path: scriptPath,
        signedUrl: scriptSigned.signedUrl,
        token: scriptSigned.token,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/create-from-library] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
