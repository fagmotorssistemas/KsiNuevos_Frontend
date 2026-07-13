/**
 * Endereza clips en Storage con ffmpeg/ffprobe (servidor).
 * “Quema” rotate en píxeles para que biblioteca y Shotstack vean vertical real.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  parseFfprobeVideoStream,
  planReelFlip180Repair,
  planReelOrientation,
  type VideoStreamProbe,
} from '@/lib/videos/video-orientation'
import { getSignedUrlForPath } from '@/lib/videos/storage'
import { VIDEO_RAW_BUCKET } from '@/lib/videos/resolve-video-mime'
import { resolveFfmpegBinaries, type FfmpegBinaries } from '@/lib/videos/resolve-ffmpeg-path'

const execFileAsync = promisify(execFile)

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function probeVideoStreamFromUrl(
  sourceUrl: string,
  binaries?: FfmpegBinaries
): Promise<VideoStreamProbe | null> {
  const bins = binaries ?? (await resolveFfmpegBinaries())
  if (!bins) return null

  const { stdout } = await execFileAsync(
    bins.ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-show_entries',
      'stream_tags=rotate',
      '-show_entries',
      'stream_side_data=rotation',
      '-of',
      'json',
      sourceUrl,
    ],
    { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }
  )

  let parsed: { streams?: Record<string, unknown>[] }
  try {
    parsed = JSON.parse(stdout) as { streams?: Record<string, unknown>[] }
  } catch {
    return null
  }

  const stream = parsed.streams?.[0]
  if (!stream) return null
  return parseFfprobeVideoStream(stream)
}

async function transcodeWithFilter(
  inputPath: string,
  outputPath: string,
  vfFilter: string,
  binaries: FfmpegBinaries
): Promise<void> {
  await execFileAsync(
    binaries.ffmpeg,
    [
      '-noautorotate',
      '-i',
      inputPath,
      '-vf',
      vfFilter,
      '-c:v',
      'libx264',
      '-crf',
      '23',
      '-preset',
      'fast',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-metadata:s:v:0',
      'rotate=0',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ],
    { timeout: 300_000 }
  )
}

export type NormalizeClipResult = {
  path: string
  normalized: boolean
  skipped: boolean
  reason?: string
  error?: string
}

export type NormalizeClipOptions = {
  /** Voltea 180° clips verticales sin tag (reparación tras enderezado invertido). */
  repairFlip180?: boolean
}

async function transcodeAndUploadNormalizedClip(
  storagePath: string,
  jobId: string,
  plan: { vfFilter: string; reason: string },
  binaries: FfmpegBinaries
): Promise<NormalizeClipResult> {
  const base = { path: storagePath, normalized: false, skipped: false }

  console.log(
    `[NormalizeOrientation][${jobId}] ${storagePath.split('/').pop()} → ${plan.reason} | vf=${plan.vfFilter}`
  )

  const supabase = getServiceClient()
  const { data: blob, error: dlError } = await supabase.storage
    .from(VIDEO_RAW_BUCKET)
    .download(storagePath)

  if (dlError || !blob) {
    return { ...base, error: dlError?.message ?? 'download failed' }
  }

  const fs = await import('fs')
  const os = await import('os')
  const pathMod = await import('path')
  const tmpDir = os.tmpdir()
  const stamp = Date.now()
  const inputPath = pathMod.join(tmpDir, `norm_in_${stamp}.mp4`)
  const outputPath = pathMod.join(tmpDir, `norm_out_${stamp}.mp4`)

  const inputBuffer = Buffer.from(await blob.arrayBuffer())
  fs.writeFileSync(inputPath, inputBuffer)

  try {
    await transcodeWithFilter(inputPath, outputPath, plan.vfFilter, binaries)
    const outBuffer = fs.readFileSync(outputPath)

    const { error: upError } = await supabase.storage
      .from(VIDEO_RAW_BUCKET)
      .upload(storagePath, outBuffer, {
        contentType: 'video/mp4',
        upsert: true,
        cacheControl: '3600',
      })

    if (upError) {
      return { ...base, error: upError.message }
    }

    return { ...base, normalized: true, reason: plan.reason }
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
}

/** Descarga, endereza si hace falta y vuelve a subir al mismo path (upsert). */
export async function normalizeRawClipInStorage(
  storagePath: string,
  jobId: string,
  options?: NormalizeClipOptions
): Promise<NormalizeClipResult> {
  const base = { path: storagePath, normalized: false, skipped: false }

  try {
    const binaries = await resolveFfmpegBinaries()
    if (!binaries) {
      return {
        ...base,
        skipped: true,
        reason: 'ffmpeg/ffprobe no instalado (instala con winget install Gyan.FFmpeg)',
      }
    }

    const signedUrl = await getSignedUrlForPath(storagePath)
    const probe = await probeVideoStreamFromUrl(signedUrl, binaries)
    if (!probe) {
      return { ...base, skipped: true, reason: 'ffprobe sin stream de video' }
    }

    const plan = options?.repairFlip180
      ? planReelFlip180Repair(probe)
      : planReelOrientation(probe)
    if (!plan.required) {
      return { ...base, skipped: true, reason: plan.reason }
    }

    return await transcodeAndUploadNormalizedClip(storagePath, jobId, plan, binaries)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/ffprobe|ffmpeg|ENOENT/i.test(msg)) {
      return { ...base, skipped: true, reason: `ffmpeg/ffprobe no disponible (${msg.slice(0, 120)})` }
    }
    return { ...base, error: msg }
  }
}

