import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import {
  buildSequenceTimelineRanges,
  resolveClipIndexForReelTime,
} from './reel-timeline'
import { wordFuzzyMatches } from './subtitle-screen-text'
import { resolveTitleIdentity, type TitleIdentity } from './vehicle-title-identity'

const MAX_INTRO_SOURCE_CLIP_INDEX = 1

function wordCore(raw: string): string {
  return raw.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim()
}

function tokensFromBlockText(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => wordCore(w))
    .filter((w) => w.length >= 2)
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

    const a = core.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const k = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (a.length >= 2 && k.length >= 2 && (k.startsWith(a) || a.startsWith(k))) return true
  }

  return false
}

function tokenMatchesTitleYearWord(token: string, year: string): boolean {
  return wordCore(token) === year
}

function blockMentionsBrand(text: string, brand: string): boolean {
  return tokensFromBlockText(text).some((t) => tokenMatchesBrand(t, brand))
}

function blockMentionsModel(text: string, modelKeywords: string[]): boolean {
  return tokensFromBlockText(text).some((t) => tokenMatchesModelKeyword(t, modelKeywords))
}

function blockMentionsTitleYear(text: string, year: string): boolean {
  const trimmed = text.trim()
  if (new RegExp(`\\b${year}\\b`).test(trimmed)) return true
  return new RegExp(`\\ba[nñ]o\\s+${year}\\b`, 'i').test(trimmed)
}

function hasMeaningfulText(text: string): boolean {
  return text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').length >= 2
}

function normalizeToken(core: string): string {
  return core.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
 * Quita solo palabras de marca, modelo (keywords del título L2/L3) y año (L4).
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
      if (year && nextCore === year) {
        i++
        continue
      }
      continue
    }

    if (year && tokenMatchesTitleYearWord(w, year)) continue

    if (tokenMatchesBrand(w, brand) || tokenMatchesModelKeyword(w, modelKeywords)) {
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

function introSourceClipsMentionVehicle(
  segments: Segment[],
  identity: TitleIdentity
): boolean {
  const introSegs = segments.filter(
    (s) => s.clip_index <= MAX_INTRO_SOURCE_CLIP_INDEX && s.source_kind !== 'visual_only'
  )
  if (introSegs.length === 0) return false

  const combined = introSegs.map((s) => s.text).join(' ')
  if (!blockMentionsBrand(combined, identity.brand)) return false

  const hasModel = blockMentionsModel(combined, identity.modelKeywords)
  const hasYear = identity.year ? blockMentionsTitleYear(combined, identity.year) : false
  return hasModel || hasYear
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
  brand: string
  modelLine: string
  yearLine?: string | null
  sequence: SequenceItem[]
  allSegments: Segment[]
  guionSubtitleTimeline?: boolean
}

/**
 * Clip 0–1: quita del subtítulo solo las palabras que repiten marca, modelo o año del título.
 */
export function suppressIntroClipVehicleSubtitleDuplicates(
  blocks: SubtitleBlock[],
  opts: SuppressIntroClipVehicleSubsOpts
): SubtitleBlock[] {
  const identity = resolveTitleIdentity({
    vehicle_line_1: opts.brand,
    vehicle_line_2: opts.modelLine,
    vehicle_line_4: opts.yearLine,
  })
  if (!identity || blocks.length === 0) return blocks

  if (!introSourceClipsMentionVehicle(opts.allSegments, identity)) {
    if (opts.jobId) {
      console.log(
        `[BrandSubtitleDedup][${opts.jobId}] Clip 0–1 sin vehículo identificado; dedup omitida`
      )
    }
    return blocks
  }

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
      `[BrandSubtitleDedup][${opts.jobId}] Intro clips 0–1: solo marca/modelo/año del título ` +
        `(${blocks.length} → ${out.length} bloques, ${trimmed} recortados, ${removed} eliminados) ` +
        `marca="${identity.brand}" modelo=[${identity.modelKeywords.join(', ')}]` +
        (identity.year ? ` año=${identity.year}` : '')
    )
  }

  return out
}
