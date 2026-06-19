import type { SequenceItem, SubtitleBlock } from './segmenter'
import {
  buildSequenceTimelineRanges,
  resolveClipIndexForReelTime,
} from './reel-timeline'
import { wordFuzzyMatches } from './subtitle-screen-text'

const MAX_INTRO_SOURCE_CLIP_INDEX = 1
const BRAND_L2_TWO_WORD_MAX_CHARS = 11

export interface TitleIdentity {
  brand: string
  modelKeywords: string[]
  year: string | null
}

function cleanVehicleText(text: string): string {
  return text
    .replace(/\b(AC|TM|TA|MT|AT)\b/gi, '')
    .replace(/\b(4X4|4X2|2X4|AWD|FWD|RWD)\b/gi, '')
    .replace(/\b\d+P\b/gi, '')
    .replace(/\b\d+\.\d+\b/g, '')
    .replace(/\b(FSI|TSI|TDI|TFSI|C|DSG|CVT|HYBRID|PHEV|EV|TURBO)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function splitModelLinesForBrandOverlay(modelRaw: string): { line2: string; line3Model: string } {
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

function modelKeywordsFromLine2(modelLine: string): string[] {
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

function resolveTitleIdentity(input: {
  brand?: string | null
  modelLine: string
  yearLine?: string | null
}): TitleIdentity | null {
  const brand = cleanVehicleText(input.brand?.trim() ?? '')
  const modelLine = input.modelLine.trim()
  if (!modelLine) return null

  const modelKeywords = modelKeywordsFromLine2(modelLine).slice(0, 2)
  if (modelKeywords.length === 0) return null

  return {
    brand,
    modelKeywords,
    year: parseTitleYear(input.yearLine),
  }
}

function wordCore(raw: string): string {
  return raw.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim()
}

function normalizeToken(core: string): string {
  return core.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[m]![n]!
}

/** Fuzzy relajado solo para dedup intro (ASR: rouge↔rush, celto↔seltos). */
function introModelTokenMatches(token: string, keyword: string): boolean {
  if (wordFuzzyMatches(token, keyword)) return true
  const a = normalizeToken(wordCore(token))
  const k = normalizeToken(keyword)
  if (a.length < 3 || k.length < 3) return false

  const minLen = Math.min(a.length, k.length)
  const maxLen = Math.max(a.length, k.length)
  if (maxLen - minLen > 2) return false

  const dist = levenshteinDistance(a, k)
  if (dist <= 2) return true
  if (a[0] === k[0] && minLen >= 4 && dist <= 3) return true
  return false
}

function tokenMatchesBrand(token: string, brand: string): boolean {
  const core = wordCore(token)
  if (core.length < 2) return false
  return wordFuzzyMatches(core, brand)
}

function tokenMatchesModelKeyword(token: string, modelKeywords: string[]): boolean {
  const core = wordCore(token)
  if (core.length < 2 || modelKeywords.length === 0) return false

  for (const kw of modelKeywords) {
    if (kw.length < 2) continue
    const kwHasDigits = /\d/.test(kw)
    if (/\d/.test(core) && !kwHasDigits) continue

    if (wordFuzzyMatches(core, kw)) return true
    if (introModelTokenMatches(core, kw)) return true

    const a = normalizeToken(core)
    const k = normalizeToken(kw)
    if (a.length >= 2 && k.length >= 2 && (k.startsWith(a) || a.startsWith(k))) return true
  }

  return false
}

/** Assembly a veces fusiona marca+modelo ("Kiacelto" ≈ Kia+Seltos). */
function tokenContainsFusedModelKeyword(token: string, modelKeywords: string[]): boolean {
  const core = wordCore(token)
  if (core.length < 4 || modelKeywords.length === 0) return false

  const n = normalizeToken(core)
  for (const kw of modelKeywords) {
    if (kw.length < 3) continue
    const kn = normalizeToken(kw)
    if (n.includes(kn) && (wordFuzzyMatches(kn, kw) || introModelTokenMatches(kn, kw))) return true
    if (n.length >= kn.length + 2) {
      for (let i = 0; i <= n.length - kn.length; i++) {
        const slice = n.slice(i, i + kn.length)
        if (wordFuzzyMatches(slice, kw) || introModelTokenMatches(slice, kw)) return true
      }
    }
    if (n.length >= kn.length && (wordFuzzyMatches(n.slice(-kn.length), kw) || introModelTokenMatches(n.slice(-kn.length), kw))) {
      return true
    }
  }
  return false
}

function tokenMatchesIntroYearWord(token: string, year: string | null): boolean {
  const core = wordCore(token)
  if (year) return core === year
  return /^(19|20)\d{2}$/.test(core)
}

function hasMeaningfulText(text: string): boolean {
  return text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').length >= 2
}

function isLaOrEl(core: string): boolean {
  const n = normalizeToken(core)
  return n === 'la' || n === 'el'
}

function isOnlyLaOrElText(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length !== 1) return false
  return isLaOrEl(wordCore(words[0]!))
}

/**
 * Quita palabras de marca, modelo (2 primeras del título) y año (L4) del texto del subtítulo.
 */
export function stripTitleIdentityWordsFromText(
  text: string,
  identity: TitleIdentity
): string | null {
  const { brand, modelKeywords, year } = identity
  const words = text.trim().split(/\s+/).filter(Boolean)
  const kept: string[] = []
  let removedBrandOrModel = false
  let articleBeforeStrippedBrandOrModel = false

  for (let i = 0; i < words.length; i++) {
    const w = words[i]!
    const core = wordCore(w)

    if (/^a[nñ]o$/i.test(core)) {
      const nextCore = i + 1 < words.length ? wordCore(words[i + 1]!) : ''
      if (nextCore && tokenMatchesIntroYearWord(nextCore, year)) {
        i++
        continue
      }
      continue
    }

    if (tokenMatchesIntroYearWord(w, year)) continue

    const brandMatch = brand.length >= 2 && tokenMatchesBrand(w, brand)
    const modelMatch =
      tokenMatchesModelKeyword(w, modelKeywords) ||
      tokenContainsFusedModelKeyword(w, modelKeywords)

    if (brandMatch || modelMatch) {
      removedBrandOrModel = true
      if (i > 0 && isLaOrEl(wordCore(words[i - 1]!))) {
        articleBeforeStrippedBrandOrModel = true
      }
      continue
    }

    kept.push(w)
  }

  const joined = kept.join(' ').replace(/\s+([.,!?])/g, '$1').trim()
  if (!joined || !hasMeaningfulText(joined)) return null

  if (
    removedBrandOrModel &&
    articleBeforeStrippedBrandOrModel &&
    isOnlyLaOrElText(joined)
  ) {
    return null
  }

  return joined
}

function blockInIntroSourceClip(
  block: SubtitleBlock,
  ranges: ReturnType<typeof buildSequenceTimelineRanges>
): boolean {
  const clipIdx = resolveClipIndexForReelTime(block.time, ranges)
  return clipIdx != null && clipIdx <= MAX_INTRO_SOURCE_CLIP_INDEX
}

export interface SuppressIntroClipVehicleSubsOpts {
  jobId?: string
  brand?: string | null
  modelLine: string
  yearLine?: string | null
  sequence: SequenceItem[]
  guionSubtitleTimeline?: boolean
}

/**
 * Clips 0–1: quita del subtítulo marca, 2 primeras palabras de modelo y año del título (fuzzy).
 * El overlay de título ya muestra esa identidad (inventario resuelto).
 */
export function suppressIntroClipVehicleSubtitleDuplicates(
  blocks: SubtitleBlock[],
  opts: SuppressIntroClipVehicleSubsOpts
): SubtitleBlock[] {
  const identity = resolveTitleIdentity({
    brand: opts.brand,
    modelLine: opts.modelLine,
    yearLine: opts.yearLine,
  })
  if (!identity || blocks.length === 0) return blocks

  const ranges = buildSequenceTimelineRanges(opts.sequence, {
    guionSubtitleTimeline: opts.guionSubtitleTimeline,
  })

  const out: SubtitleBlock[] = []
  let removed = 0
  let trimmed = 0

  for (const block of blocks) {
    if (!blockInIntroSourceClip(block, ranges)) {
      out.push(block)
      continue
    }

    const stripped = stripTitleIdentityWordsFromText(block.text, identity)
    if (stripped == null) {
      removed++
      if (opts.jobId) {
        console.log(
          `[BrandSubtitleDedup][${opts.jobId}] clip≤1 t=${block.time.toFixed(2)}s vacío tras quitar identidad: "${block.text.trim().slice(0, 48)}"`
        )
      }
      continue
    }

    if (stripped !== block.text.trim()) {
      trimmed++
      if (opts.jobId) {
        console.log(
          `[BrandSubtitleDedup][${opts.jobId}] clip≤1 t=${block.time.toFixed(2)}s palabras título quitadas: ` +
            `"${block.text.trim().slice(0, 40)}" → "${stripped.slice(0, 40)}"`
        )
      }
      out.push({ ...block, text: stripped, words: undefined })
    } else {
      out.push(block)
    }
  }

  if ((removed > 0 || trimmed > 0) && opts.jobId) {
    console.log(
      `[BrandSubtitleDedup][${opts.jobId}] Intro clips 0–1: marca/modelo/año del título suprimidos ` +
        `(${blocks.length} → ${out.length} bloques, ${trimmed} recortados, ${removed} eliminados) ` +
        (identity.brand ? `marca="${identity.brand}" ` : '') +
        `modelo=[${identity.modelKeywords.join(', ')}]` +
        (identity.year ? ` año=${identity.year}` : '')
    )
  }

  return out
}
