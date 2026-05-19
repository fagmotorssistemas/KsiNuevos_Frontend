/** Bucket de clips crudos en Supabase Storage (debe coincidir con jobs/create y storage.ts). */
export const VIDEO_RAW_BUCKET = 'raw-videos-v2'

/** Límite del bucket `raw-videos-v2` en Supabase (2 GB por objeto). */
export const VIDEO_RAW_BUCKET_MAX_BYTES = 2 * 1024 * 1024 * 1024

/**
 * Límite efectivo típico si el proyecto no subió el tope global en Supabase Dashboard.
 * El global suele ser 50 MB y prevalece sobre el límite del bucket.
 */
export const VIDEO_SUPABASE_GLOBAL_DEFAULT_MAX_BYTES = 50 * 1024 * 1024

/** Objetivo tras compresión automática (margen bajo el tope global de 50 MB). */
export const VIDEO_STORAGE_UPLOAD_TARGET_BYTES = 47 * 1024 * 1024

/** Por encima de esto se comprime en el navegador antes de subir. */
export const VIDEO_AUTO_COMPRESS_ABOVE_BYTES = 44 * 1024 * 1024

/** Tras comprimir, subida directa con URL firmada si queda por debajo de esto. */
export const VIDEO_SIGNED_UPLOAD_MAX_BYTES = 48 * 1024 * 1024

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
