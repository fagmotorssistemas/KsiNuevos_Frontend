import { randomBytes } from 'crypto'
import type { Json } from '@/types/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'

export type VehicleCreativeStatus = 'pending' | 'generating' | 'ready' | 'failed' | string

export type VehicleCreativeItem = {
  id: string
  vehicleId: string
  creativeKind: string
  variant: string
  status: VehicleCreativeStatus
  errorMessage: string | null
  imageUrl: string | null
  images: string[]
  createdAt: string
  updatedAt: string
  kindLabel: string
  variantLabel: string
}

const KIND_LABELS: Record<string, string> = {
  thematic: 'Poster temático',
  low_leads: 'Carrusel menos leads',
  'low-leads': 'Carrusel menos leads',
  upload: 'Imagen cargada',
}

const VARIANT_LABELS: Record<string, string> = {
  suv: 'SUV',
  sedan: 'Sedán',
  pickup: 'Pickup',
  s1: 'Slide 1',
  s2: 'Slide 2',
  s3: 'Slide 3',
}

function asUrlList(value: Json | null | undefined): string[] {
  if (!value) return []
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object' && 'url' in item) {
          const url = (item as { url?: unknown }).url
          return typeof url === 'string' ? url.trim() : ''
        }
        return ''
      })
      .filter(Boolean)
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .flatMap((item) => asUrlList(item as Json))
      .filter(Boolean)
  }
  return []
}

function uniqueUrls(...groups: Array<string | null | undefined | string[]>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const group of groups) {
    const list = Array.isArray(group) ? group : group ? [group] : []
    for (const url of list) {
      const trimmed = url.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      out.push(trimmed)
    }
  }
  return out
}

export function labelCreativeKind(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/[_-]+/g, ' ')
}

export function labelCreativeVariant(variant: string): string {
  const key = variant.toLowerCase()
  if (VARIANT_LABELS[key]) return VARIANT_LABELS[key]
  if (key.startsWith('upload-')) return 'Manual'
  return variant
}

type CreativeRow = {
  id: string
  vehicle_id: string
  creative_kind: string
  variant: string
  status: string
  error_message: string | null
  image_url: string | null
  image_urls: Json | null
  created_at: string
  updated_at: string
}

function mapCreativeRow(row: CreativeRow): VehicleCreativeItem {
  const images = uniqueUrls(row.image_url, asUrlList(row.image_urls))
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    creativeKind: row.creative_kind,
    variant: row.variant,
    status: row.status,
    errorMessage: row.error_message,
    imageUrl: row.image_url ?? images[0] ?? null,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    kindLabel: labelCreativeKind(row.creative_kind),
    variantLabel: labelCreativeVariant(row.variant),
  }
}

const CREATIVE_SELECT =
  'id, vehicle_id, creative_kind, variant, status, error_message, image_url, image_urls, created_at, updated_at'

export async function fetchVehicleCreatives(vehicleId: string): Promise<VehicleCreativeItem[]> {
  const id = vehicleId.trim()
  if (!id) return []

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('inventory_vehicle_creatives')
    .select(CREATIVE_SELECT)
    .eq('vehicle_id', id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapCreativeRow)
}

