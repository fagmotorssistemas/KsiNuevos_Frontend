/**
 * Compresión de video del lado del servidor.
 * Usa fluent-ffmpeg si está disponible. Si no, retorna el buffer original con advertencia.
 * En producción con Vercel, considerar usar un servicio externo de transcoding.
 */

const MAX_SIZE_SINGLE_BYTES = 500 * 1024 * 1024 // 500 MB
const MAX_SIZE_CLIP_BYTES = 200 * 1024 * 1024 // 200 MB
/** Tope Supabase con spend cap (~50 MB global). */
export const STORAGE_UPLOAD_CAP_BYTES = 47 * 1024 * 1024
const MAX_WIDTH = 1280 // 720p

export interface CompressionResult {
  buffer: Buffer
  originalSize: number
  compressedSize: number
  wasCompressed: boolean
  error?: string
}

async function compressWithFfmpeg(
  inputBuffer: Buffer,
  maxWidthPx: number,
  crf: number = 28
): Promise<Buffer> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const { tmpdir } = await import('os')
  const path = await import('path')
  const fs = await import('fs')

  const execFileAsync = promisify(execFile)
  const tmpDir = tmpdir()
  const inputPath = path.join(tmpDir, `v2_in_${Date.now()}.mp4`)
  const outputPath = path.join(tmpDir, `v2_out_${Date.now()}.mp4`)

  fs.writeFileSync(inputPath, inputBuffer)

  try {
    // Scale to max width keeping aspect ratio, CRF 28 para buena compresión
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-vf', `scale='min(${maxWidthPx},iw)':-2`,
      '-c:v', 'libx264',
      '-crf', String(crf),
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y',
      outputPath,
    ], { timeout: 300_000 }) // 5 minutos máximo

    const compressed = fs.readFileSync(outputPath)
    return compressed
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
}

/** Comprime en servidor (ffmpeg) hasta caber en el tope global de Storage (~50 MB). */
export async function compressVideoForStorageCap(
  buffer: Buffer,
  filename: string
): Promise<CompressionResult> {
  const originalSize = buffer.length
  if (originalSize <= STORAGE_UPLOAD_CAP_BYTES) {
    return { buffer, originalSize, compressedSize: originalSize, wasCompressed: false }
  }

  const attempts = [
    { crf: 28, width: 1280 },
    { crf: 30, width: 1280 },
    { crf: 32, width: 960 },
    { crf: 35, width: 720 },
  ]

  console.log(
    `[VideoV2Compression][${filename}] Storage cap: ${(originalSize / 1024 / 1024).toFixed(1)} MB -> <${(STORAGE_UPLOAD_CAP_BYTES / 1024 / 1024).toFixed(0)} MB`
  )

  try {
    let lastBuf = buffer
    for (const { crf, width } of attempts) {
      lastBuf = await compressWithFfmpeg(buffer, width, crf)
      if (lastBuf.length <= STORAGE_UPLOAD_CAP_BYTES) {
        console.log(
          `[VideoV2Compression][${filename}] OK tras CRF ${crf}: ${(lastBuf.length / 1024 / 1024).toFixed(1)} MB`
        )
        return {
          buffer: lastBuf,
          originalSize,
          compressedSize: lastBuf.length,
          wasCompressed: true,
        }
      }
    }

    if (lastBuf.length < originalSize && lastBuf.length <= 52 * 1024 * 1024) {
      return {
        buffer: lastBuf,
        originalSize,
        compressedSize: lastBuf.length,
        wasCompressed: true,
      }
    }

    return {
      buffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      error: `El video (${(originalSize / 1024 / 1024).toFixed(1)} MB) no pudo comprimirse por debajo de ~47 MB en el servidor.`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[VideoV2Compression][${filename}] ffmpeg no disponible: ${msg}`)
    return {
      buffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      error: `Compresión en servidor no disponible (${msg}). El navegador debería comprimir antes de subir.`,
    }
  }
}

export async function compressVideoIfNeeded(
  buffer: Buffer,
  filename: string,
  isSingleVideo: boolean
): Promise<CompressionResult> {
  const originalSize = buffer.length
  const maxSize = isSingleVideo ? MAX_SIZE_SINGLE_BYTES : MAX_SIZE_CLIP_BYTES

  if (originalSize <= maxSize) {
    return { buffer, originalSize, compressedSize: originalSize, wasCompressed: false }
  }

  console.log(`[VideoV2Compression][${filename}] Comprimiendo: ${(originalSize / 1024 / 1024).toFixed(1)} MB -> objetivo <${(maxSize / 1024 / 1024).toFixed(0)} MB`)

  try {
    const compressed = await compressWithFfmpeg(buffer, MAX_WIDTH)
    const compressedSize = compressed.length

    if (compressedSize >= maxSize) {
      return {
        buffer,
        originalSize,
        compressedSize,
        wasCompressed: false,
        error: `El video pesa ${(originalSize / 1024 / 1024).toFixed(1)} MB y no pudo comprimirse por debajo del límite de ${(maxSize / 1024 / 1024).toFixed(0)} MB. Por favor sube un video más corto.`,
      }
    }

    console.log(`[VideoV2Compression][${filename}] Compresión exitosa: ${(compressedSize / 1024 / 1024).toFixed(1)} MB`)
    return { buffer: compressed, originalSize, compressedSize, wasCompressed: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[VideoV2Compression][${filename}] ffmpeg no disponible o falló: ${msg}. Usando archivo original.`)
    // Si ffmpeg no está disponible, subimos el archivo original y dejamos que Supabase maneje el límite
    return { buffer, originalSize, compressedSize: originalSize, wasCompressed: false }
  }
}
