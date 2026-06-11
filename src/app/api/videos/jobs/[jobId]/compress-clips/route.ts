/**
 * POST /api/videos/jobs/[jobId]/compress-clips
 *
 * Descarga clips grandes de Supabase Storage, los comprime con @ffmpeg/ffmpeg en
 * Node.js (sin limitaciones de SharedArrayBuffer del navegador) y los re-sube al
 * mismo path reemplazando el original.
 *
 * Body JSON: { paths: string[] }  — solo las rutas que superan el umbral (>30 MB)
 * Response:  { compressedCount: number, results: Array<{path, ok, sizeBefore, sizeAfter, error?}> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'fs'
import path from 'path'
import type { Database } from '@/types/supabase'

export const runtime = 'nodejs'
export const maxDuration = 300

const RAW_BUCKET = 'raw-videos-v2'
const COMPRESS_ABOVE_BYTES = 30 * 1024 * 1024
const TARGET_BYTES = 25 * 1024 * 1024

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function resolveFfmpegBaseUrl(): string {
  // En Vercel / Lambda los archivos de public/ pueden estar en process.cwd()/public/
  const localPath = path.join(process.cwd(), 'public', 'ffmpeg', 'ffmpeg-core.js')
  if (existsSync(localPath)) {
    const base = path.join(process.cwd(), 'public', 'ffmpeg')
    return `file://${base.replace(/\\/g, '/')}`
  }
  // Fallback: servir desde la URL pública de la app
  const appUrl = process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.ksinuevos.com'
  return `${appUrl}/ffmpeg`
}

type CompressResult = {
  path: string
  ok: boolean
  sizeBefore: number
  sizeAfter: number
  error?: string
}

async function compressClip(
  clipPath: string,
  inputBuffer: Buffer
): Promise<{ ok: boolean; data?: Buffer; error?: string }> {
  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const ffmpeg = new FFmpeg()

    const baseUrl = resolveFfmpegBaseUrl()
    const coreURL = `${baseUrl}/ffmpeg-core.js`
    const wasmURL = `${baseUrl}/ffmpeg-core.wasm`

    await ffmpeg.load({ coreURL, wasmURL })

    const ext = (clipPath.split('.').pop() ?? 'mov').toLowerCase()
    const inputName = `in_${Date.now()}.${ext}`
    const outputName = `out_${Date.now()}.mp4`

    await ffmpeg.writeFile(inputName, new Uint8Array(inputBuffer))

    await ffmpeg.exec([
      '-i', inputName,
      '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'veryfast',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-movflags', '+faststart',
      '-y', outputName,
    ])

    const raw = await ffmpeg.readFile(outputName)
    try { await ffmpeg.deleteFile(inputName) } catch { /* best-effort */ }
    try { await ffmpeg.deleteFile(outputName) } catch { /* best-effort */ }

    if (raw instanceof Uint8Array) return { ok: true, data: Buffer.from(raw) }
    return { ok: false, error: 'Salida FFmpeg inválida' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: 'jobId requerido' }, { status: 400 })
  }

  let body: { paths?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { paths } = body
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'paths debe ser un array no vacío' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Verificar que el job pertenece al jobId (seguridad básica)
  const { data: job, error: jobErr } = await supabase
    .from('video_jobs_v2')
    .select('id, status')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
  }

  // Validar que los paths pertenecen al jobId
  const invalidPaths = paths.filter((p) => !p.startsWith(`${jobId}/`))
  if (invalidPaths.length > 0) {
    return NextResponse.json(
      { error: `Rutas no permitidas: ${invalidPaths.join(', ')}` },
      { status: 400 }
    )
  }

  const results: CompressResult[] = []
  let compressedCount = 0

  for (const clipPath of paths) {
    // Descargar clip desde Supabase
    const { data: blob, error: dlErr } = await supabase.storage.from(RAW_BUCKET).download(clipPath)
    if (dlErr || !blob) {
      results.push({
        path: clipPath,
        ok: false,
        sizeBefore: 0,
        sizeAfter: 0,
        error: dlErr?.message ?? 'No se pudo descargar el clip',
      })
      continue
    }

    const inputBuffer = Buffer.from(await blob.arrayBuffer())
    const sizeBefore = inputBuffer.byteLength

    if (sizeBefore <= COMPRESS_ABOVE_BYTES) {
      // No necesita compresión
      results.push({ path: clipPath, ok: true, sizeBefore, sizeAfter: sizeBefore })
      continue
    }

    console.log(
      `[compress-clips][${jobId}] Comprimiendo ${clipPath} (${(sizeBefore / 1048576).toFixed(1)} MB)…`
    )

    const { ok, data: compressed, error: compErr } = await compressClip(clipPath, inputBuffer)

    if (!ok || !compressed) {
      console.error(`[compress-clips][${jobId}] Falló compresión de ${clipPath}: ${compErr}`)
      results.push({
        path: clipPath,
        ok: false,
        sizeBefore,
        sizeAfter: sizeBefore,
        error: compErr ?? 'Compresión fallida',
      })
      continue
    }

    if (compressed.byteLength >= sizeBefore * 0.95) {
      // El resultado no es significativamente más pequeño, no vale la pena re-subir
      results.push({ path: clipPath, ok: true, sizeBefore, sizeAfter: sizeBefore })
      continue
    }

    // Re-subir el archivo comprimido al mismo path (con upsert)
    // Usar Uint8Array para evitar incompatibilidad de tipos ArrayBuffer vs SharedArrayBuffer
    const compressedFile = new File([new Uint8Array(compressed)], clipPath.split('/').pop()!, {
      type: 'video/mp4',
    })

    const { error: upErr } = await supabase.storage
      .from(RAW_BUCKET)
      .update(clipPath, compressedFile, { cacheControl: '3600', upsert: true })

    if (upErr) {
      console.error(`[compress-clips][${jobId}] Error re-subiendo ${clipPath}: ${upErr.message}`)
      results.push({
        path: clipPath,
        ok: false,
        sizeBefore,
        sizeAfter: sizeBefore,
        error: upErr.message,
      })
      continue
    }

    const sizeAfter = compressed.byteLength
    console.log(
      `[compress-clips][${jobId}] ${clipPath}: ${(sizeBefore / 1048576).toFixed(1)} MB → ${(sizeAfter / 1048576).toFixed(1)} MB`
    )
    results.push({ path: clipPath, ok: true, sizeBefore, sizeAfter })
    compressedCount++
  }

  // Actualizar el TARGET_BYTES si todos los clips quedaron por debajo del umbral
  return NextResponse.json({
    compressedCount,
    results,
    targetBytes: TARGET_BYTES,
  })
}
