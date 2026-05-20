/**
 * Compresión en el navegador (ffmpeg.wasm) para clips que superan el tope global de Supabase (~50 MB).
 * Solo importar desde componentes cliente.
 */

import { VIDEO_STORAGE_UPLOAD_TARGET_BYTES } from '@/lib/videos/resolve-video-mime'
import { extractErrorMessage } from '@/lib/videos/extract-error-message'

export type VideoCompressProgressFn = (message: string) => void

type FfmpegModule = typeof import('@ffmpeg/ffmpeg')
type UtilModule = typeof import('@ffmpeg/util')

type EncodeAttempt = {
  crf: number
  maxWidth: number
  audioK?: number
  fps?: number
}

let ffmpegLoadPromise: Promise<InstanceType<FfmpegModule['FFmpeg']>> | null = null

function safeExt(filename: string): string {
  const m = filename.trim().toLowerCase().match(/\.([a-z0-9]{1,8})$/)
  return m?.[1] ?? 'mov'
}

function toError(err: unknown, prefix: string): Error {
  const detail = extractErrorMessage(err, 'fallo desconocido')
  if (err instanceof Error) {
    return new Error(`${prefix}: ${detail}`, { cause: err })
  }
  return new Error(`${prefix}: ${detail}`)
}

function resetFfmpegLoader(): void {
  ffmpegLoadPromise = null
}

async function assertFfmpegAssetsReachable(): Promise<void> {
  const wasmUrl = `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`
  const res = await fetch(wasmUrl, { method: 'HEAD' })
  if (!res.ok) {
    throw new Error(
      `No se encontró el compresor en ${wasmUrl} (HTTP ${res.status}). ` +
        'En local: npm install y reinicia el servidor. En producción: espera a que termine el deploy.'
    )
  }
}

async function loadFfmpeg(onProgress?: VideoCompressProgressFn): Promise<{
  ffmpeg: InstanceType<FfmpegModule['FFmpeg']>
  fetchFile: UtilModule['fetchFile']
}> {
  if (typeof window === 'undefined') {
    throw new Error('La compresión de video solo está disponible en el navegador.')
  }

  await assertFfmpegAssetsReachable()

  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      onProgress?.('Preparando compresor de video (primera vez puede tardar 1–2 min)…')
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress }) => {
        if (progress > 0.02 && progress <= 1) {
          onProgress?.(`Comprimiendo… ${Math.round(progress * 100)}%`)
        }
      })

      const baseURL = `${window.location.origin}/ffmpeg`
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
      } catch (err) {
        resetFfmpegLoader()
        throw toError(
          err,
          'No se pudo cargar el compresor de video. Recarga la página o ejecuta npm install en el proyecto'
        )
      }

      return ffmpeg
    })()
  }

  try {
    const ffmpeg = await ffmpegLoadPromise
    return { ffmpeg, fetchFile }
  } catch (err) {
    resetFfmpegLoader()
    throw err instanceof Error ? err : toError(err, 'Compresor de video no disponible')
  }
}

/** Precarga wasm (p. ej. al seleccionar clips grandes) para fallar antes de pulsar Crear. */
export async function preloadVideoCompressor(onProgress?: VideoCompressProgressFn): Promise<void> {
  await loadFfmpeg(onProgress)
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

async function encodeFromInput(
  ffmpeg: InstanceType<FfmpegModule['FFmpeg']>,
  inputName: string,
  attempt: EncodeAttempt
): Promise<Uint8Array> {
  const outputName = `out_${attempt.crf}_${attempt.maxWidth}.mp4`
  const args: string[] = ['-i', inputName]

  if (attempt.fps) {
    args.push('-r', String(attempt.fps))
  }

  args.push(
    '-vf',
    `scale='min(${attempt.maxWidth},iw)':-2`,
    '-c:v',
    'libx264',
    '-crf',
    String(attempt.crf),
    '-preset',
    'veryfast',
    '-c:a',
    'aac',
    '-b:a',
    `${attempt.audioK ?? 96}k`,
    '-movflags',
    '+faststart',
    '-y',
    outputName
  )

  await ffmpeg.exec(args)

  const out = await ffmpeg.readFile(outputName)
  try {
    await ffmpeg.deleteFile(outputName)
  } catch {
    /* best-effort */
  }

  if (out instanceof Uint8Array) return out
  if (typeof out === 'string') return new TextEncoder().encode(out)
  throw new Error('Salida de compresión inválida')
}

const ENCODE_ATTEMPTS: EncodeAttempt[] = [
  { crf: 28, maxWidth: 1280, audioK: 96 },
  { crf: 30, maxWidth: 1280, audioK: 80 },
  { crf: 32, maxWidth: 960, audioK: 80 },
  { crf: 34, maxWidth: 720, audioK: 64 },
  { crf: 36, maxWidth: 640, audioK: 64 },
  { crf: 38, maxWidth: 480, audioK: 48, fps: 30 },
  { crf: 40, maxWidth: 426, audioK: 48, fps: 24 },
]

export type CompressForStorageOptions = {
  /** Tamaño máximo deseado en bytes (por defecto ~47 MB). */
  targetBytes?: number
}

/**
 * Comprime el archivo hasta quedar por debajo de `targetBytes` (p. ej. tras rechazo de Storage).
 */
export async function compressVideoFileForStorage(
  file: File,
  onProgress?: VideoCompressProgressFn,
  options?: CompressForStorageOptions
): Promise<File> {
  const target = options?.targetBytes ?? VIDEO_STORAGE_UPLOAD_TARGET_BYTES

  if (file.size <= target) {
    return file
  }
  const originalMb = (file.size / (1024 * 1024)).toFixed(1)
  onProgress?.(
    `Comprimiendo ${file.name} (${originalMb} MB → objetivo <${Math.round(target / (1024 * 1024))} MB). No cierres esta ventana…`
  )

  const { ffmpeg, fetchFile } = await loadFfmpeg(onProgress)

  const ext = safeExt(file.name)
  const inputName = `in_${Date.now()}.${ext}`

  try {
    onProgress?.(`Leyendo ${file.name} en el compresor…`)
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    let lastData: Uint8Array | null = null
    let lastMb = ''

    for (const attempt of ENCODE_ATTEMPTS) {
      const label = `${attempt.maxWidth}px CRF ${attempt.crf}`
      onProgress?.(`Comprimiendo ${file.name} (${label})…`)
      try {
        lastData = await encodeFromInput(ffmpeg, inputName, attempt)
      } catch (err) {
        throw toError(err, `Error comprimiendo "${file.name}"`)
      }

      lastMb = (lastData.byteLength / (1024 * 1024)).toFixed(1)
      onProgress?.(`${file.name}: intento ${label} → ${lastMb} MB`)

      if (lastData.byteLength <= target) {
        const out = uint8ToFile(lastData, file.name)
        onProgress?.(`Listo: ${file.name} quedó en ${(out.size / (1024 * 1024)).toFixed(1)} MB`)
        return out
      }
    }

    throw new Error(
      `Tras varios intentos, "${file.name}" quedó en ~${lastMb} MB (necesita <${Math.round(target / (1024 * 1024))} MB). ` +
        'Usa un clip más corto (menos de ~90 s) o en el iPhone: Fotos → Compartir → "Guardar en archivos" eligiendo calidad más baja / MP4 compatible.'
    )
  } finally {
    try {
      await ffmpeg.deleteFile(inputName)
    } catch {
      /* best-effort */
    }
  }
}
