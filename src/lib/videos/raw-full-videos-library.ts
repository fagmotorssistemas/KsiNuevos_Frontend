import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import {
  buildJobNameFromInventory,
  formatBytes,
  resolveJobVehicleLabel,
} from '@/lib/videos/resolve-job-vehicle'
import {
  RAW_FULL_CAPTION_FORMATOS,
  getRawFullFormatoMeta,
  isRawFullCaptionFormato,
  type RawFullCaptionFormato,
} from '@/lib/videos/raw-full-caption-templates'
import {
  RAW_FULL_VIDEOS_BUCKET,
  RAW_FULL_VIDEOS_MAX_PER_FOLDER,
  type RawFullVideoFolderSummary,
  type RawFullVideoInventorySnippet,
  type RawFullVideoItem,
  type RawFullVideoLibraryStats,
} from '@/lib/videos/raw-full-videos-types'

export type {
  RawFullVideoFolderSummary,
  RawFullVideoInventorySnippet,
  RawFullVideoItem,
  RawFullVideoLibraryStats,
} from '@/lib/videos/raw-full-videos-types'

export { RAW_FULL_VIDEOS_BUCKET, RAW_FULL_VIDEOS_MAX_PER_FOLDER, RAW_FULL_VIDEOS_MAX_BYTES } from '@/lib/videos/raw-full-videos-types'

const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v)$/i

type FolderRow = {
  id: string
  inventory_vehicle_id: string | null
  inventory_vehicle_id_2: string | null
  formato: string | null
  caption: string | null
  folder_name: string | null
  video_paths: string[] | null
  created_at: string
  updated_at: string
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function foldersDb(supabase: SupabaseClient<Database>) {
  // Tabla nueva: aún no está en types generados de Supabase.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('raw_full_video_folders')
}

function isVideoPath(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  return VIDEO_EXT.test(base)
}

export function sanitizeFullVideoFilename(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() || 'video.mp4'
  const dot = base.lastIndexOf('.')
  const extRaw = dot >= 0 ? base.slice(dot).toLowerCase() : ''
  const stem = dot >= 0 ? base.slice(0, dot) : base
  const ext = /^\.[a-z0-9]{1,8}$/.test(extRaw) ? extRaw : '.mp4'
  const slug =
    stem
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'video'
  return `${slug}${ext}`
}

export async function getSignedUrlForFullRawPath(path: string): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.storage
    .from(RAW_FULL_VIDEOS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'No se pudo firmar URL del video')
  }
  return data.signedUrl
}

async function fetchInventoryMap(ids: string[]): Promise<Map<string, RawFullVideoInventorySnippet>> {
  const map = new Map<string, RawFullVideoInventorySnippet>()
  if (!ids.length) return map
  const supabase = getServiceClient()
  const unique = [...new Set(ids)]
  for (let i = 0; i < unique.length; i += 80) {
    const slice = unique.slice(i, i + 80)
    const { data } = await supabase
      .from('inventoryoracle')
      .select('id, brand, model, year, plate, status')
      .in('id', slice)
    for (const row of data ?? []) {
      map.set(row.id, {
        id: row.id,
        brand: row.brand,
        model: row.model,
        year: row.year,
        plate: row.plate,
        status: row.status,
      })
    }
  }
  return map
}

async function listStorageForFolder(folderId: string): Promise<
  Array<{ path: string; sizeBytes: number; createdAt: string | null; updatedAt: string | null }>
> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.storage.from(RAW_FULL_VIDEOS_BUCKET).list(folderId, {
    limit: 200,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) {
    console.error('[raw-full-videos] storage.list', folderId, error.message)
    return []
  }
  return (data ?? [])
    .filter((f) => f.id != null && f.name && isVideoPath(f.name))
    .map((f) => {
      const row = f as { metadata?: { size?: number }; size?: number }
      const size =
        (typeof row.size === 'number' && row.size > 0
          ? row.size
          : typeof row.metadata?.size === 'number'
            ? row.metadata.size
            : 0) || 0
      return {
        path: `${folderId}/${f.name}`,
        sizeBytes: size,
        createdAt: f.created_at ?? null,
        updatedAt: f.updated_at ?? null,
      }
    })
}

