/**
 * Identidad del vehículo tal como aparece en el overlay de título (Shotstack L1–L4).
 * Fuente única para dedup de subtítulos y render de marca.
 */

export const BRAND_L2_TWO_WORD_MAX_CHARS = 14

export interface TitleIdentity {
  brand: string
  /** Palabras de modelo mostradas en L2 (+ L3 si el 2.º token no cupo en L2). */
  modelKeywords: string[]
  year: string | null
}

export interface TitleIdentityInput {
  vehicle_line_1?: string | null
  vehicle_line_2?: string | null
  vehicle_line_4?: string | null
}

export function cleanVehicleText(text: string): string {
  return text
    .replace(/\b(AC|TM|TA|MT|AT)\b/gi, '')
    .replace(/\b(4X4|4X2|2X4|AWD|FWD|RWD)\b/gi, '')
    .replace(/\b\d+P\b/gi, '')
    .replace(/\b\d+\.\d+\b/g, '')
    .replace(/\b(FSI|TSI|TDI|TFSI|C|DSG|CVT|HYBRID|PHEV|EV|TURBO)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Misma regla que Shotstack L2/L3: hasta 2 palabras de modelo tras limpiar specs de inventario.
 */
export function splitModelLinesForBrandOverlay(modelRaw: string): {
  line2: string
  line3Model: string
} {
  const cleaned = cleanVehicleText(modelRaw)
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) return { line2: '', line3Model: '' }
  if (words.length === 1) return { line2: words[0]!, line3Model: '' }

  const word1 = words[0]!
  const word2 = words[1]!
  const twoWordLine = `${word1} ${word2}`

  if (twoWordLine.length <= BRAND_L2_TWO_WORD_MAX_CHARS) {
    return { line2: twoWordLine, line3Model: '' }
  }

  return { line2: word1, line3Model: word2 }
}

function parseTitleYear(yearLine?: string | null): string | null {
  const raw = yearLine?.trim() ?? ''
  if (!raw) return null
  const m = raw.match(/\b(19|20)\d{2}\b/)
  if (m) return m[0]!
  if (/^\d{4}$/.test(raw)) return raw
  return null
}

/** Keywords únicas de modelo para match en subtítulos (orden L2 → L3). */
export function modelKeywordsFromLine2(modelLine: string): string[] {
  const { line2, line3Model } = splitModelLinesForBrandOverlay(modelLine)
  const keywords: string[] = []
  const seen = new Set<string>()

  for (const part of [line2, line3Model]) {
    if (!part) continue
    for (const w of part.split(/\s+/).filter(Boolean)) {
      const key = w.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      keywords.push(w)
    }
  }

  return keywords
}

export function resolveTitleIdentity(input: TitleIdentityInput): TitleIdentity | null {
  const brand = cleanVehicleText(input.vehicle_line_1?.trim() ?? '')
  const modelLine = input.vehicle_line_2?.trim() ?? ''
  if (!brand || brand.length < 2 || !modelLine) return null

  const modelKeywords = modelKeywordsFromLine2(modelLine)
  if (modelKeywords.length === 0) return null

  return {
    brand,
    modelKeywords,
    year: parseTitleYear(input.vehicle_line_4),
  }
}
