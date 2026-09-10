export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '1422382052157486'

const PUBLIC_PIXEL_PREFIXES = [
  '/cuenca-azuay',
  '/usados',
  '/vender',
  '/creditos',
  '/nosotros',
  '/autos',
  '/buyCar',
  '/home',
  '/vehiculos',
  '/sellCar',
  '/creditCar',
  '/simulador',
  '/aboutUs',
] as const

export type VehiclePixelPayload = {
  id: string
  price?: number | null
  make?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  transmission?: string | null
  bodyStyle?: string | null
  fuelType?: string | null
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

export function isPublicMarketingPath(pathname: string | null | undefined): boolean {
  const path = String(pathname ?? '').split('?')[0]
  if (path === '/') return true
  return PUBLIC_PIXEL_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function fbq(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq(...args)
}

function mapTransmission(raw?: string | null): string | undefined {
  const t = String(raw ?? '').toLowerCase()
  if (!t) return undefined
  if (/auto|cvt|tiptronic|\bta\b|\bat\b/.test(t)) return 'Automatic'
  if (/manual|\btm\b|\bmt\b/.test(t)) return 'Manual'
  return undefined
}

function mapFuel(raw?: string | null): string | undefined {
  const t = String(raw ?? '').toLowerCase()
  if (!t) return undefined
  if (/diesel|diésel/.test(t)) return 'Diesel'
  if (/h[ií]brid/.test(t)) return 'Hybrid'
  if (/el[eé]ctric/.test(t)) return 'Electric'
  if (/flex/.test(t)) return 'Flex'
  if (/gas|nafta|extra|super/.test(t)) return 'Gasoline'
  return undefined
}

function mapBodyStyle(raw?: string | null): string | undefined {
  const t = String(raw ?? '').toLowerCase()
  if (!t) return undefined
  if (/crossover/.test(t)) return 'Crossover'
  if (/suv|todoterreno|jeep/.test(t)) return 'SUV'
  if (/pick|camioneta|cabina/.test(t)) return 'Truck'
  if (/sedan|sedán/.test(t)) return 'Sedan'
  if (/hatch/.test(t)) return 'Hatchback'
  if (/coupe|coupé/.test(t)) return 'Coupe'
  if (/convertible|descapotable/.test(t)) return 'Convertible'
  if (/minivan/.test(t)) return 'Minivan'
  if (/\bvan\b/.test(t)) return 'Van'
  if (/wagon|station/.test(t)) return 'Wagon'
  return undefined
}

export function vehicleCustomData(v: VehiclePixelPayload): Record<string, unknown> {
  const id = String(v.id ?? '').trim()
  const price = v.price != null && Number.isFinite(Number(v.price)) && Number(v.price) > 0
    ? Number(v.price)
    : undefined
  const data: Record<string, unknown> = {
    content_type: 'vehicle',
    country: 'Ecuador',
    state_of_vehicle: 'Used',
  }
  if (id) data.content_ids = [id]
  if (price != null) {
    data.value = price
    data.price = price
    data.currency = 'USD'
  }
  const make = v.make?.trim()
  const model = v.model?.trim()
  if (make) data.make = make
  if (model) data.model = model
  if (v.year != null && Number.isFinite(v.year)) data.year = v.year
  if (make || model) {
    data.content_name = `${make ?? ''} ${model ?? ''} ${v.year ?? ''}`.trim()
  }
  if (v.color?.trim()) data.exterior_color = v.color.trim().toLowerCase()
  const transmission = mapTransmission(v.transmission)
  if (transmission) data.transmission = transmission
  const fuel = mapFuel(v.fuelType)
  if (fuel) data.fuel_type = fuel
  const body = mapBodyStyle(v.bodyStyle)
  if (body) data.body_style = body
  return data
}

export function toVehiclePixel(car: {
  id: string
  brand?: string | null
  model?: string | null
  year?: number | null
  price?: number | null
  color?: string | null
  transmission?: string | null
  type_body?: string | null
  fuel_type?: string | null
}): VehiclePixelPayload {
  return {
    id: car.id,
    make: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    color: car.color,
    transmission: car.transmission,
    bodyStyle: car.type_body,
    fuelType: car.fuel_type,
  }
}

export function trackPageView() {
  fbq('track', 'PageView')
}

export function trackViewContent(v: VehiclePixelPayload) {
  if (!v.id?.trim()) return
  fbq('track', 'ViewContent', vehicleCustomData(v))
}

export function trackSearch(params: {
  searchString?: string
  contentIds?: string[]
  make?: string
  model?: string
  year?: number
}) {
  const data: Record<string, unknown> = {
    content_type: 'vehicle',
    country: 'Ecuador',
  }
  if (params.searchString?.trim()) data.search_string = params.searchString.trim()
  if (params.contentIds?.length) data.content_ids = params.contentIds
  if (params.make?.trim()) data.make = params.make.trim()
  if (params.model?.trim()) data.model = params.model.trim()
  if (params.year != null && Number.isFinite(params.year)) data.year = params.year
  fbq('track', 'Search', data)
}

export function trackContactWhatsApp(v: VehiclePixelPayload) {
  if (!v.id?.trim()) return
  fbq('track', 'Contact', vehicleCustomData(v))
}

export function trackLead(v: VehiclePixelPayload) {
  if (!v.id?.trim()) return
  fbq('track', 'Lead', vehicleCustomData(v))
}
