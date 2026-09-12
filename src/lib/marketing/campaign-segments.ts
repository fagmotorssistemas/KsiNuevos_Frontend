import { classifyInventoryBody } from '@/lib/inventario/inventoryBodyCategory'
import type { CampaignSegment } from '@/types/marketing-campaigns'

export type { CampaignSegment }

export const CAMPAIGN_SEGMENTS: {
  id: CampaignSegment
  label: string
  plural: string
}[] = [
  { id: 'suv', label: 'SUV (jeep)', plural: 'SUV (jeep)' },
  { id: 'sedan', label: 'Sedan', plural: 'Sedans' },
  { id: 'camioneta', label: 'Camioneta', plural: 'Camionetas' },
  { id: 'otros', label: 'Otro', plural: 'Otros' },
]

export function segmentLabel(segment: CampaignSegment, plural = true): string {
  const row = CAMPAIGN_SEGMENTS.find((s) => s.id === segment)
  if (!row) return segment
  return plural ? row.plural : row.label
}

/** Normaliza vehicle_category o nombre de grupo al slug del segmento. */
export function normalizeCategoryToSegment(value: string | null | undefined): CampaignSegment | null {
  if (!value?.trim()) return null
  return classifyInventoryBody(value)
}

/**
 * Mismo agrupado que el filtro de inventario:
 * SUV (jeep), Camionetas, Sedans y Otros.
 */
export function inferCampaignSegment(input: {
  type_body?: string | null
  type?: string | null
  model?: string | null
  brand?: string | null
}): CampaignSegment {
  if (input.type_body?.trim()) return classifyInventoryBody(input.type_body)
  if (input.type?.trim()) return classifyInventoryBody(input.type)
  return 'otros'
}

export function matchesCampaignSegment(
  row: { type_body?: string | null; type?: string | null; model?: string | null; brand?: string | null },
  segment: CampaignSegment
): boolean {
  return inferCampaignSegment(row) === segment
}

export function groupBelongsToSegment(
  vehicleCategory: string | null | undefined,
  segment: CampaignSegment
): boolean {
  const normalized = normalizeCategoryToSegment(vehicleCategory)
  if (!normalized) return segment === 'suv'
  return normalized === segment
}
