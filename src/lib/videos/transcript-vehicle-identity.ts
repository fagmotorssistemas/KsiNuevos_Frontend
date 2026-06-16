import { modelKeywordsFromLine2 } from './vehicle-title-identity'
import { normalizeForMatch, wordFuzzyMatches } from './subtitle-screen-text'

const INVENTORY_STOPWORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'es', 'la', 'las', 'le', 'les',
  'lo', 'los', 'me', 'mi', 'no', 'o', 'para', 'por', 'que', 'se', 'si', 'su', 'sus',
  'te', 'tu', 'u', 'un', 'una', 'unos', 'unas', 'y', 'ya',
])

export type VehicleIdentityInput = {
  brand: string
  model: string
  year?: string | null
}

export type VehicleIdentityMatchResult = {
  ok: boolean
  brandMentioned: boolean
  modelMentioned: boolean
  yearInTranscript: boolean
  yearConflict: boolean
  reason?: string
}

function isStopword(word: string): boolean {
  return INVENTORY_STOPWORDS.has(normalizeForMatch(word))
}

function wordCore(raw: string): string {
  return raw.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim()
}

function transcriptWords(transcript: string): string[] {
  return normalizeForMatch(transcript).split(' ').filter(Boolean)
}

/** Fuzzy estricto para inventario / validación de guión (no subtítulos). */
export function inventoryModelTokenMatches(assemblyWord: string, modelToken: string): boolean {
  const a = normalizeForMatch(assemblyWord)
  const k = normalizeForMatch(modelToken)
  if (!a || !k) return false
  if (isStopword(a)) return false

  if (/^\d{3,4}$/.test(k)) return a === k

  if (a === k) return true
  if (a.length < 3) return false
  if (a.length < k.length * 0.6 && (a.length < 4 || !k.includes(a))) return false

  return wordFuzzyMatches(a, k)
}

function brandMentionedInTranscript(brand: string, words: string[]): boolean {
  const brandNorm = normalizeForMatch(brand)
  if (brandNorm.length < 2) return false
  for (const w of words) {
    if (isStopword(w)) continue
    if (wordFuzzyMatches(w, brandNorm)) return true
  }
  return false
}

function modelMentionedInTranscript(modelLine: string, words: string[]): boolean {
  const keywords = modelKeywordsFromLine2(modelLine)
  if (keywords.length === 0) return false

  for (const w of words) {
    if (isStopword(w)) continue
    for (const kw of keywords) {
      if (kw.length < 2) continue
      const kwHasDigits = /\d/.test(kw)
      if (/\d/.test(w) && !kwHasDigits) continue
      if (inventoryModelTokenMatches(w, kw)) return true
      const a = normalizeForMatch(w)
      const k = normalizeForMatch(kw)
      if (a.length >= 2 && k.length >= 2 && (k.startsWith(a) || a.startsWith(k))) return true
    }
  }
  return false
}

function transcriptYearTokens(words: string[]): string[] {
  return words.filter((w) => /^(19|20)\d{2}$/.test(w))
}

function transcriptMentionsTitleYear(transcript: string, year: string): boolean {
  const trimmed = transcript.trim()
  if (new RegExp(`\\b${year}\\b`).test(trimmed)) return true
  return new RegExp(`\\ba[nñ]o\\s+${year}\\b`, 'i').test(trimmed)
}

/**
 * Comprueba que la transcripción Assembly mencione el mismo vehículo que el guión/inventario.
 * Requiere marca + modelo; si hay años en el audio deben coincidir con el del vehículo.
 */
export function transcriptMatchesVehicleIdentity(
  transcript: string,
  identity: VehicleIdentityInput
): VehicleIdentityMatchResult {
  const brand = identity.brand.trim()
  const model = identity.model.trim()
  const year = identity.year?.trim() || null

  if (!transcript.trim() || !brand || !model) {
    return {
      ok: false,
      brandMentioned: false,
      modelMentioned: false,
      yearInTranscript: false,
      yearConflict: false,
      reason: 'transcripción o identidad vacía',
    }
  }

  const words = transcriptWords(transcript)
  const brandMentioned = brandMentionedInTranscript(brand, words)
  const modelMentioned = modelMentionedInTranscript(model, words)
  const yearTokens = transcriptYearTokens(words)
  const yearInTranscript = yearTokens.length > 0

  let yearConflict = false
  if (year && yearInTranscript) {
    const yearOk =
      yearTokens.includes(year) || transcriptMentionsTitleYear(transcript, year)
    if (!yearOk) yearConflict = true
  }

  if (!brandMentioned) {
    return {
      ok: false,
      brandMentioned,
      modelMentioned,
      yearInTranscript,
      yearConflict,
      reason: `marca "${brand}" no mencionada en audio`,
    }
  }

  if (!modelMentioned) {
    return {
      ok: false,
      brandMentioned,
      modelMentioned,
      yearInTranscript,
      yearConflict,
      reason: `modelo "${modelKeywordsFromLine2(model).join('/')}" no mencionado en audio`,
    }
  }

  if (yearConflict) {
    const spoken = yearTokens.join(',')
    return {
      ok: false,
      brandMentioned,
      modelMentioned,
      yearInTranscript,
      yearConflict: true,
      reason: `año en audio (${spoken}) no coincide con ${year}`,
    }
  }

  return {
    ok: true,
    brandMentioned,
    modelMentioned,
    yearInTranscript,
    yearConflict: false,
  }
}

/** Tokens de modelo para búsqueda en inventario (números + primeras palabras alfabéticas). */
export function modelSearchTokens(model: string): string[] {
  const raw = normalizeForMatch(model).split(' ').filter(Boolean)
  const tokens: string[] = []

  for (const w of raw) {
    if (/^\d{3,4}$/.test(w)) {
      tokens.push(w)
      break
    }
  }

  for (const w of raw) {
    if (w.length >= 3 && !/^\d/.test(w)) tokens.push(w)
    if (tokens.length >= 3) break
  }

  return [...new Set(tokens)]
}

export function brandsMentionedInTranscript(
  transcriptWords: string[],
  brandNorms: string[]
): Set<string> {
  const mentioned = new Set<string>()
  for (const brandNorm of brandNorms) {
    if (brandNorm.length < 3) continue
    if (brandMentionedInTranscript(brandNorm, transcriptWords)) {
      mentioned.add(brandNorm)
    }
  }
  return mentioned
}
