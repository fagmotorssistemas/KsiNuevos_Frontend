/**
 * Obtiene la duración en segundos de un video remoto vía ffprobe.
 * Mismo enfoque que compression.ts (ffmpeg en PATH del servidor).
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function probeVideoDurationSecondsFromUrl(
  signedUrl: string,
  jobId: string
): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        signedUrl,
      ],
      { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 }
    )
    const sec = parseFloat(String(stdout).trim())
    if (!Number.isFinite(sec) || sec <= 0) {
      throw new Error(`ffprobe devolvió duración inválida: ${stdout}`)
    }
    return Number(sec.toFixed(3))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[VideoV2Pipeline][${jobId}][ffprobe] Error: ${msg}`)
    throw new Error(
      'No se pudo leer la duración del video (ffprobe). ' +
        'En el servidor debe estar instalado ffmpeg/ffprobe y la URL del clip debe ser accesible.'
    )
  }
}

/** Igual que probeVideoDurationSecondsFromUrl pero sin lanzar (p. ej. servidor sin ffprobe). */
export async function tryProbeVideoDurationSecondsFromUrl(
  signedUrl: string,
  jobId: string
): Promise<number | null> {
  try {
    return await probeVideoDurationSecondsFromUrl(signedUrl, jobId)
  } catch {
    return null
  }
}

/** Audio o vídeo: `format=duration` con ffprobe (misma invocación que el vídeo). */
export async function tryProbeMediaDurationSecondsFromUrl(
  signedUrl: string,
  jobId: string
): Promise<number | null> {
  return tryProbeVideoDurationSecondsFromUrl(signedUrl, jobId)
}
