import type { NoticieroVehicle } from './types'

const JUNK_WORDS = new Set([
  'act',
  'ac',
  'ta',
  'at',
  'mt',
  'cvt',
  'tiptronic',
  'automatico',
  'automatica',
  'manual',
  'ba6',
  'ba8',
  'fwd',
  'rwd',
  'awd',
  '4x2',
  '4x4',
  '5p',
  '3p',
  '4p',
  '5ptas',
  '4ptas',
  'sedan',
  'hatchback',
  'suv',
  'pickup',
  'camioneta',
  'gasolina',
  'diesel',
  'hibrido',
  'electrico',
  'turbo',
  'tfsi',
  'tsi',
  'gdi',
  'dohc',
  'sohc',
  'vvt',
  'abs',
  'ebd',
  'esp',
])

const JUNK_TOKEN =
  /^(?:\d+\.\d+|\d+p|\d+ptas?|\d{2,4}cc|\d+\s*hp|v\d|l\d|i\d|\d{1,2}[a-z]{1,2})$/i

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripYearFromText(value: string): string {
  return normalizeSpaces(value.replace(/\(\s*\d{4}\s*\)/g, ' ').replace(/\b(19|20)\d{2}\b/g, ' '))
}

function normalizeModelToken(token: string): string {
  const t = token.trim()
  if (!t) return ''
  const m = t.match(/^(\d{2,4})([a-z])$/i)
  if (m) return m[1]
  return t
}

/** Limpia el string de modelo del inventario (códigos, motor, puertas, etc.). */
export function cleanInventoryModelName(rawModel: string, brand?: string): string {
  let model = stripYearFromText(rawModel)
  if (brand) {
    const brandRe = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
    model = model.replace(brandRe, '')
  }

  const tokens = model
    .split(/\s+/)
    .map(normalizeModelToken)
    .filter(Boolean)
    .filter((token) => {
      const lower = token.toLowerCase()
      if (JUNK_WORDS.has(lower)) return false
      if (JUNK_TOKEN.test(token)) return false
      if (/^\d+\.\d+$/.test(token)) return false
      return true
    })

  if (tokens.length === 0) {
    const fallback = stripYearFromText(rawModel).split(/\s+/).slice(0, 3)
    return normalizeSpaces(fallback.join(' '))
  }

  return normalizeSpaces(tokens.slice(0, 4).join(' '))
}

function formatYear(year: NoticieroVehicle['year']): string {
  if (year == null || year === '') return ''
  const n = Number(year)
  if (!Number.isNaN(n) && n >= 1980 && n <= 2100) return String(Math.round(n))
  const m = String(year).match(/\b(19|20)\d{2}\b/)
  return m?.[0] ?? ''
}

function cleanVersion(version: string): string {
  const v = normalizeSpaces(version)
  if (!v || v.length > 24) return ''
  if (/act|ba\d|ac\b|5p|4x2/i.test(v)) return ''
  return v
}

/** Titular corto para el lower-third (sin precio ni specs). */
export function buildVehicleHeadlineSync(vehicle: NoticieroVehicle): string {
  const brand = normalizeSpaces(vehicle.brand)
  const modelCore = cleanInventoryModelName(vehicle.model, brand)
  const version = cleanVersion(vehicle.version ?? '')
  const year = formatYear(vehicle.year)

  const parts = [brand, modelCore, version, year].filter(Boolean)
  const headline = normalizeSpaces(parts.join(' '))
  return headline.toUpperCase()
}

export function normalizeBannerTitle(value: string): string {
  return normalizeSpaces(value).toUpperCase()
}

export function isBannerTitleValid(value: string): boolean {
  const t = normalizeBannerTitle(value)
  return t.length >= 3 && t.length <= 120
}

/** @deprecated Usar buildVehicleHeadlineSync; se mantiene por compatibilidad en APIs. */
export function buildVehicleBannerTitle(vehicle: NoticieroVehicle): string {
  return buildVehicleHeadlineSync(vehicle)
}
