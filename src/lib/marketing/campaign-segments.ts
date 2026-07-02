export type CampaignSegment = 'suv' | 'sedan' | 'camioneta'

export const CAMPAIGN_SEGMENTS: {
  id: CampaignSegment
  label: string
  plural: string
}[] = [
  { id: 'suv', label: 'SUV', plural: 'SUVs' },
  { id: 'sedan', label: 'Sedan', plural: 'Sedans' },
  { id: 'camioneta', label: 'Camioneta', plural: 'Camionetas' },
]

export function segmentLabel(segment: CampaignSegment, plural = true): string {
  const row = CAMPAIGN_SEGMENTS.find((s) => s.id === segment)
  if (!row) return segment
  return plural ? row.plural : row.label
}

/** Normaliza vehicle_category guardado en BD (ej. "SUVs", "suv") al slug del segmento. */
export function normalizeCategoryToSegment(value: string | null | undefined): CampaignSegment | null {
  if (!value?.trim()) return null
  const c = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  if (c === 'suv' || c.includes('suv') || c.includes('jeep')) return 'suv'
  if (c === 'sedan' || c.includes('sedan') || c.includes('hatch') || c.includes('coupe') || c.includes('cupe')) {
    return 'sedan'
  }
  if (
    c === 'camioneta' ||
    c.includes('camioneta') ||
    c.includes('pickup') ||
    c.includes('cabina') ||
    c.includes('platon')
  ) {
    return 'camioneta'
  }
  return null
}

/** Clasifica un vehículo de inventoryoracle en SUV / Sedan / Camioneta. */
export function inferCampaignSegment(input: {
  type_body?: string | null
  type?: string | null
  model?: string | null
  brand?: string | null
}): CampaignSegment | null {
  const hay = `${input.type_body ?? ''} ${input.type ?? ''} ${input.model ?? ''} ${input.brand ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  if (
    /camioneta|pickup|pick up|doble cabina|cabina doble|cabina simple|platon|hilux|ranger|amarok|frontier|l200|dmax|tornado|navara|tacoma|furgon/.test(
      hay
    )
  ) {
    return 'camioneta'
  }

  if (
    /suv|jeep|wrangler|montero|4x4|crossover|land cruiser|fortuner|prado|trailblazer|sportage|tucson|kicks|escape|5008|3008|2008|kona|compass|renegade|cherokee|suburban|tahoe|traveller|jetour/.test(
      hay
    )
  ) {
    return 'suv'
  }

  if (/sedan|hatchback|hatch|coupe|cupe|berlina|beetle|corolla|civic|accent|sentra|spark|versa|yaris|forte/.test(hay)) {
    return 'sedan'
  }

  const fromBody = normalizeCategoryToSegment(input.type_body)
  if (fromBody) return fromBody

  return null
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
