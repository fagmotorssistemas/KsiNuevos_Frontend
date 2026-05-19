/** Bucket de clips crudos en Supabase Storage (debe coincidir con jobs/create y storage.ts). */
export const VIDEO_RAW_BUCKET = 'raw-videos-v2'

/** Límite del bucket `raw-videos-v2` en Supabase (2 GB). */
export const VIDEO_RAW_BUCKET_MAX_BYTES = 2 * 1024 * 1024 * 1024

const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/avi',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
])

const EXT_TO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/avi',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
}

function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/**
 * MIME aceptado por el bucket `raw-videos-v2`.
 * En Windows/Chrome los .MOV de iPhone suelen llegar como `application/octet-stream` o con `type` vacío.
 */
export function resolveVideoMimeType(file: File): string | null {
  const t = (file.type || '').trim().toLowerCase()
  if (ALLOWED_VIDEO_MIME.has(t)) return t

  if (
    t === 'application/octet-stream' ||
    t === '' ||
    t === 'application/x-unknown' ||
    t === 'binary/octet-stream'
  ) {
    return EXT_TO_MIME[extensionFromFilename(file.name)] ?? null
  }

  return null
}

/** Archivo con MIME normalizado para Storage (evita 400 InvalidMimeType en upload firmado). */
export function fileWithResolvedVideoMime(file: File): File {
  const mime = resolveVideoMimeType(file)
  if (!mime) return file
  if ((file.type || '').trim().toLowerCase() === mime) return file
  return new File([file], file.name, { type: mime, lastModified: file.lastModified })
}
