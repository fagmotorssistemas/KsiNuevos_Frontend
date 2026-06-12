import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  VIDEO_RAW_BUCKET,
  fileWithResolvedVideoMime,
  resolveVideoMimeType,
  VIDEO_STORAGE_UPLOAD_TARGET_BYTES,
  VIDEO_STORAGE_SPEND_CAP_TARGET_BYTES,
  VIDEO_SHOTSTACK_PRE_COMPRESS_ABOVE_BYTES,
  VIDEO_SHOTSTACK_PRE_COMPRESS_TARGET_BYTES,
} from '@/lib/videos/resolve-video-mime'
import { extractErrorMessage } from '@/lib/videos/extract-error-message'

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

export function formatVideoClipUploadError(
  file: File,
  message: string,
  status?: number,
  uploadBytes?: number
): string {
  const mb = ((uploadBytes ?? file.size) / (1024 * 1024)).toFixed(1)
  const originalMb = (file.size / (1024 * 1024)).toFixed(1)
  const sizeNote =
    uploadBytes != null && uploadBytes !== file.size
      ? ` (~${mb} MB tras comprimir, original ~${originalMb} MB)`
      : ` (~${originalMb} MB)`

  if (isLikelyStorageSizeError(message, status)) {
    return (
      `"${file.name}"${sizeNote} no se pudo subir a Storage por el límite de tamaño del proyecto. ` +
      'Si ya subiste el tope global en Supabase, recarga la app. Si no, usa un clip más corto o exporta como MP4 "Más compatible". ' +
      `Detalle: ${message}`
    )
  }
  return `Error subiendo ${file.name}: ${message}`
}

/** Objetivo de compresión según el tamaño del archivo original. */
function compressionTargetForFile(file: File): number {
  if (file.size > VIDEO_STORAGE_UPLOAD_TARGET_BYTES) {
    return VIDEO_STORAGE_UPLOAD_TARGET_BYTES
  }
  return VIDEO_STORAGE_SPEND_CAP_TARGET_BYTES
}

async function compressAfterStorageRejection(
  original: File,
  onProgress?: VideoUploadProgressFn
): Promise<File> {
  if (typeof window === 'undefined') {
    throw new Error('La compresión tras rechazo de Storage solo está disponible en el navegador.')
  }

  const targetBytes = compressionTargetForFile(original)
  const { compressVideoFileForStorage } = await import('@/lib/videos/compress-video-client')
  const compressed = await compressVideoFileForStorage(original, onProgress, { targetBytes })

  if (compressed.size >= original.size * 0.98 && compressed.size > targetBytes) {
    throw new Error(
      `No se pudo reducir "${original.name}" por debajo de ~${(targetBytes / (1024 * 1024)).toFixed(1)} MB.`
    )
  }

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

  const body =
    file.type === mime ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified })
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
 * Sube al bucket raw-videos-v2: primero el archivo original; si Storage rechaza por tamaño, comprime y reintenta.
 * Si el clip supera VIDEO_SHOTSTACK_PRE_COMPRESS_ABOVE_BYTES (~32 MB), lo comprime ANTES de subir para
 * evitar que Shotstack falle con "Downloading assets failed" al intentar descargar archivos muy grandes.
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
  let uploadFile = fileWithResolvedVideoMime(file)
  let compressionAttempted = false

  // Compresión proactiva client-side desactivada: el PASO 2.5 en CreateReelModal.tsx
  // delega la compresión al backend NestJS después del upload, y transcode:true en
  // Shotstack re-codifica los clips en sus servidores. El WASM se colgaba en navegación
  // SPA por falta de SharedArrayBuffer (COOP/COEP no se re-aplican sin recarga completa).
  const SKIP_CLIENT_COMPRESSION = true
  if (!SKIP_CLIENT_COMPRESSION && file.size > VIDEO_SHOTSTACK_PRE_COMPRESS_ABOVE_BYTES) {
    const originalMb = (file.size / (1024 * 1024)).toFixed(0)
    onProgress?.(
      `Clip grande (~${originalMb} MB): comprimiendo antes de subir para que el renderizador lo procese correctamente…`
    )
    try {
      const { compressVideoFileForStorage } = await import('@/lib/videos/compress-video-client')
      const compressed = await compressVideoFileForStorage(uploadFile, onProgress, {
        targetBytes: VIDEO_SHOTSTACK_PRE_COMPRESS_TARGET_BYTES,
      })
      if (compressed.size < uploadFile.size) {
        uploadFile = fileWithResolvedVideoMime(compressed)
        onProgress?.(
          `Comprimido: ${file.name} → ${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB (original ${originalMb} MB)`
        )
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      onProgress?.(
        `Compresión no disponible (${detail.slice(0, 80)}); subiendo original (puede fallar en el renderizador)…`
      )
    }
    compressionAttempted = true
  }

  onProgress?.(`Subiendo ${uploadFile.name}…`)
  let signed = await uploadClipViaSignedUrl(supabase, path, token, uploadFile)
  if (signed.ok) return

  if (isLikelyStorageSizeError(signed.message, signed.status) && !compressionAttempted) {
    compressionAttempted = true
    onProgress?.('Storage rechazó el tamaño; comprimiendo en el navegador…')

    try {
      uploadFile = await compressAfterStorageRejection(file, onProgress)
    } catch (err) {
      throw new Error(formatVideoClipUploadError(file, extractErrorMessage(err), 413))
    }

    onProgress?.(
      `Reintentando subida de ${uploadFile.name} (${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB)…`
    )
    signed = await uploadClipViaSignedUrl(supabase, path, token, uploadFile)
    if (signed.ok) return

    if (isLikelyStorageSizeError(signed.message, signed.status)) {
      onProgress?.(`Reintentando ${uploadFile.name} vía servidor…`)
      const proxy = await uploadClipViaApiProxy(jobId, path, uploadFile)
      if (proxy.ok) return
      throw new Error(formatVideoClipUploadError(file, proxy.message, proxy.status, uploadFile.size))
    }
  }

  throw new Error(formatVideoClipUploadError(file, signed.message, signed.status, uploadFile.size))
}
