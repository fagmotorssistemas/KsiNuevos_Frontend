import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'
import {
  buildSequenceTimelineRanges,
  resolveClipIndexForReelTime,
} from './reel-timeline'
import { wordFuzzyMatches } from './subtitle-screen-text'

const MAX_INTRO_SOURCE_CLIP_INDEX = 1

function modelFirstToken(modelLine: string): string {
  return (
    modelLine
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '') ?? ''
  )
}

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

/** Solo el nombre del modelo (L2 1.ª palabra). Nunca números técnicos (1500, etc.). */
function tokenMatchesModel(token: string, modelToken: string): boolean {
  const core = wordCore(token)
  if (modelToken.length < 3 || core.length < 2) return false
  if (/\d/.test(core)) return false
  if (wordFuzzyMatches(core, modelToken)) return true
  const a = core.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const k = modelToken.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return a.length >= 3 && k.length >= 3 && (k.startsWith(a) || a.startsWith(k))
}

function tokenMatchesTitleYearWord(token: string, year: string): boolean {
  return wordCore(token) === year
}

function blockMentionsBrand(text: string, brand: string): boolean {
  return tokensFromBlockText(text).some((t) => tokenMatchesBrand(t, brand))
}

function blockMentionsModel(text: string, modelToken: string): boolean {
  return tokensFromBlockText(text).some((t) => tokenMatchesModel(t, modelToken))
}

function blockMentionsTitleYear(text: string, year: string): boolean {
  const trimmed = text.trim()
  if (new RegExp(`\\b${year}\\b`).test(trimmed)) return true
  return new RegExp(`\\ba[nñ]o\\s+${year}\\b`, 'i').test(trimmed)
}

function blockKey(b: SubtitleBlock): string {
  return `${b.time.toFixed(3)}|${b.text.trim()}`
}

function parseTitleYear(yearLine?: string | null): string | null {
  const raw = yearLine?.trim() ?? ''
  if (!raw) return null
  const m = raw.match(/\b(19|20)\d{2}\b/)
  if (m) return m[0]!
  if (/^\d{4}$/.test(raw)) return raw
  return null
}

function hasMeaningfulText(text: string): boolean {
  return text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').length >= 2
}

/**
 * Quita solo palabras de marca, modelo (L2) y año (L4) del título.
 * Ej: "flamante Toyota Rouge" → "flamante"; "Motor 1500 BBTI" sin cambios.
 */
function stripTitleIdentityWordsFromText(
  text: string,
  brand: string,
  modelToken: string,
  year: string | null
): string | null {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const kept: string[] = []

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
    if (tokenMatchesBrand(w, brand)) continue
    if (tokenMatchesModel(w, modelToken)) continue

    kept.push(w)
  }

  const joined = kept.join(' ').replace(/\s+([.,!?])/g, '$1').trim()
  if (!joined || !hasMeaningfulText(joined)) return null
  return joined
}

function introSourceClipsMentionVehicle(
  segments: Segment[],
  brand: string,
  modelToken: string,
  year: string | null
): boolean {
  const introSegs = segments.filter(
    (s) => s.clip_index <= MAX_INTRO_SOURCE_CLIP_INDEX && s.source_kind !== 'visual_only'
  )
  if (introSegs.length === 0) return false

  const combined = introSegs.map((s) => s.text).join(' ')
  if (!blockMentionsBrand(combined, brand)) return false

  const hasModel = blockMentionsModel(combined, modelToken)
  const hasYear = year ? blockMentionsTitleYear(combined, year) : false
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
 * El resto del bloque se mantiene; si queda vacío, se elimina el bloque.
 */
export function suppressIntroClipVehicleSubtitleDuplicates(
  blocks: SubtitleBlock[],
  opts: SuppressIntroClipVehicleSubsOpts
): SubtitleBlock[] {
  const brand = opts.brand.trim()
  const modelLine = opts.modelLine.trim()
  if (!brand || brand.length < 2 || !modelLine || blocks.length === 0) return blocks

  const modelToken = modelFirstToken(modelLine)
  const year = parseTitleYear(opts.yearLine)

  if (!introSourceClipsMentionVehicle(opts.allSegments, brand, modelToken, year)) {
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

    const stripped = stripTitleIdentityWordsFromText(block.text, brand, modelToken, year)
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
        `marca="${brand}" modelo≈"${modelToken}"${year ? ` año=${year}` : ''}`
    )
  }

  return out
}
