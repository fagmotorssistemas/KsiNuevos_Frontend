import type { NoticieroVehicle } from './types'

/** Datos del vehículo listos para el guión (sin códigos crudos ni números ambiguos). */
export interface VehicleScriptFacts {
  brand: string
  modelSpoken: string
  year: string | null
  color: string | null
  bodyType: string | null
  doors: string | null
  engineLiters: string | null
  transmission: string | null
  driveType: string | null
  fuelType: string | null
  isHybrid: boolean
  passengerCapacity: string | null
  /** Bloque de texto para el prompt de Gemini */
  promptBlock: string
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function isMissing(value: unknown): boolean {
  if (value == null) return true
  const s = String(value).trim().toLowerCase()
  return s === '' || s === 'n/a' || s === 'null' || s === 'undefined'
}

const DIGIT_WORDS = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
] as const

/** Convierte cilindrada en litros (ej. 6.0, 1.6) a forma hablada en concesionario: "seis punto cero". */
export function formatEngineDisplacementForSpeech(litersRaw: string): string | null {
  const n = parseFloat(litersRaw.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null

  const normalized = Number.isInteger(n) ? `${n}.0` : String(n)
  const [intPart, decPart = '0'] = normalized.split('.')

  const intNum = parseInt(intPart, 10)
  if (intNum < 0 || intNum > 9) return null

  const intWord = intNum === 0 ? 'cero' : DIGIT_WORDS[intNum]

  const decDigits = decPart.replace(/0+$/, '') || '0'
  const decWords = decDigits
    .split('')
    .map((d) => DIGIT_WORDS[parseInt(d, 10)] ?? d)
    .join(' ')

  if (!decPart || /^0+$/.test(decPart)) {
    return `${intWord} punto cero`
  }

  return `${intWord} punto ${decWords}`
}

/** Extrae datos hablables del string de modelo del inventario (ej. tahoe hibrida 5p 6.0l 4x4 ta). */
export function parseInventoryModelCodes(rawModel: string): {
  doors: number | null
  engineLiters: string | null
  driveType: string | null
  transmission: string | null
  isHybrid: boolean
  modelNameTokens: string[]
} {
  const lower = rawModel.toLowerCase()
  const isHybrid = /\bhibrid[ao]s?\b|\bhybrid\b/.test(lower)

  const doorsMatch = lower.match(/\b(\d)\s*p(?:tas|uertas)?\b/)
  const doors = doorsMatch ? Number(doorsMatch[1]) : null

  const litersMatch = lower.match(/\b(\d+(?:\.\d+)?)\s*l\b/)
  const engineLitersNormalized = litersMatch
    ? formatEngineDisplacementForSpeech(litersMatch[1])
    : null

  let driveType: string | null = null
  if (/\b4\s*x\s*4\b|\b4x4\b/.test(lower)) driveType = 'tracción cuatro por cuatro'
  else if (/\b4\s*x\s*2\b|\b4x2\b/.test(lower)) driveType = 'tracción cuatro por dos'
  else if (/\bawd\b/.test(lower)) driveType = 'tracción integral'
  else if (/\bfwd\b/.test(lower)) driveType = 'tracción delantera'
  else if (/\brwd\b/.test(lower)) driveType = 'tracción trasera'

  let transmission: string | null = null
  if (/\bta\b/.test(lower)) transmission = 'transmisión automática'
  else if (/\btm\b/.test(lower)) transmission = 'transmisión manual'
  else if (/\bcvt\b/.test(lower)) transmission = 'transmisión CVT'
  else if (/\btiptronic\b/.test(lower)) transmission = 'transmisión automática Tiptronic'

  const junk = new Set([
    'act',
    'ac',
    'ta',
    'tm',
    'cvt',
    '5p',
    '4p',
    '3p',
    '4x4',
    '4x2',
    'fwd',
    'rwd',
    'awd',
    'hibrida',
    'hibrido',
    'hybrid',
    'gasolina',
    'diesel',
  ])

  const modelNameTokens = rawModel
    .replace(/\(\s*\d{4}\s*\)/g, ' ')
    .split(/\s+/)
    .filter((t) => {
      const x = t.toLowerCase().replace(/[^\w.]/g, '')
      if (!x) return false
      if (junk.has(x)) return false
      if (/^\d+p$/.test(x)) return false
      if (/^\d+(\.\d+)?l$/.test(x)) return false
      if (/^4x[24]$/.test(x)) return false
      if (/^\d+\.\d+$/.test(x)) return false
      return true
    })

  return {
    doors,
    engineLiters: engineLitersNormalized,
    driveType,
    transmission,
    isHybrid,
    modelNameTokens,
  }
}

function formatEngineDisplacementCc(raw: string | null | undefined): string | null {
  if (isMissing(raw)) return null
  const s = String(raw).trim()
  const n = Number(s.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  // 3000 en BD = cilindrada en cc, NO decir "motor tres mil" en voz
  if (n >= 800 && n <= 9900 && !s.toLowerCase().includes('l')) {
    return `${Math.round(n)} cc`
  }
  return null
}

function normalizeTransmissionField(raw: string | null | undefined): string | null {
  if (isMissing(raw)) return null
  const s = String(raw).toLowerCase()
  if (s.includes('auto')) return 'transmisión automática'
  if (s.includes('manual')) return 'transmisión manual'
  if (s.includes('cvt')) return 'transmisión CVT'
  return titleCase(String(raw))
}

function normalizeDriveField(raw: string | null | undefined): string | null {
  if (isMissing(raw)) return null
  const s = String(raw).toLowerCase()
  if (s.includes('4x4') || s.includes('4wd') || s.includes('awd')) return 'tracción cuatro por cuatro'
  if (s.includes('4x2')) return 'tracción cuatro por dos'
  if (s.includes('delan')) return 'tracción delantera'
  if (s.includes('tras')) return 'tracción trasera'
  return titleCase(String(raw))
}

function normalizeFuel(raw: string | null | undefined, isHybrid: boolean): string | null {
  if (isHybrid) return 'híbrido'
  if (isMissing(raw)) return null
  const s = String(raw).toLowerCase()
  if (s.includes('gasol')) return 'gasolina'
  if (s.includes('diesel')) return 'diesel'
  if (s.includes('elect')) return 'eléctrico'
  return titleCase(String(raw))
}

function buildModelSpoken(brand: string, parsed: ReturnType<typeof parseInventoryModelCodes>): string {
  const brandRe = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
  const tokens = parsed.modelNameTokens.length
    ? parsed.modelNameTokens
    : ['modelo']
  const name = titleCase(tokens.join(' '))
  if (parsed.isHybrid && !/hibrid/i.test(name)) {
    return `${name} Híbrida`.replace(brandRe, '').trim() || `${titleCase(brand)} ${name} Híbrida`
  }
  return name.replace(brandRe, '').trim() || name
}

export function buildVehicleScriptFacts(vehicle: NoticieroVehicle): VehicleScriptFacts {
  const brand = titleCase(vehicle.brand)
  const parsed = parseInventoryModelCodes(vehicle.model)
  const modelSpoken = buildModelSpoken(brand, parsed)

  const year = isMissing(vehicle.year) ? null : String(vehicle.year)
  const color = isMissing(vehicle.color) ? null : titleCase(vehicle.color)
  const bodyType = isMissing(vehicle.type_body) ? null : titleCase(vehicle.type_body)

  const transmission =
    normalizeTransmissionField(vehicle.transmission) ?? parsed.transmission
  const driveType = normalizeDriveField(vehicle.drive_type) ?? parsed.driveType
  const fuelType = normalizeFuel(vehicle.fuel_type, parsed.isHybrid)

  const engineLiters = parsed.engineLiters
  const engineCc = formatEngineDisplacementCc(vehicle.engine_displacement)
  const doors = parsed.doors != null ? `${parsed.doors} puertas` : null

  const passengerCapacity = isMissing(vehicle.passenger_capacity)
    ? null
    : `${vehicle.passenger_capacity} pasajeros`

  const lines: string[] = [
    `Marca (decir en voz): ${brand}`,
    `Modelo comercial (decir en voz): ${modelSpoken}`,
    year ? `Año: ${year}` : null,
    color ? `Color: ${color}` : null,
    bodyType ? `Tipo de carrocería: ${bodyType}` : null,
    parsed.isHybrid ? 'Es vehículo híbrido: sí' : null,
    doors,
    engineLiters
      ? `Motor (decir en voz exactamente): motor ${engineLiters} — NUNCA "X litros", NUNCA "tres mil"`
      : null,
    !engineLiters && engineCc
      ? `Cilindrada (solo referencia interna ${engineCc}, NO decir "motor tres mil" ni el número de cc en voz)`
      : null,
    transmission,
    driveType,
    fuelType,
    passengerCapacity,
    `Texto crudo del inventario (NO leer en voz, solo contexto): ${vehicle.model}`,
  ].filter((line): line is string => Boolean(line))

  const promptBlock = lines.join('\n')

  return {
    brand,
    modelSpoken,
    year,
    color,
    bodyType,
    doors,
    engineLiters,
    transmission,
    driveType,
    fuelType,
    isHybrid: parsed.isHybrid,
    passengerCapacity,
    promptBlock,
  }
}