function toSummary(
  row: FolderRow,
  inv: RawFullVideoInventorySnippet | null,
  bytes: number,
  videoCount: number
): RawFullVideoFolderSummary {
  if (inv) {
    const label = resolveJobVehicleLabel(
      {
        id: row.id,
        job_name: row.folder_name,
        vehicle_line_1: null,
        vehicle_line_2: null,
        vehicle_line_4: null,
        inventory_vehicle_id: row.inventory_vehicle_id,
        selected_clips: null,
        video_script_id: null,
        created_at: row.created_at,
      },
      {
        id: inv.id,
        brand: inv.brand,
        model: inv.model,
        year: inv.year,
        plate: inv.plate,
        status: inv.status,
      }
    )
    return {
      id: row.id,
      title: label.title,
      subtitle: [
        getRawFullFormatoMeta(row.formato)?.label,
        label.subtitle,
      ]
        .filter(Boolean)
        .join(' · ') || null,
      inventoryVehicleId: row.inventory_vehicle_id,
      inventoryVehicleId2: row.inventory_vehicle_id_2,
      formato: row.formato,
      caption: row.caption,
      inventory: inv,
      folderName: row.folder_name,
      videoCount,
      totalBytes: bytes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  const customTitle = row.folder_name?.trim() || 'Video sin título'
  const formatoLabel = getRawFullFormatoMeta(row.formato)?.label
  return {
    id: row.id,
    title: customTitle,
    subtitle: formatoLabel
      ? `${formatoLabel}${row.inventory_vehicle_id ? '' : ' · sin vehículo'}`
      : row.inventory_vehicle_id
        ? null
        : 'Sin vehículo · título libre',
    inventoryVehicleId: row.inventory_vehicle_id,
    inventoryVehicleId2: row.inventory_vehicle_id_2,
    formato: row.formato,
    caption: row.caption,
    inventory: null,
    folderName: row.folder_name,
    videoCount,
    totalBytes: bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchRawFullVideoLibrary(opts: {
  q?: string
  page?: number
  pageSize?: number
  inventoryVehicleId?: string
}): Promise<{
  folders: RawFullVideoFolderSummary[]
  stats: RawFullVideoLibraryStats
  page: number
  pageSize: number
  total: number
}> {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, opts.pageSize ?? 24))
  const supabase = getServiceClient()

  let query = foldersDb(supabase)
    .select('id, inventory_vehicle_id, inventory_vehicle_id_2, formato, caption, folder_name, video_paths, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (opts.inventoryVehicleId?.trim()) {
    query = query.eq('inventory_vehicle_id', opts.inventoryVehicleId.trim())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []) as FolderRow[]
  const q = opts.q?.trim().toLowerCase()
  if (q) {
    const invIds = rows.map((r) => r.inventory_vehicle_id).filter((id): id is string => !!id)
    const invMap = await fetchInventoryMap(invIds)
    rows = rows.filter((r) => {
      const inv = r.inventory_vehicle_id ? invMap.get(r.inventory_vehicle_id) : undefined
      const hay = [
        r.folder_name,
        r.formato,
        inv?.brand,
        inv?.model,
        inv?.plate,
        String(inv?.year ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }

  // Más recientes primero (día de subida)
  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const total = rows.length
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const invMap = await fetchInventoryMap(
    pageRows.map((r) => r.inventory_vehicle_id).filter((id): id is string => !!id)
  )

  const folders: RawFullVideoFolderSummary[] = []
  let totalVideos = 0
  let totalBytes = 0

  for (const row of pageRows) {
    const storage = await listStorageForFolder(row.id)
    const paths = (row.video_paths ?? []).filter(isVideoPath)
    const videoCount = Math.max(paths.length, storage.length)
    const bytes = storage.reduce((s, x) => s + x.sizeBytes, 0)
    totalVideos += videoCount
    totalBytes += bytes
    const inv = row.inventory_vehicle_id ? invMap.get(row.inventory_vehicle_id) ?? null : null
    folders.push(toSummary(row, inv, bytes, videoCount))
  }

  // Stats globales ligeras (paths en DB)
  const allPathsCount = rows.reduce((n, r) => n + (r.video_paths ?? []).filter(isVideoPath).length, 0)

  return {
    folders,
    stats: {
      totalFolders: total,
      totalVideos: allPathsCount || totalVideos,
      totalBytes,
    },
    page,
    pageSize,
    total,
  }
}

export async function fetchRawFullVideoFolderDetail(folderId: string): Promise<{
  folder: RawFullVideoFolderSummary
  videos: RawFullVideoItem[]
} | null> {
  const supabase = getServiceClient()
  const { data, error } = await foldersDb(supabase)
    .select('id, inventory_vehicle_id, inventory_vehicle_id_2, formato, caption, folder_name, video_paths, created_at, updated_at')
    .eq('id', folderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as FolderRow
  const invMap = await fetchInventoryMap(
    row.inventory_vehicle_id ? [row.inventory_vehicle_id] : []
  )
  const storage = await listStorageForFolder(folderId)
  const storageByPath = new Map(storage.map((s) => [s.path, s]))
  const paths = (row.video_paths ?? []).filter(isVideoPath)
  const pathSet = new Set(paths)
  for (const s of storage) {
    if (!pathSet.has(s.path)) paths.push(s.path)
  }

  const videos: RawFullVideoItem[] = []
  for (const path of paths) {
    const meta = storageByPath.get(path)
    let signedUrl = ''
    try {
      signedUrl = await getSignedUrlForFullRawPath(path)
    } catch (e) {
      console.warn('[raw-full-videos] signed url', path, e)
    }
    videos.push({
      path,
      name: path.split('/').pop() ?? path,
      signedUrl,
      sizeBytes: meta?.sizeBytes ?? 0,
      createdAt: meta?.createdAt ?? null,
    })
  }

  videos.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })

  const bytes = videos.reduce((s, v) => s + v.sizeBytes, 0)
  const inv = row.inventory_vehicle_id ? invMap.get(row.inventory_vehicle_id) ?? null : null
  return {
    folder: toSummary(row, inv, bytes, videos.length),
    videos,
  }
}

export async function createRawFullVideoFolder(opts: {
  inventoryVehicleId?: string | null
  inventoryVehicleId2?: string | null
  formato?: string | null
  title?: string | null
  caption?: string | null
  files: Array<{ filename: string }>
}): Promise<{
  folderId: string
  uploads: Array<{ path: string; signedUrl: string; token: string }>
}> {
  const inventoryVehicleId = opts.inventoryVehicleId?.trim() || ''
  const inventoryVehicleId2 = opts.inventoryVehicleId2?.trim() || ''
  const customTitle = opts.title?.trim() || ''
  const formatoRaw = opts.formato?.trim() || ''
  const files = opts.files

  if (!formatoRaw || !isRawFullCaptionFormato(formatoRaw)) {
    throw new Error(
      'Selecciona el formato del video (Autos, Educativo, Entretenimiento o Humanizar)'
    )
  }
  const formato: RawFullCaptionFormato = formatoRaw
  const meta = RAW_FULL_CAPTION_FORMATOS.find((f) => f.id === formato) ?? {
    id: formato,
    label: formato,
    vehiclesRequired: 0 as const,
    vehiclesAllowed: 0 as const,
    hint: '',
    dotClass: 'bg-slate-400',
  }

  if (meta.vehiclesRequired >= 1 && !inventoryVehicleId) {
    throw new Error('Selecciona el vehículo del inventario')
  }
  if (meta.vehiclesRequired >= 2 && !inventoryVehicleId2) {
    throw new Error('Debes seleccionar dos vehículos')
  }
  if (
    meta.vehiclesAllowed >= 2 &&
    inventoryVehicleId &&
    inventoryVehicleId2 &&
    inventoryVehicleId === inventoryVehicleId2
  ) {
    throw new Error('Los dos vehículos deben ser distintos')
  }
  if (!files.length) throw new Error('Selecciona al menos un video')
  if (files.length > RAW_FULL_VIDEOS_MAX_PER_FOLDER) {
    throw new Error(`Máximo ${RAW_FULL_VIDEOS_MAX_PER_FOLDER} videos por carpeta`)
  }

  const supabase = getServiceClient()
  let folderName = customTitle || meta.label
  let vehicleIdToSave: string | null =
    meta.vehiclesAllowed >= 1 && inventoryVehicleId ? inventoryVehicleId : null
  let vehicleId2ToSave: string | null =
    meta.vehiclesAllowed >= 2 && inventoryVehicleId2 ? inventoryVehicleId2 : null

  if (inventoryVehicleId) {
    const { data: invRow, error: invError } = await supabase
      .from('inventoryoracle')
      .select('id, brand, model, year')
      .eq('id', inventoryVehicleId)
      .maybeSingle()

    if (invError || !invRow) throw new Error('Vehículo no encontrado en inventario')

    folderName =
      customTitle ||
      buildJobNameFromInventory(String(invRow.brand ?? ''), String(invRow.model ?? ''), invRow.year) ||
      meta.label
  }

  if (vehicleId2ToSave) {
    const { data: inv2, error: inv2Err } = await supabase
      .from('inventoryoracle')
      .select('id')
      .eq('id', vehicleId2ToSave)
      .maybeSingle()
    if (inv2Err || !inv2) throw new Error('Segundo vehículo no encontrado en inventario')
  }

  const { data: folder, error: insertError } = await foldersDb(supabase)
    .insert({
      inventory_vehicle_id: vehicleIdToSave,
      inventory_vehicle_id_2: vehicleId2ToSave,
      formato,
      caption: opts.caption?.trim() || null,
      folder_name: folderName || null,
      video_paths: [],
    })
    .select('id')
    .single()

  if (insertError || !folder) {
    throw new Error(`Error creando carpeta: ${insertError?.message ?? 'desconocido'}`)
  }

  const folderId = (folder as { id: string }).id
  const uploads: Array<{ path: string; signedUrl: string; token: string }> = []

  for (let i = 0; i < files.length; i++) {
    const safeFilename = sanitizeFullVideoFilename(files[i]!.filename)
    const timestamp = Date.now() + i
    const path = `${folderId}/video_${i}_${timestamp}_${safeFilename}`

    const { data: signedData, error: signedError } = await supabase.storage
      .from(RAW_FULL_VIDEOS_BUCKET)
      .createSignedUploadUrl(path)

    if (signedError || !signedData) {
      await foldersDb(supabase).delete().eq('id', folderId)
      throw new Error(
        `Error generando URL de upload para ${files[i]!.filename}: ${signedError?.message}`
      )
    }

    uploads.push({
      path,
      signedUrl: signedData.signedUrl,
      token: signedData.token,
    })
  }

  return { folderId, uploads }
}

export async function updateRawFullFolderCaption(folderId: string, caption: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await foldersDb(supabase)
    .update({ caption: caption.trim(), updated_at: new Date().toISOString() })
    .eq('id', folderId)
  if (error) throw new Error(error.message)
}

export async function prepareAppendRawFullVideos(
  folderId: string,
  files: Array<{ filename: string }>
): Promise<{ uploads: Array<{ path: string; signedUrl: string; token: string }> }> {
  if (!files.length) throw new Error('Selecciona al menos un video')

  const supabase = getServiceClient()
  const { data, error } = await foldersDb(supabase)
    .select('id, video_paths')
    .eq('id', folderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Carpeta no encontrada')

  const row = data as { id: string; video_paths: string[] | null }
  const existing = (row.video_paths ?? []).filter(isVideoPath)
  if (existing.length + files.length > RAW_FULL_VIDEOS_MAX_PER_FOLDER) {
    throw new Error(
      `Máximo ${RAW_FULL_VIDEOS_MAX_PER_FOLDER} videos por carpeta (ya hay ${existing.length})`
    )
  }

  const startIndex = existing.length
  const uploads: Array<{ path: string; signedUrl: string; token: string }> = []

  for (let i = 0; i < files.length; i++) {
    const safeFilename = sanitizeFullVideoFilename(files[i]!.filename)
    const timestamp = Date.now() + i
    const path = `${folderId}/video_${startIndex + i}_${timestamp}_${safeFilename}`
    const { data: signedData, error: signedError } = await supabase.storage
      .from(RAW_FULL_VIDEOS_BUCKET)
      .createSignedUploadUrl(path)

    if (signedError || !signedData) {
      throw new Error(
        `Error generando URL de upload para ${files[i]!.filename}: ${signedError?.message}`
      )
    }
    uploads.push({ path, signedUrl: signedData.signedUrl, token: signedData.token })
  }

  return { uploads }
}

export async function completeRawFullVideoUpload(opts: {
  folderId: string
  paths: string[]
  append?: boolean
}): Promise<{ videoCount: number }> {
  const folderId = opts.folderId.trim()
  const paths = opts.paths.map((p) => p.trim()).filter(Boolean)
  if (!folderId) throw new Error('folderId es requerido')
  if (!paths.length) throw new Error('paths es requerido')

  for (const p of paths) {
    if (!p.startsWith(`${folderId}/`)) throw new Error(`Ruta inválida: ${p}`)
    if (!isVideoPath(p)) throw new Error(`No es un video: ${p}`)
  }

  const supabase = getServiceClient()
  const { data, error } = await foldersDb(supabase)
    .select('id, video_paths')
    .eq('id', folderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Carpeta no encontrada')

  const row = data as { id: string; video_paths: string[] | null }
  const next = opts.append
    ? [...(row.video_paths ?? []).filter(isVideoPath), ...paths]
    : paths

  if (next.length > RAW_FULL_VIDEOS_MAX_PER_FOLDER) {
    throw new Error(`Máximo ${RAW_FULL_VIDEOS_MAX_PER_FOLDER} videos por carpeta`)
  }

  const { error: updErr } = await foldersDb(supabase)
    .update({ video_paths: next, updated_at: new Date().toISOString() })
    .eq('id', folderId)

  if (updErr) throw new Error(updErr.message)
  return { videoCount: next.length }
}

export async function deleteRawFullVideo(
  folderId: string,
  path: string
): Promise<{ videoCount: number; folderDeleted: boolean }> {
  const p = path.trim()
  if (!p.startsWith(`${folderId}/`)) throw new Error('Ruta de video inválida')
  if (!isVideoPath(p)) throw new Error('No es un video')

  const supabase = getServiceClient()
  const { data, error } = await foldersDb(supabase)
    .select('id, video_paths')
    .eq('id', folderId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Carpeta no encontrada')

  const row = data as { id: string; video_paths: string[] | null }
  const next = (row.video_paths ?? []).filter((x) => x !== p)
  if (next.length === (row.video_paths ?? []).length) {
    throw new Error('Video no encontrado en esta carpeta')
  }

  await supabase.storage.from(RAW_FULL_VIDEOS_BUCKET).remove([p])

  if (next.length === 0) {
    await foldersDb(supabase).delete().eq('id', folderId)
    // limpia restos de storage
    const leftover = await listStorageForFolder(folderId)
    if (leftover.length) {
      await supabase.storage.from(RAW_FULL_VIDEOS_BUCKET).remove(leftover.map((x) => x.path))
    }
    return { videoCount: 0, folderDeleted: true }
  }

  const { error: updErr } = await foldersDb(supabase)
    .update({ video_paths: next, updated_at: new Date().toISOString() })
    .eq('id', folderId)
  if (updErr) throw new Error(updErr.message)
  return { videoCount: next.length, folderDeleted: false }
}

export async function deleteRawFullVideoFolder(folderId: string): Promise<void> {
  const supabase = getServiceClient()
  const { data, error } = await foldersDb(supabase)
    .select('id, video_paths')
    .eq('id', folderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Carpeta no encontrada')

  const row = data as { id: string; video_paths: string[] | null }
  const paths = [...new Set([...(row.video_paths ?? []), ...(await listStorageForFolder(folderId)).map((x) => x.path)])]
  if (paths.length) {
    await supabase.storage.from(RAW_FULL_VIDEOS_BUCKET).remove(paths)
  }
  const { error: delErr } = await foldersDb(supabase).delete().eq('id', folderId)
  if (delErr) throw new Error(delErr.message)
}

export { formatBytes }
