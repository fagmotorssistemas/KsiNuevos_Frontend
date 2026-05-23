/** Bucket de pistas de música en Supabase Storage. */
export const MUSIC_TRACKS_BUCKET = 'music-tracks-v2'

/** Límite por archivo (margen bajo el tope global típico de Storage ~50 MB). */
export const MAX_MUSIC_UPLOAD_BYTES = 45 * 1024 * 1024

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mpeg3',
  'audio/x-mpeg',
  'audio/x-mpeg-3',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
])

const EXT_TO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
}

function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/**
 * Muchos MP3 llegan como `application/octet-stream` o con `type` vacío según SO/navegador.
 */
export function resolveAudioMimeType(filename: string, reportedType?: string | null): string | null {
  const t = (reportedType || '').trim().toLowerCase()
  if (ALLOWED_AUDIO_TYPES.has(t)) {
    if (t === 'audio/x-m4a') return 'audio/mp4'
    if (t === 'audio/mp3' || t === 'audio/mpeg3' || t === 'audio/x-mpeg' || t === 'audio/x-mpeg-3') {
      return 'audio/mpeg'
    }
    return t
  }
  if (
    t === 'application/octet-stream' ||
    t === '' ||
    t === 'application/x-unknown' ||
    t === 'binary/octet-stream'
  ) {
    const ext = extensionFromFilename(filename)
    const mapped = EXT_TO_MIME[ext]
    if (mapped) return mapped
  }
  return null
}

export function normalizeTrackName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 200)
}

export function musicUploadSizeError(): string {
  return `El archivo supera el límite permitido (${Math.round(MAX_MUSIC_UPLOAD_BYTES / (1024 * 1024))} MB).`
}
