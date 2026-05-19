/**
 * Compresión en el navegador (ffmpeg.wasm) para clips que superan el tope global de Supabase (~50 MB).
 * Solo importar desde componentes cliente.
 */

import {
  VIDEO_AUTO_COMPRESS_ABOVE_BYTES,
  VIDEO_STORAGE_UPLOAD_TARGET_BYTES,
  VIDEO_SUPABASE_GLOBAL_DEFAULT_MAX_BYTES,
} from '@/lib/videos/resolve-video-mime'

export type VideoCompressProgressFn = (message: string) => void

type FfmpegModule = typeof import('@ffmpeg/ffmpeg')
type UtilModule = typeof import('@ffmpeg/util')

let ffmpegSingleton: InstanceType<FfmpegModule['FFmpeg']> | null = null
let ffmpegLoadPromise: Promise<InstanceType<FfmpegModule['FFmpeg']>> | null = null

function safeExt(filename: string): string {
  const m = filename.trim().toLowerCase().match(/\.([a-z0-9]{1,8})$/)
  return m?.[1] ?? 'mov'
}

async function loadFfmpeg(onProgress?: VideoCompressProgressFn): Promise<{
  ffmpeg: InstanceType<FfmpegModule['FFmpeg']>
  fetchFile: UtilModule['fetchFile']
}> {
  if (typeof window === 'undefined') {
    throw new Error('La compresión de video solo está disponible en el navegador.')
  }

  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      onProgress?.('Preparando compresor de video (primera vez puede tardar un poco)…')
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress }) => {
        if (progress > 0.02 && progress <= 1) {
          onProgress?.(`Comprimiendo… ${Math.round(progress * 100)}%`)
        }
      })
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegSingleton = ffmpeg
      return ffmpeg
    })()
  }

  const ffmpeg = await ffmpegLoadPromise
  return { ffmpeg, fetchFile }
}

function uint8ToFile(data: Uint8Array, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/i, '') || 'clip'
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return new File([copy.buffer], `${base}.mp4`, { type: 'video/mp4', lastModified: Date.now() })
}

async function encodeOnce(
  ffmpeg: InstanceType<FfmpegModule['FFmpeg']>,
  fetchFile: UtilModule['fetchFile'],
  file: File,
  crf: number,
  maxWidth: number
): Promise<Uint8Array> {
  const ext = safeExt(file.name)
  const inputName = `in_${Date.now()}.${ext}`
  const outputName = `out_${Date.now()}.mp4`

  await ffmpeg.writeFile(inputName, await fetchFile(file))
  await ffmpeg.exec([
    '-i',
    inputName,
    '-vf',
    `scale='min(${maxWidth},iw)':-2`,
    '-c:v',
    'libx264',
    '-crf',
    String(crf),
    '-preset',
    'fast',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-movflags',
    '+faststart',
    '-y',
    outputName,
  ])

  const out = await ffmpeg.readFile(outputName)
  try {
    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)
  } catch {
    /* best-effort cleanup */
  }

  if (out instanceof Uint8Array) return out
  if (typeof out === 'string') return new TextEncoder().encode(out)
  throw new Error('Salida de compresión inválida')
}

const ENCODE_ATTEMPTS: Array<{ crf: number; maxWidth: number }> = [
  { crf: 28, maxWidth: 1280 },
  { crf: 30, maxWidth: 1280 },
  { crf: 32, maxWidth: 960 },
  { crf: 35, maxWidth: 720 },
]

/**
 * Comprime el archivo si supera el umbral, hasta quedar por debajo de ~47 MB (tope Supabase 50 MB).
 */
export async function compressVideoFileForStorage(
  file: File,
  onProgress?: VideoCompressProgressFn
): Promise<File> {
  if (file.size <= VIDEO_AUTO_COMPRESS_ABOVE_BYTES) {
    return file
  }

  const target = VIDEO_STORAGE_UPLOAD_TARGET_BYTES
  const originalMb = (file.size / (1024 * 1024)).toFixed(1)
  onProgress?.(`Comprimiendo ${file.name} (${originalMb} MB → objetivo <${Math.round(target / (1024 * 1024))} MB)…`)

  const { ffmpeg, fetchFile } = await loadFfmpeg(onProgress)

  let lastData: Uint8Array | null = null
  for (const attempt of ENCODE_ATTEMPTS) {
    onProgress?.(
      `Comprimiendo ${file.name} (720p/CRF ${attempt.crf})…`
    )
    lastData = await encodeOnce(ffmpeg, fetchFile, file, attempt.crf, attempt.maxWidth)
    if (lastData.byteLength <= target) {
      const out = uint8ToFile(lastData, file.name)
      onProgress?.(
        `Listo: ${file.name} quedó en ${(out.size / (1024 * 1024)).toFixed(1)} MB`
      )
      return out
    }
  }

  if (lastData && lastData.byteLength < file.size) {
    const out = uint8ToFile(lastData, file.name)
    const outMb = (out.size / (1024 * 1024)).toFixed(1)
    if (out.size <= VIDEO_SUPABASE_GLOBAL_DEFAULT_MAX_BYTES) {
      onProgress?.(`Comprimido a ${outMb} MB (sigue siendo pesado pero debería subir).`)
      return out
    }
  }

  throw new Error(
    `No se pudo comprimir "${file.name}" por debajo de ~${Math.round(target / (1024 * 1024))} MB. ` +
      'Prueba un clip más corto o exporta desde el teléfono como "Más compatible" (MP4).'
  )
}
