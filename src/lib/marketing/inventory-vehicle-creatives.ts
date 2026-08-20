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
  return VARIANT_LABELS[variant.toLowerCase()] ?? variant
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

export function creativeDownloadFilename(creative: VehicleCreativeItem, imageIndex = 0): string {
  const kind = creative.kindLabel.replace(/\s+/g, '-').toLowerCase()
  const variant = creative.variantLabel.replace(/\s+/g, '-').toLowerCase()
  const suffix = creative.images.length > 1 ? `-${imageIndex + 1}` : ''
  const ext = (creative.images[imageIndex] ?? creative.imageUrl ?? '').split('?')[0]?.match(/\.(png|jpe?g|webp)$/i)?.[1] ?? 'png'
  return `${kind}-${variant}${suffix}.${ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase()}`
}
