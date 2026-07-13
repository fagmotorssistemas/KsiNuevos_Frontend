/**
 * Endereza orientación en el navegador (ffmpeg.wasm) antes de subir a Storage.
 */

import { extractErrorMessage } from '@/lib/videos/extract-error-message'
import {
  isFfmpegWasmEnvironmentReady,
  loadFfmpegWasm,
  type VideoCompressProgressFn,
} from '@/lib/videos/compress-video-client'
import { fileWithResolvedVideoMime } from '@/lib/videos/resolve-video-mime'
import { planReelOrientation, type VideoStreamProbe } from '@/lib/videos/video-orientation'

function safeExt(filename: string): string {
  const m = filename.trim().toLowerCase().match(/\.([a-z0-9]{1,8})$/)
  return m?.[1] ?? 'mp4'
}

function parseRotationFromFfmpegLog(message: string): number | null {
  const rotateTag = message.match(/\brotate\s*:\s*(-?\d+)/i)
  if (rotateTag) {
    const n = Number(rotateTag[1])
    if (Number.isFinite(n)) return n
  }
  const displayMatrix = message.match(/rotation of (-?\d+(?:\.\d+)?)\s*degrees/i)
  if (displayMatrix) {
    const n = Number(displayMatrix[1])
    if (Number.isFinite(n)) return Math.round(n)
  }
  return null
}

function parseDimensionsFromFfmpegLog(message: string): { width: number; height: number } | null {
  const m = message.match(/Video:\s.*\s(\d{2,5})x(\d{2,5})/i)
  if (!m) return null
  const width = Number(m[1])
  const height = Number(m[2])
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  return { width, height }
}

async function probeFileWithFfmpegWasm(
  ffmpeg: Awaited<ReturnType<typeof loadFfmpegWasm>>['ffmpeg'],
  inputName: string
): Promise<VideoStreamProbe | null> {
  let rotationDeg = 0
  let codedWidth = 0
  let codedHeight = 0

  const onLog = ({ message }: { message: string }) => {
    const rot = parseRotationFromFfmpegLog(message)
    if (rot != null) rotationDeg = rot
    const dims = parseDimensionsFromFfmpegLog(message)
    if (dims) {
      codedWidth = dims.width
      codedHeight = dims.height
    }
  }

  ffmpeg.on('log', onLog)
  try {
    await ffmpeg.exec(['-hide_banner', '-i', inputName, '-f', 'null', '-'])
  } catch {
    /* ffprobe-like: stderr en logs */
  } finally {
    ffmpeg.off('log', onLog)
  }

  if (codedWidth <= 0 || codedHeight <= 0) return null
  return { codedWidth, codedHeight, rotationDeg }
}

async function encodeNormalizedPortrait(
  ffmpeg: Awaited<ReturnType<typeof loadFfmpegWasm>>['ffmpeg'],
  inputName: string,
  vfFilter: string,
  outputName: string
): Promise<Uint8Array> {
  await ffmpeg.exec([
    '-noautorotate',
    '-i',
    inputName,
    '-vf',
    vfFilter,
    '-c:v',
    'libx264',
    '-crf',
    '23',
    '-preset',
    'veryfast',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-metadata:s:v:0',
    'rotate=0',
    '-movflags',
    '+faststart',
    '-y',
    outputName,
  ])

  const out = await ffmpeg.readFile(outputName)
  try {
    await ffmpeg.deleteFile(outputName)
  } catch {
    /* best-effort */
  }

  if (out instanceof Uint8Array) return out
  if (typeof out === 'string') return new TextEncoder().encode(out)
  throw new Error('Salida de normalización inválida')
}

function uint8ToFile(data: Uint8Array, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/i, '') || 'clip'
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return new File([new Blob([copy], { type: 'video/mp4' })], `${base}.mp4`, {
    type: 'video/mp4',
    lastModified: Date.now(),
  })
}

/**
 * Endereza el clip para Reel vertical si hace falta. Si wasm no está disponible, devuelve el original.
 */
export async function normalizeVideoFileForReelPortrait(
  file: File,
  onProgress?: VideoCompressProgressFn
): Promise<File> {
  if (typeof window === 'undefined' || !isFfmpegWasmEnvironmentReady()) {
    return file
  }

  const ext = safeExt(file.name)
  const inputName = `norm_in_${Date.now()}.${ext}`
  const outputName = `norm_out_${Date.now()}.mp4`
  let ffmpegRef: Awaited<ReturnType<typeof loadFfmpegWasm>>['ffmpeg'] | null = null

  try {
    onProgress?.(`Revisando orientación de ${file.name}…`)
    const { ffmpeg, fetchFile } = await loadFfmpegWasm(onProgress)
    ffmpegRef = ffmpeg
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const probe = await probeFileWithFfmpegWasm(ffmpeg, inputName)
    if (!probe) {
      return file
    }

    const plan = planReelOrientation(probe)
    if (!plan.required) {
      return file
    }

    onProgress?.(`Enderezando ${file.name} (${plan.reason})…`)
    const data = await encodeNormalizedPortrait(ffmpeg, inputName, plan.vfFilter, outputName)
    const out = fileWithResolvedVideoMime(uint8ToFile(data, file.name))
    onProgress?.(`${file.name} enderezado (${(out.size / (1024 * 1024)).toFixed(1)} MB)`)
    return out
  } catch (err) {
    console.warn(
      `[NormalizeOrientation][client] ${file.name}: ${extractErrorMessage(err, 'fallo')}. Subiendo original.`
    )
    return file
  } finally {
    if (ffmpegRef) {
      try {
        await ffmpegRef.deleteFile(inputName)
      } catch {
        /* best-effort */
      }
    }
  }
}
