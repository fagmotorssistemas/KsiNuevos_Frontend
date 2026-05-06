/**
 * Google File API — Comprime videos a baja resolución y los sube al File API
 * de Google para que Gemini pueda analizarlos visualmente.
 *
 * Usa el binario ffmpeg del sistema (mismo patrón que compression.ts).
 * Si ffmpeg no está disponible o falla, el pipeline continúa sin análisis visual.
 */

import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { promisify } from 'util'
import { execFile } from 'child_process'

const execFileAsync = promisify(execFile)

const FILE_POLL_INTERVAL_MS = 3_000
const FILE_POLL_TIMEOUT_MS = 3 * 60_000 // 3 minutos
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000
const FFMPEG_TIMEOUT_MS = 5 * 60_000
const MAX_COMPRESSED_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export interface GoogleFileRef {
  fileUri: string
  mimeType: string
  fileName: string // nombre interno de Google para cleanup
}

function getFileManager() {
  return new GoogleAIFileManager(process.env.GEMINI_API_KEY!)
}

// ─── Descarga video de Supabase a /tmp ────────────────────────────────────────

async function downloadToTemp(signedUrl: string, jobId: string, suffix: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `gemini_v2_${jobId}_${suffix}_original.mp4`)

  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)

  console.log(`[VideoV2GoogleFileAPI][${jobId}] Descargando video a ${tmpPath}`)

  const response = await fetch(signedUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Error descargando video (HTTP ${response.status})`)
  if (!response.body) throw new Error('La respuesta no tiene body stream')

  const fileStream = fs.createWriteStream(tmpPath)
  const reader = response.body.getReader()

  await new Promise<void>((resolve, reject) => {
    fileStream.on('error', reject)
    fileStream.on('finish', resolve)

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { fileStream.end(); break }
          fileStream.write(value)
        }
      } catch (err) {
        fileStream.destroy()
        reject(err)
      }
    }
    pump()
  })

  const stats = fs.statSync(tmpPath)
  console.log(`[VideoV2GoogleFileAPI][${jobId}] Descargado: ${(stats.size / 1024 / 1024).toFixed(1)} MB`)

  return tmpPath
}

// ─── Compresión con ffmpeg ────────────────────────────────────────────────────

async function compressForGemini(inputPath: string, jobId: string, suffix: string, crf: number = 28): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `gemini_v2_${jobId}_${suffix}_compressed.mp4`)

  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

  console.log(`[VideoV2GoogleFileAPI][${jobId}] Comprimiendo con ffmpeg (CRF ${crf})`)

  await execFileAsync('ffmpeg', [
    '-i', inputPath,
    '-vf', "scale='min(854,iw)':-2",
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-b:a', '64k',
    '-y',
    outputPath,
  ], { timeout: FFMPEG_TIMEOUT_MS })

  const stats = fs.statSync(outputPath)
  console.log(`[VideoV2GoogleFileAPI][${jobId}] Comprimido: ${(stats.size / 1024 / 1024).toFixed(1)} MB`)

  // Si sigue siendo > 50MB, recomprimir con CRF más agresivo
  if (stats.size > MAX_COMPRESSED_SIZE_BYTES && crf < 35) {
    console.warn(`[VideoV2GoogleFileAPI][${jobId}] Archivo > 50MB, recomprimiendo con CRF 35`)
    fs.unlinkSync(outputPath)
    return compressForGemini(inputPath, jobId, suffix, 35)
  }

  return outputPath
}

// ─── Upload al File API de Google + polling ───────────────────────────────────

async function uploadAndWaitActive(filePath: string, displayName: string, jobId: string): Promise<GoogleFileRef> {
  const fileManager = getFileManager()

  console.log(`[VideoV2GoogleFileAPI][${jobId}] Subiendo al File API de Google...`)

  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: 'video/mp4',
    displayName,
  })

  const fileName = uploadResult.file.name
  console.log(`[VideoV2GoogleFileAPI][${jobId}] Archivo subido: ${fileName}. Polling estado...`)

  const deadline = Date.now() + FILE_POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const file = await fileManager.getFile(fileName)

    if (file.state === FileState.ACTIVE) {
      console.log(`[VideoV2GoogleFileAPI][${jobId}] Archivo ACTIVE.`)
      return { fileUri: file.uri, mimeType: file.mimeType, fileName }
    }

    if (file.state === FileState.FAILED) {
      throw new Error(`Google File API reportó FAILED para ${fileName}`)
    }

    await new Promise((r) => setTimeout(r, FILE_POLL_INTERVAL_MS))
  }

  throw new Error(`Timeout de 3 minutos esperando que el archivo sea ACTIVE en Google`)
}

// ─── Función principal: prepareVideoForGemini ─────────────────────────────────

/**
 * Descarga, comprime y sube un video al File API de Google.
 * Limpia los archivos temporales de /tmp al terminar (éxito o fallo).
 */
export async function prepareVideoForGemini(
  signedUrl: string,
  jobId: string,
  suffix: string = 'single'
): Promise<GoogleFileRef> {
  let originalPath: string | null = null
  let compressedPath: string | null = null

  try {
    originalPath = await downloadToTemp(signedUrl, jobId, suffix)
    compressedPath = await compressForGemini(originalPath, jobId, suffix)
    const ref = await uploadAndWaitActive(compressedPath, `video_${jobId}_${suffix}`, jobId)
    return ref
  } finally {
    if (originalPath && fs.existsSync(originalPath)) {
      try { fs.unlinkSync(originalPath) } catch { /* best-effort */ }
    }
    if (compressedPath && fs.existsSync(compressedPath)) {
      try { fs.unlinkSync(compressedPath) } catch { /* best-effort */ }
    }
  }
}

// ─── Múltiples videos en paralelo ─────────────────────────────────────────────

export async function prepareMultipleVideosForGemini(
  signedUrls: string[],
  jobId: string
): Promise<GoogleFileRef[]> {
  console.log(`[VideoV2GoogleFileAPI][${jobId}] Preparando ${signedUrls.length} videos en paralelo`)

  return Promise.all(
    signedUrls.map((url, i) => prepareVideoForGemini(url, jobId, `clip${i}`))
  )
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Elimina un archivo del File API de Google.
 * Best-effort: no lanza si falla.
 */
export async function cleanupGoogleFile(ref: GoogleFileRef, jobId: string): Promise<void> {
  try {
    const fileManager = getFileManager()
    await fileManager.deleteFile(ref.fileName)
    console.log(`[VideoV2GoogleFileAPI][${jobId}] Archivo ${ref.fileName} eliminado de Google.`)
  } catch {
    console.warn(`[VideoV2GoogleFileAPI][${jobId}] No se pudo eliminar ${ref.fileName} de Google (best-effort).`)
  }
}

export async function cleanupMultipleGoogleFiles(refs: GoogleFileRef[], jobId: string): Promise<void> {
  await Promise.all(refs.map((ref) => cleanupGoogleFile(ref, jobId)))
}
