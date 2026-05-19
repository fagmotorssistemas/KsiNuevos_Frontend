/**
 * POST /api/videos/jobs/[jobId]/upload-clip
 *
 * Sube un clip al bucket raw-videos-v2 con service role (evita límites del navegador).
 * Requiere que el límite global de Storage en Supabase permita el tamaño del archivo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { compressVideoForStorageCap } from '@/lib/videos/compression'
import {
  VIDEO_RAW_BUCKET,
  VIDEO_RAW_BUCKET_MAX_BYTES,
  VIDEO_STORAGE_UPLOAD_TARGET_BYTES,
} from '@/lib/videos/resolve-video-mime'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/avi',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
])

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function resolveMime(file: File): string | null {
  const t = (file.type || '').trim().toLowerCase()
  if (ALLOWED_MIME.has(t)) return t
  const n = file.name.trim().toLowerCase()
  if (n.endsWith('.mov')) return 'video/quicktime'
  if (n.endsWith('.mp4')) return 'video/mp4'
  if (n.endsWith('.avi')) return 'video/x-msvideo'
  if (n.endsWith('.webm')) return 'video/webm'
  if (n.endsWith('.mkv')) return 'video/x-matroska'
  return null
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params
    if (!jobId?.trim()) {
      return NextResponse.json({ error: 'jobId inválido' }, { status: 400 })
    }

    const formData = await request.formData()
    const pathRaw = formData.get('path')
    const file = formData.get('file')

    if (typeof pathRaw !== 'string' || !pathRaw.trim()) {
      return NextResponse.json({ error: 'path es requerido' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file es requerido' }, { status: 400 })
    }

    const path = pathRaw.trim()
    if (!path.startsWith(`${jobId}/`)) {
      return NextResponse.json({ error: 'path no pertenece a este job' }, { status: 400 })
    }

    const mime = resolveMime(file)
    if (!mime) {
      return NextResponse.json(
        { error: 'Tipo de video no permitido (mp4, mov, avi, webm, mkv)' },
        { status: 400 }
      )
    }

    if (file.size > VIDEO_RAW_BUCKET_MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        {
          error: `El archivo supera el límite por clip (${mb} MB > 2 GB). Comprime el video antes de subirlo.`,
        },
        { status: 413 }
      )
    }

    let buf = Buffer.from(await file.arrayBuffer())
    let compressedOnServer = false

    if (buf.length > VIDEO_STORAGE_UPLOAD_TARGET_BYTES) {
      const result = await compressVideoForStorageCap(buf, file.name)
      if (result.error && buf.length > VIDEO_STORAGE_UPLOAD_TARGET_BYTES) {
        return NextResponse.json({ error: result.error }, { status: 413 })
      }
      buf = Buffer.from(result.buffer)
      compressedOnServer = result.wasCompressed
      if (buf.length > VIDEO_STORAGE_UPLOAD_TARGET_BYTES) {
        return NextResponse.json(
          {
            error: `Tras comprimir en servidor, el archivo sigue pesando ${(buf.length / (1024 * 1024)).toFixed(1)} MB (máx. ~47 MB). Usa un clip más corto.`,
          },
          { status: 413 }
        )
      }
    }

    const uploadMime = compressedOnServer ? 'video/mp4' : mime
    const supabase = getServiceClient()

    const { error } = await supabase.storage.from(VIDEO_RAW_BUCKET).upload(path, buf, {
      contentType: uploadMime,
      upsert: true,
      cacheControl: '3600',
    })

    if (error) {
      const msg = error.message || 'Error de Storage'
      const status =
        /entitytoolarge|maximum|exceeded|too large|size limit/i.test(msg) ? 413 : 400
      return NextResponse.json(
        {
          error:
            status === 413
              ? `${msg} — Sube el límite global en Supabase → Storage (recomendado ≥500 MB para clips de ~60 MB).`
              : msg,
        },
        { status }
      )
    }

    return NextResponse.json({ path, ok: true, compressed: compressedOnServer })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[VideoV2][/jobs/upload-clip] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