export type NormalizeBatchResult = {
  normalized: string[]
  skipped: string[]
  skipDetails: Array<{ path: string; reason: string }>
  errors: string[]
}

export async function normalizeRawClipsInStorage(
  jobId: string,
  paths: string[],
  options?: NormalizeClipOptions
): Promise<NormalizeBatchResult> {
  const normalized: string[] = []
  const skipped: string[] = []
  const skipDetails: Array<{ path: string; reason: string }> = []
  const errors: string[] = []

  for (const p of paths) {
    const result = await normalizeRawClipInStorage(p, jobId, options)
    if (result.normalized) {
      normalized.push(p)
    } else if (result.error) {
      errors.push(`${p}: ${result.error}`)
    } else {
      skipped.push(p)
      skipDetails.push({ path: p, reason: result.reason ?? 'sin cambios' })
    }
  }

  return { normalized, skipped, skipDetails, errors }
}

/** Buffer en memoria (upload-clip API). */
export async function normalizeVideoBufferForReel(
  buffer: Buffer,
  filename: string
): Promise<{ buffer: Buffer; normalized: boolean; reason?: string }> {
  const fs = await import('fs')
  const os = await import('os')
  const pathMod = await import('path')
  const tmpDir = os.tmpdir()
  const stamp = Date.now()
  const inputPath = pathMod.join(tmpDir, `norm_up_in_${stamp}.mp4`)
  const outputPath = pathMod.join(tmpDir, `norm_up_out_${stamp}.mp4`)

  fs.writeFileSync(inputPath, buffer)

  try {
    const binaries = await resolveFfmpegBinaries()
    if (!binaries) {
      return { buffer, normalized: false, reason: 'ffmpeg no instalado' }
    }

    const probe = await probeVideoStreamFromUrl(inputPath, binaries)
    if (!probe) {
      return { buffer, normalized: false, reason: 'sin probe' }
    }

    const plan = planReelOrientation(probe)
    if (!plan.required) {
      return { buffer, normalized: false, reason: plan.reason }
    }

    console.log(`[NormalizeOrientation][upload] ${filename} → ${plan.reason}`)
    await transcodeWithFilter(inputPath, outputPath, plan.vfFilter, binaries)
    const out = fs.readFileSync(outputPath)
    return { buffer: out, normalized: true, reason: plan.reason }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[NormalizeOrientation][upload] ${filename} skip: ${msg}`)
    return { buffer, normalized: false, reason: msg }
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
}
