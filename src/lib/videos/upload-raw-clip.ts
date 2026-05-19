import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  VIDEO_RAW_BUCKET,
  fileWithResolvedVideoMime,
  resolveVideoMimeType,
  VIDEO_AUTO_COMPRESS_ABOVE_BYTES,
  VIDEO_SIGNED_UPLOAD_MAX_BYTES,
  VIDEO_STORAGE_UPLOAD_TARGET_BYTES,
} from '@/lib/videos/resolve-video-mime'
import type { VideoCompressProgressFn } from '@/lib/videos/compress-video-client'

type StorageClient = SupabaseClient<Database>

export type VideoUploadProgressFn = (message: string) => void

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
      `"${file.name}" (~${mb} MB) sigue siendo demasiado pesado para Storage tras comprimir. ` +
      'Prueba un clip más corto o exporta como MP4 "Más compatible" desde el teléfono.'
    )
  }
  return `Error subiendo ${file.name}: ${message}`
}

async function prepareFileForUpload(
  file: File,
  onProgress?: VideoUploadProgressFn
): Promise<File> {
  if (file.size <= VIDEO_AUTO_COMPRESS_ABOVE_BYTES) {
    return fileWithResolvedVideoMime(file)
  }

  if (typeof window === 'undefined') {
    return fileWithResolvedVideoMime(file)
  }

  const { compressVideoFileForStorage } = await import('@/lib/videos/compress-video-client')
  const compressed = await compressVideoFileForStorage(file, onProgress)
  return fileWithResolvedVideoMime(compressed)
}

async function uploadClipViaSignedUrl(
  supabase: StorageClient,
  path: string,
  token: string,
  file: File
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  const { error } = await supabase.storage
    .from(VIDEO_RAW_BUCKET)
    .uploadToSignedUrl(path, token, file, { cacheControl: '3600' })

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
): Promise<{ ok: true; compressed?: boolean } | { ok: false; message: string; status?: number }> {
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

  let data: { error?: string; compressed?: boolean } = {}
  try {
    data = (await res.json()) as { error?: string; compressed?: boolean }
  } catch {
    data = {}
  }

  if (!res.ok) {
    return { ok: false, message: data.error ?? `HTTP ${res.status}`, status: res.status }
  }
  return { ok: true, compressed: data.compressed }
}

/**
 * Comprime si hace falta (~50 MB Supabase) y sube al bucket raw-videos-v2.
 */
export async function uploadRawVideoClip(
  supabase: StorageClient,
  jobId: string,
  path: string,
  token: string,
  file: File,
  options?: { onProgress?: VideoUploadProgressFn }
): Promise<void> {
  const onProgress = options?.onProgress
  const prepared = await prepareFileForUpload(file, onProgress)

  if (prepared.size > VIDEO_STORAGE_UPLOAD_TARGET_BYTES) {
    onProgress?.(`Subiendo ${prepared.name} (archivo grande, vía servidor)…`)
    const proxy = await uploadClipViaApiProxy(jobId, path, prepared)
    if (proxy.ok) return
    throw new Error(formatVideoClipUploadError(file, proxy.message, proxy.status))
  }

  const useProxyFirst = prepared.size > VIDEO_SIGNED_UPLOAD_MAX_BYTES

  if (useProxyFirst) {
    onProgress?.(`Subiendo ${prepared.name}…`)
    const proxy = await uploadClipViaApiProxy(jobId, path, prepared)
    if (proxy.ok) return
    throw new Error(formatVideoClipUploadError(file, proxy.message, proxy.status))
  }

  onProgress?.(`Subiendo ${prepared.name}…`)
  const signed = await uploadClipViaSignedUrl(supabase, path, token, prepared)
  if (signed.ok) return

  if (isLikelyStorageSizeError(signed.message, signed.status)) {
    const proxy = await uploadClipViaApiProxy(jobId, path, prepared)
    if (proxy.ok) return
    throw new Error(formatVideoClipUploadError(file, proxy.message, proxy.status))
  }

  throw new Error(formatVideoClipUploadError(file, signed.message, signed.status))
}
