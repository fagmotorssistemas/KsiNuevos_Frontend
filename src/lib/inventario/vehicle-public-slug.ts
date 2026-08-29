const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const VEHICLES_CATALOG_PATH = '/usados/cuenca'

export type VehicleSlugFields = {
  slug?: string | null
  brand: string
  model: string
  year: number | string
}

export type VehiclePublicSegments = {
  brand: string
  model: string
  year: string
}

export function isVehicleUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

/** Convierte "KIA SPORTAGE" → "kia-sportage" (segmento de URL). */
export function slugifyVehicleText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getVehicleBrandSlug(car: Pick<VehicleSlugFields, 'brand'>): string {
  return slugifyVehicleText(car.brand)
}

export function getVehicleModelSlug(car: Pick<VehicleSlugFields, 'model'>): string {
  return slugifyVehicleText(car.model)
}

export function getVehicleYearSlug(car: Pick<VehicleSlugFields, 'year'>): string {
  return String(car.year)
}

export function getVehiclePublicSegments(car: VehicleSlugFields): VehiclePublicSegments {
  return {
    brand: getVehicleBrandSlug(car),
    model: getVehicleModelSlug(car),
    year: getVehicleYearSlug(car),
  }
}

/** Slug plano con guiones, para resolver URLs viejas `/autos/kia-sportage-2019`. */
export function getVehiclePublicSlug(car: VehicleSlugFields): string {
  const segments = getVehiclePublicSegments(car)
  return `${segments.brand}-${segments.model}-${segments.year}`
}

export function getVehiclePublicPath(car: VehicleSlugFields): string {
  const { brand, model, year } = getVehiclePublicSegments(car)
  return `${VEHICLES_CATALOG_PATH}/${brand}/${model}/${year}`
}

export function getVehicleBrandPath(brand: string): string {
  return `${VEHICLES_CATALOG_PATH}/${slugifyVehicleText(brand)}`
}

export function vehicleLookupKeyFromSegments(
  brand: string,
  model: string,
  year: string
): string {
  return [slugifyVehicleText(brand), slugifyVehicleText(model), slugifyVehicleText(year)]
    .filter(Boolean)
    .join('-')
}

export function extractYearFromVehicleSlug(slug: string): number | null {
  const match = slug.match(/(?:^|-)(\d{4})$/)
  if (!match) return null
  const year = Number(match[1])
  if (year < 1980 || year > 2100) return null
  return year
}

/** Un solo segmento tipo `kia-sportage-...-2019` (URL vieja), no una marca suelta. */
export function isLegacyHyphenVehicleSlug(segment: string): boolean {
  const normalized = slugifyVehicleText(segment)
  if (!extractYearFromVehicleSlug(normalized)) return false
  return normalized.split('-').length >= 3
}