export async function fetchVehicleCreativeById(creativeId: string): Promise<VehicleCreativeItem | null> {
  const id = creativeId.trim()
  if (!id) return null

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('inventory_vehicle_creatives')
    .select(CREATIVE_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapCreativeRow(data) : null
}

const CREATIVES_FETCH_BATCH = 1000

/** Conteo de imágenes reales de Galería IA por vehículo (ignora creativos sin URL). */
export async function fetchAiGalleryImageCounts(): Promise<Map<string, number>> {
  const supabase = createServiceRoleClient()
  const counts = new Map<string, number>()
  let offset = 0

  for (;;) {
    const { data, error } = await supabase
      .from('inventory_vehicle_creatives')
      .select('vehicle_id, image_url, image_urls')
      .range(offset, offset + CREATIVES_FETCH_BATCH - 1)

    if (error) throw new Error(error.message)

    const rows = data ?? []
    for (const row of rows) {
      const n = uniqueUrls(row.image_url, asUrlList(row.image_urls)).length
      if (n === 0) continue
      counts.set(row.vehicle_id, (counts.get(row.vehicle_id) ?? 0) + n)
    }

    if (rows.length < CREATIVES_FETCH_BATCH) break
    offset += CREATIVES_FETCH_BATCH
    if (offset > 50000) break
  }

  return counts
}

const HERO_CREATIVE_LIMIT = 80
const HERO_CREATIVE_MAX_BLOCKS = 20

const VARIANT_ORDER: Record<string, number> = {
  s1: 1,
  s2: 2,
  s3: 3,
}

export type HeroCreativeBlock = {
  id: string
  kind: string
  images: string[]
}

export async function fetchReadyCreativeBlocks(): Promise<HeroCreativeBlock[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('inventory_vehicle_creatives')
    .select('id, vehicle_id, creative_kind, variant, image_url, image_urls, status, created_at')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(HERO_CREATIVE_LIMIT)

  if (error) throw new Error(error.message)

  const grouped = new Map<
    string,
    { kind: string; createdAt: string; parts: Array<{ order: number; urls: string[] }> }
  >()

  for (const row of data ?? []) {
    const urls = uniqueUrls(row.image_url, asUrlList(row.image_urls))
    if (urls.length === 0) continue

    const key = `${row.vehicle_id}:${row.creative_kind}`
    const order = VARIANT_ORDER[row.variant.toLowerCase()] ?? 50
    const current = grouped.get(key)

    if (!current) {
      grouped.set(key, {
        kind: row.creative_kind,
        createdAt: row.created_at,
        parts: [{ order, urls }],
      })
    } else {
      current.parts.push({ order, urls })
    }
  }

  const blocks: HeroCreativeBlock[] = [...grouped.entries()].map(([id, group]) => {
    const images = uniqueUrls(
      ...group.parts
        .sort((a, b) => a.order - b.order)
        .map((part) => part.urls)
    )
    return { id, kind: group.kind, images }
  })

  return blocks.filter((block) => block.images.length > 0).slice(0, HERO_CREATIVE_MAX_BLOCKS)
}

export function creativeDownloadFilename(creative: VehicleCreativeItem, imageIndex = 0): string {
  const kind = creative.kindLabel.replace(/\s+/g, '-').toLowerCase()
  const variant = creative.variantLabel.replace(/\s+/g, '-').toLowerCase()
  const suffix = creative.images.length > 1 ? `-${imageIndex + 1}` : ''
  const ext = (creative.images[imageIndex] ?? creative.imageUrl ?? '').split('?')[0]?.match(/\.(png|jpe?g|webp)$/i)?.[1] ?? 'png'
  return `${kind}-${variant}${suffix}.${ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase()}`
}

export const CREATIVE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024
export const CREATIVE_UPLOAD_MAX_FILES = 12
export const CREATIVE_UPLOAD_KIND = 'upload'

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function creativesStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'plantillas-campaigns'
}

function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function resolveCreativeUploadMimeType(file: File): string | null {
  const t = (file.type || '').trim().toLowerCase()
  if (ALLOWED_UPLOAD_TYPES.has(t)) return t === 'image/jpg' ? 'image/jpeg' : t
  if (t === 'application/octet-stream' || t === '') {
    return EXT_TO_MIME[extensionFromFilename(file.name)] ?? null
  }
  return null
}

function extFromMime(mimeType: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  return '.jpg'
}

export type ManualCreativeUploadFile = {
  buffer: Buffer
  filename: string
  mimeType: string
}

export async function uploadManualVehicleCreatives(
  vehicleId: string,
  files: ManualCreativeUploadFile[]
): Promise<VehicleCreativeItem[]> {
  const id = vehicleId.trim()
  if (!id) throw new Error('Falta vehicleId')
  if (files.length === 0) throw new Error('No hay archivos para subir')
  if (files.length > CREATIVE_UPLOAD_MAX_FILES) {
    throw new Error(`Puedes subir hasta ${CREATIVE_UPLOAD_MAX_FILES} imágenes a la vez`)
  }

  const supabase = createServiceRoleClient()
  const { data: vehicle, error: vehicleErr } = await supabase
    .from('inventoryoracle')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (vehicleErr) throw new Error(vehicleErr.message)
  if (!vehicle) throw new Error('Vehículo no encontrado')

  const bucket = creativesStorageBucket()
  const created: VehicleCreativeItem[] = []

  for (const file of files) {
    if (file.buffer.byteLength === 0) throw new Error(`El archivo ${file.filename || 'imagen'} está vacío`)
    if (file.buffer.byteLength > CREATIVE_UPLOAD_MAX_BYTES) {
      throw new Error(
        `${file.filename || 'Una imagen'} supera el límite de ${Math.round(CREATIVE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`
      )
    }

    const token = randomBytes(6).toString('hex')
    const path = `inventory-creatives/${id}/${Date.now()}-${token}${extFromMime(file.mimeType)}`
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    })
    if (upErr) throw new Error(upErr.message)

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    const url = pub.publicUrl

    const { data: row, error: insErr } = await supabase
      .from('inventory_vehicle_creatives')
      .insert({
        vehicle_id: id,
        creative_kind: CREATIVE_UPLOAD_KIND,
        variant: `upload-${token}`,
        status: 'ready',
        image_url: url,
        image_urls: [url],
        error_message: null,
      })
      .select(CREATIVE_SELECT)
      .single()

    if (insErr) throw new Error(insErr.message)
    if (row) created.push(mapCreativeRow(row))
  }

  return created
}
