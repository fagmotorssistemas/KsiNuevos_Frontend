import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { MUSIC_TRACKS_BUCKET } from '@/lib/videos/music-upload-shared'

const RAW_BUCKET = 'raw-videos-v2'
/** Bucket público solo para reels finales (preview, descarga, Instagram). */
const REELS_FINAL_BUCKET = 'reels-v2'

const MUSIC_BUCKET = MUSIC_TRACKS_BUCKET
const SIGNED_URL_EXPIRY = 60 * 60 * 24 // 24 horas

function assertVideoStorageEnv(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url) {
    throw new Error('[VideoStorage] Falta NEXT_PUBLIC_SUPABASE_URL en el entorno del servidor.')
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error('[VideoStorage] NEXT_PUBLIC_SUPABASE_URL debe ser una URL https absoluta.')
  }
  if (!key) {
    throw new Error(
      '[VideoStorage] Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor (requerida para Storage y URLs firmadas).'
    )
  }
}

function isRetryableStorageNetworkMessage(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('fetch failed') ||
    m.includes('econnreset') ||
    m.includes('etimedout') ||
    m.includes('enotfound') ||
    m.includes('eai_again') ||
    m.includes('socket') ||
    m.includes('network')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Audio de VO por job: bucket música (admite audio); `raw-videos` suele limitar solo a vídeo. */
export function jobVoiceOverAudioStoragePath(jobId: string, extWithDot: string): string {
  return `reel-vo/${jobId}/voice_over${extWithDot}`
}

function voiceOverExtFromUpload(filename: string, mimeType: string): string {
  const n = filename.trim().toLowerCase()
  if (n.endsWith('.wav')) return '.wav'
  if (n.endsWith('.m4a')) return '.m4a'
  if (n.endsWith('.aac')) return '.aac'
  if (n.endsWith('.mp3')) return '.mp3'
  const m = mimeType.toLowerCase()
  if (m.includes('wav')) return '.wav'
  if (m.includes('aac')) return '.aac'
  if (m.includes('mp4') || m.includes('m4a')) return '.m4a'
  return '.mp3'
}

/** Sube MP3/WAV/… de VO al bucket de música y devuelve path + URL pública. */
export async function uploadJobVoiceOverAudioToMusicBucket(
  jobId: string,
  file: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getServiceClient()
  const ext = voiceOverExtFromUpload(originalFilename, mimeType)
  const path = jobVoiceOverAudioStoragePath(jobId, ext)
  const { error } = await supabase.storage.from(MUSIC_BUCKET).upload(path, file, {
    contentType: mimeType || 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(`[VideoStorage] Error subiendo audio VO: ${error.message}`)
  const { data } = supabase.storage.from(MUSIC_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

/** URL para Creatomate: clips en raw bucket (firmada) o VO en bucket música (pública). */
export async function resolveVoiceOverAudioUrl(storagePath: string): Promise<string> {
  const p = storagePath.trim()
  if (p.startsWith('reel-vo/')) {
    const supabase = getServiceClient()
    return supabase.storage.from(MUSIC_BUCKET).getPublicUrl(p).data.publicUrl
  }
  return getSignedUrlForPath(p)
}

function getServiceClient() {
  assertVideoStorageEnv()
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function createSignedUrlForRawPath(
  supabase: ReturnType<typeof getServiceClient>,
  objectPath: string
): Promise<string> {
  const maxAttempts = 4
  let lastMessage = 'sin respuesta'
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(250 * 2 ** (attempt - 1))
    }
    const { data, error } = await supabase.storage
      .from(RAW_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY)

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    lastMessage = error?.message || 'error desconocido al firmar URL'
    if (!isRetryableStorageNetworkMessage(lastMessage) || attempt === maxAttempts - 1) {
      const hint = isRetryableStorageNetworkMessage(lastMessage)
        ? ' Revisa conectividad HTTPS hacia Supabase, DNS/VPN/firewall y que las variables NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén definidas en el entorno donde corre esta API (local o Vercel).'
        : ''
      throw new Error(`[VideoStorage] Error generando URL firmada: ${lastMessage}.${hint}`)
    }
  }

  throw new Error(`[VideoStorage] Error generando URL firmada: ${lastMessage}`)
}

export async function uploadRawVideoV2(
  jobId: string,
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ path: string; signedUrl: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const path = `${jobId}/${timestamp}_${filename}`

  const { error } = await supabase.storage
    .from(RAW_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`[VideoStorage] Error subiendo video: ${error.message}`)

  const signedUrl = await createSignedUrlForRawPath(supabase, path)

  return { path, signedUrl }
}

export async function uploadRawVideoClipV2(
  jobId: string,
  clipIndex: number,
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ path: string; signedUrl: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const path = `${jobId}/clip_${clipIndex}_${timestamp}_${filename}`

  const { error } = await supabase.storage
    .from(RAW_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`[VideoStorage] Error subiendo clip ${clipIndex}: ${error.message}`)

  const signedUrl = await createSignedUrlForRawPath(supabase, path)

  return { path, signedUrl }
}

export async function getSignedUrlForPath(path: string): Promise<string> {
  const supabase = getServiceClient()
  return createSignedUrlForRawPath(supabase, path)
}

/** MP4 final del reel en bucket público `reels-v2`. */
export function finalReelStoragePath(jobId: string): string {
  return `${jobId}.mp4`
}

export function finalReelPublicUrl(jobId: string): string {
  const supabase = getServiceClient()
  const { data } = supabase.storage.from(REELS_FINAL_BUCKET).getPublicUrl(finalReelStoragePath(jobId))
  return data.publicUrl
}

export async function downloadShotstackVideoAndStoreFinalReel(
  shotstackUrl: string,
  jobId: string
): Promise<string> {
  const supabase = getServiceClient()
  const storagePath = finalReelStoragePath(jobId)

  const response = await fetch(shotstackUrl)
  if (!response.ok) {
    throw new Error(`Error descargando video Shotstack: HTTP ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  const { error } = await supabase.storage.from(REELS_FINAL_BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Error subiendo reel a Storage: ${error.message}`)

  return finalReelPublicUrl(jobId)
}

/** Persiste el reel en Storage; si falla, devuelve la URL temporal de Shotstack. */
export async function resolveFinalReelVideoUrl(
  shotstackUrl: string | null | undefined,
  jobId: string
): Promise<string | null> {
  const url = shotstackUrl?.trim()
  if (!url) return null
  try {
    const stored = await downloadShotstackVideoAndStoreFinalReel(url, jobId)
    console.log(`[VideoStorage][${jobId}] Reel guardado en Storage: ${stored}`)
    return stored
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[VideoStorage][${jobId}] Error guardando reel, usando URL Shotstack: ${msg}`)
    return url
  }
}

/** Ruta en Storage para una pista nueva (`tracks/…`). */
export function buildMusicTrackStoragePath(originalFilename: string): string {
  const timestamp = Date.now()
  const rid = randomBytes(4).toString('hex')
  const safeBase = safeMusicStorageBasename(originalFilename)
  return `tracks/${timestamp}_${rid}_${safeBase}`
}

/** Nombre de objeto Storage seguro (evita espacios/Unicode que algunos backends rechazan). */
function safeMusicStorageBasename(originalFilename: string): string {
  const base = originalFilename.trim().split(/[/\\]/).pop() || 'audio'
  const dot = base.lastIndexOf('.')
  const extRaw = dot >= 0 ? base.slice(dot).toLowerCase() : ''
  const stem = dot >= 0 ? base.slice(0, dot) : base
  const allowedExt = new Set(['.mp3', '.wav', '.aac', '.m4a', '.mpeg', '.mp4'])
  const extNorm = extRaw && allowedExt.has(extRaw) ? extRaw : '.mp3'
  const slug = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'track'
  return `${slug}${extNorm}`
}

export async function uploadMusicTrack(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getServiceClient()
  const path = buildMusicTrackStoragePath(filename)

  const { error } = await supabase.storage
    .from(MUSIC_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`[VideoStorage] Error subiendo música: ${error.message}`)

  const { data: publicData } = supabase.storage.from(MUSIC_BUCKET).getPublicUrl(path)

  return { path, publicUrl: publicData.publicUrl }
}

/**
 * Borra los archivos de un job ya borrado: sus clips (`raw-videos-v2/{jobId}/`), el reel final
 * (`reels-v2/{jobId}.mp4`) y la voz en off (`reel-vo/{jobId}/`). Sin esto quedaban en Storage
 * para siempre. Un clip que otro job todavía usa no se toca.
 */
export async function deleteVideoJobFiles(jobId: string): Promise<{ removed: number; kept: number }> {
  const supabase = getServiceClient()

  const rawPaths = await listFolderFiles(supabase, RAW_BUCKET, jobId)
  const inUse = rawPaths.length > 0 ? await rawPathsUsedByOtherJobs(supabase, jobId) : new Set<string>()
  const rawToRemove = rawPaths.filter((p) => !inUse.has(p))
  const voPaths = await listFolderFiles(supabase, MUSIC_BUCKET, `reel-vo/${jobId}`)

  let removed = 0
  removed += await removeInBatches(supabase, RAW_BUCKET, rawToRemove)
  removed += await removeInBatches(supabase, REELS_FINAL_BUCKET, [finalReelStoragePath(jobId)])
  removed += await removeInBatches(supabase, MUSIC_BUCKET, voPaths)
  return { removed, kept: rawPaths.length - rawToRemove.length }
}

async function listFolderFiles(
  supabase: ReturnType<typeof getServiceClient>,
  bucket: string,
  folder: string
): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000, offset })
    if (error) throw new Error(`[VideoStorage] No se pudo listar ${bucket}/${folder}: ${error.message}`)
    // Las entradas sin id son subcarpetas; los clips de un job están en un solo nivel.
    for (const item of data ?? []) if (item.id) paths.push(`${folder}/${item.name}`)
    if ((data ?? []).length < 1000) return paths
  }
}

/** Paths (sin prefijo de bucket) de la carpeta `{jobId}/` que siguen en `raw_video_paths` de otro job. */
async function rawPathsUsedByOtherJobs(
  supabase: ReturnType<typeof getServiceClient>,
  jobId: string
): Promise<Set<string>> {
  const used = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('video_jobs_v2')
      .select('raw_video_paths')
      .neq('id', jobId)
      .range(from, from + 999)
    if (error) throw new Error(`[VideoStorage] No se pudo revisar qué clips usan otros jobs: ${error.message}`)
    for (const row of data ?? []) {
      for (const p of row.raw_video_paths ?? []) {
        const path = p.replace(new RegExp(`^${RAW_BUCKET}/`), '')
        if (path.startsWith(`${jobId}/`)) used.add(path)
      }
    }
    if ((data ?? []).length < 1000) return used
  }
}

async function removeInBatches(
  supabase: ReturnType<typeof getServiceClient>,
  bucket: string,
  paths: string[]
): Promise<number> {
  let removed = 0
  for (let i = 0; i < paths.length; i += 100) {
    const { data, error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
    if (error) throw new Error(`[VideoStorage] No se pudo borrar en ${bucket}: ${error.message}`)
    removed += data?.length ?? 0
  }
  return removed
}
