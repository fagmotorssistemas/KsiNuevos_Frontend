import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  VIDEO_RAW_BUCKET,
  fileWithResolvedVideoMime,
  resolveVideoMimeType,
} from '@/lib/videos/resolve-video-mime'

/** Por debajo del límite global típico de Supabase (50 MB) en planes sin ajustar Storage. */
export const VIDEO_SIGNED_UPLOAD_MAX_BYTES = 48 * 1024 * 1024

type StorageClient = SupabaseClient<Database>

function isLikelyStorageSizeError(message: string, status?: number): boolean {
  if (status === 413) return true
  const m = message.toLowerCase()
  return (
    m.includes('entitytoolarge') ||
    m.includes('maximum') ||
    m.includes('maxim') ||
    m.includes('exceeded') ||
    m.includes('too large') ||
    m.includes('payload too large') ||
    m.includes('file size') ||
    m.includes('size limit') ||
    m.includes('límite') ||
    m.includes('tamano') ||
    m.includes('tamaño')
  )
}

export function formatVideoClipUploadError(file: File, message: string, status?: number): string {
  const mb = (file.size / (1024 * 1024)).toFixed(1)
  if (isLikelyStorageSizeError(message, status)) {
    return (
      `"${file.name}" (~${mb} MB) supera el límite de tamaño de Supabase Storage. ` +
      'El proyecto suele tener un tope global de 50 MB: en el panel de Supabase ve a Storage → configuración y sube el límite global (recomendado 500 MB o 2 GB). ' +
      'Los clips de ~60 MB necesitan ese cambio.'
    )
  }
  return `Error subiendo ${file.name}: ${message}`
}

async function uploadClipViaSignedUrl(
  supabase: StorageClient,
  path: string,
  token: string,
  file: File
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  const body = fileWithResolvedVideoMime(file)
  const { error } = await supabase.storage
    .from(VIDEO_RAW_BUCKET)
    .uploadToSignedUrl(path, token, body, { cacheControl: '3600' })

  if (error) {
    const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined
    return { ok: false, message: error.message, status }
  }
  return { ok: true }
}

async function uploadClipViaApiProxy(
  jobId: string,
  path: string,
  file: File
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  const mime = resolveVideoMimeType(file)
  if (!mime) {
    return { ok: false, message: 'Tipo de video no permitido' }
  }

  const body = file.type === mime ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified })
  const fd = new FormData()
  fd.append('path', path)
  fd.append('file', body)

  const res = await fetch(`/api/videos/jobs/${jobId}/upload-clip`, {
    method: 'POST',
    body: fd,
  })

  let data: { error?: string } = {}
  try {
    data = (await res.json()) as { error?: string }
  } catch {
    data = {}
  }

  if (!res.ok) {
    return { ok: false, message: data.error ?? `HTTP ${res.status}`, status: res.status }
  }
  return { ok: true }
}

/**
 * Sube un clip al bucket raw-videos-v2.
 * Archivos >48 MB usan proxy API (service role); el resto, URL firmada directa.
 */
export async function uploadRawVideoClip(
  supabase: StorageClient,
  jobId: string,
  path: string,
  token: string,
  file: File
): Promise<void> {
  const useProxyFirst = file.size > VIDEO_SIGNED_UPLOAD_MAX_BYTES

  if (useProxyFirst) {
    const proxy = await uploadClipViaApiProxy(jobId, path, file)
    if (proxy.ok) return
    throw new Error(formatVideoClipUploadError(file, proxy.message, proxy.status))
  }

  const signed = await uploadClipViaSignedUrl(supabase, path, token, file)
  if (signed.ok) return

  if (isLikelyStorageSizeError(signed.message, signed.status)) {
    const proxy = await uploadClipViaApiProxy(jobId, path, file)
    if (proxy.ok) return
    throw new Error(formatVideoClipUploadError(file, proxy.message, proxy.status))
  }

  throw new Error(formatVideoClipUploadError(file, signed.message, signed.status))
}
