import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  completeRawFullVideoUpload,
  createRawFullVideoFolder,
  deleteRawFullVideoFolder,
  sanitizeFullVideoFilename,
} from '@/lib/videos/raw-full-videos-library'
import { RAW_FULL_VIDEOS_BUCKET } from '@/lib/videos/raw-full-videos-types'
import {
  MARKETING_INBOX_VIDEOS_BUCKET,
  MARKETING_INBOX_VIDEOS_MAX_PER_BATCH,
  type MarketingInboxVideoItem,
} from '@/lib/videos/marketing-inbox-videos-types'

export type { MarketingInboxVideoItem } from '@/lib/videos/marketing-inbox-videos-types'
export {
  MARKETING_INBOX_VIDEOS_BUCKET,
  MARKETING_INBOX_VIDEOS_MAX_BYTES,
  MARKETING_INBOX_VIDEOS_MAX_PER_BATCH,
} from '@/lib/videos/marketing-inbox-videos-types'

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)$/i

type InboxRow = {
  id: string
  storage_path: string
  original_filename: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by: string | null
  created_at: string
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function inboxDb(supabase: SupabaseClient<Database>) {
  // Tabla nueva: aún no está en types generados de Supabase.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('marketing_inbox_videos')
}

function isVideoFilename(name: string): boolean {
  return VIDEO_EXT.test(name)
}

export async function prepareInboxVideoUploads(opts: {
  userId: string
  files: Array<{ filename: string }>
}): Promise<{ uploads: Array<{ path: string; token: string; originalFilename: string }> }> {
  const files = opts.files.filter((f) => f.filename.trim())
  if (!files.length) throw new Error('Selecciona al menos un video')
  if (files.length > MARKETING_INBOX_VIDEOS_MAX_PER_BATCH) {
    throw new Error(`Máximo ${MARKETING_INBOX_VIDEOS_MAX_PER_BATCH} videos por lote`)
  }

  const supabase = getServiceClient()
  const uploads: Array<{ path: string; token: string; originalFilename: string }> = []

  for (let i = 0; i < files.length; i++) {
    const originalFilename = files[i]!.filename.trim()
    if (!isVideoFilename(originalFilename)) {
      throw new Error(`No es un video: ${originalFilename}`)
    }
    const safe = sanitizeFullVideoFilename(originalFilename)
    const path = `${opts.userId}/${Date.now() + i}_${crypto.randomUUID()}_${safe}`

    const { data: signedData, error: signedError } = await supabase.storage
      .from(MARKETING_INBOX_VIDEOS_BUCKET)
      .createSignedUploadUrl(path)

    if (signedError || !signedData) {
      throw new Error(
        `Error generando URL de upload para ${originalFilename}: ${signedError?.message ?? 'desconocido'}`
      )
    }

    uploads.push({
      path,
      token: signedData.token,
      originalFilename,
    })
  }

  return { uploads }
}

export async function completeInboxVideoUploads(opts: {
  userId: string
  items: Array<{ path: string; originalFilename: string; mimeType?: string | null; sizeBytes?: number | null }>
}): Promise<{ count: number }> {
  const items = opts.items.filter((x) => x.path.trim() && x.originalFilename.trim())
  if (!items.length) throw new Error('items es requerido')

  const prefix = `${opts.userId}/`
  for (const item of items) {
    if (!item.path.startsWith(prefix)) throw new Error(`Ruta inválida: ${item.path}`)
    if (!isVideoFilename(item.originalFilename) && !isVideoFilename(item.path)) {
      throw new Error(`No es un video: ${item.originalFilename}`)
    }
  }

  const supabase = getServiceClient()
  const rows = items.map((item) => ({
    storage_path: item.path,
    original_filename: item.originalFilename.trim(),
    mime_type: item.mimeType?.trim() || null,
    size_bytes: typeof item.sizeBytes === 'number' && item.sizeBytes >= 0 ? item.sizeBytes : null,
    uploaded_by: opts.userId,
  }))

  const { error } = await inboxDb(supabase).insert(rows)
  if (error) throw new Error(error.message)
  return { count: rows.length }
}

export async function listInboxVideos(): Promise<{ videos: MarketingInboxVideoItem[]; total: number }> {
  const supabase = getServiceClient()
  const { data, error } = await inboxDb(supabase)
    .select('id, storage_path, original_filename, mime_type, size_bytes, uploaded_by, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as InboxRow[]
  const videos: MarketingInboxVideoItem[] = []

  for (const row of rows) {
    let signedUrl = ''
    const { data: signed, error: signedErr } = await supabase.storage
      .from(MARKETING_INBOX_VIDEOS_BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60 * 12)
    if (!signedErr && signed?.signedUrl) signedUrl = signed.signedUrl

    videos.push({
      id: row.id,
      storagePath: row.storage_path,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      uploadedBy: row.uploaded_by,
      signedUrl,
      createdAt: row.created_at,
    })
  }

  return { videos, total: videos.length }
}

export async function deleteInboxVideo(id: string): Promise<void> {
  const supabase = getServiceClient()
  const { data, error } = await inboxDb(supabase)
    .select('id, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Video no encontrado en la bandeja')

  const row = data as { id: string; storage_path: string }
  await supabase.storage.from(MARKETING_INBOX_VIDEOS_BUCKET).remove([row.storage_path])
  const { error: delErr } = await inboxDb(supabase).delete().eq('id', id)
  if (delErr) throw new Error(delErr.message)
}

export async function assignInboxVideo(opts: {
  id: string
  formato: string
  inventoryVehicleId?: string | null
  inventoryVehicleId2?: string | null
  caption?: string | null
}): Promise<{ folderId: string }> {
  const supabase = getServiceClient()
  const { data, error } = await inboxDb(supabase)
    .select('id, storage_path, original_filename')
    .eq('id', opts.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Video no encontrado en la bandeja')

  const row = data as { id: string; storage_path: string; original_filename: string }

  const created = await createRawFullVideoFolder({
    formato: opts.formato,
    inventoryVehicleId: opts.inventoryVehicleId ?? null,
    inventoryVehicleId2: opts.inventoryVehicleId2 ?? null,
    caption: opts.caption ?? null,
    files: [{ filename: row.original_filename }],
  })

  const destPath = created.uploads[0]?.path
  if (!destPath) {
    await deleteRawFullVideoFolder(created.folderId).catch(() => undefined)
    throw new Error('No se pudo preparar la carpeta de destino')
  }

  const { error: copyErr } = await supabase.storage
    .from(MARKETING_INBOX_VIDEOS_BUCKET)
    .copy(row.storage_path, destPath, { destinationBucket: RAW_FULL_VIDEOS_BUCKET })

  if (copyErr) {
    await deleteRawFullVideoFolder(created.folderId).catch(() => undefined)
    throw new Error(`No se pudo copiar el video a la biblioteca: ${copyErr.message}`)
  }

  try {
    await completeRawFullVideoUpload({ folderId: created.folderId, paths: [destPath] })
  } catch (completeErr) {
    await deleteRawFullVideoFolder(created.folderId).catch(() => undefined)
    throw completeErr
  }

  await supabase.storage.from(MARKETING_INBOX_VIDEOS_BUCKET).remove([row.storage_path])
  const { error: delErr } = await inboxDb(supabase).delete().eq('id', row.id)
  if (delErr) {
    console.warn('[marketing-inbox] asignado pero no se pudo borrar la fila', delErr.message)
  }

  return { folderId: created.folderId }
}
