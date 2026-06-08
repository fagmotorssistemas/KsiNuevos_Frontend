import type { SequenceItem, SubtitleBlock, SubtitleHighlightFx } from './segmenter'
import { isDriveBadgeText } from './drive-badge'
import { normalizeForMatch } from './subtitle-screen-text'
import {
  fetchGeminiCaptionHighlights,
  type GeminiHighlightPhrase,
  type VehicleHighlightContext,
} from './gemini-caption-highlights'

export type HighlightKind = 'spec' | 'feature' | 'emotional'

type CaptionHighlightFx = SubtitleHighlightFx

const CLIP_TRANSITION_OVERLAP_SEC = 0.5
const CLIP_BOUNDARY_INDICES = [0, 1, 4] as const
const SHOWCASE_SEQUENCE_INDEX = 3
const MAX_PUNCH_BLOCKS = 3
const SFX_MIN_GAP_SEC = 2.5
const SETUP_MAX_GAP_SEC = 2.0

const EMOTIONAL_PHRASES: { phrase: string; priority: number }[] = [
  { phrase: 'resistencia', priority: 2 },
  { phrase: 'confianza', priority: 2 },
  { phrase: 'durabilidad', priority: 3 },
  { phrase: 'desempeño', priority: 4 },
  { phrase: 'potencia', priority: 4 },
  { phrase: 'fiabilidad', priority: 3 },
  { phrase: 'seguridad', priority: 4 },
  { phrase: 'robusto', priority: 3 },
  { phrase: 'confiable', priority: 4 },
  { phrase: 'fuerza', priority: 5 },
]

const FEATURE_PHRASES: { phrase: string; priority: number }[] = [
  { phrase: 'amplia cabina', priority: 2 },
  { phrase: 'cabina amplia', priority: 2 },
  { phrase: 'pantalla multimedia', priority: 2 },
  { phrase: 'pantalla tactil', priority: 2 },
  { phrase: 'pantalla táctil', priority: 2 },
  { phrase: 'conduccion comoda', priority: 3 },
  { phrase: 'conducción cómoda', priority: 3 },
  { phrase: 'diseño robusto', priority: 3 },
  { phrase: 'bluetooth', priority: 5 },
  { phrase: 'airbag', priority: 5 },
  { phrase: 'airbags', priority: 5 },
  { phrase: 'camara de reversa', priority: 4 },
  { phrase: 'camara reversa', priority: 4 },
  { phrase: 'techo solar', priority: 5 },
  { phrase: 'tapiceria', priority: 5 },
  { phrase: 'tapicería', priority: 5 },
  { phrase: 'multimedia', priority: 4 },
]

const SPEC_PHRASES: { phrase: string; priority: number }[] = [
  { phrase: 'diésel', priority: 3 },
  { phrase: 'diesel', priority: 3 },
  { phrase: 'turbo', priority: 4 },
  { phrase: 'híbrido', priority: 3 },
  { phrase: 'hibrido', priority: 3 },
  { phrase: 'transmisión automática', priority: 4 },
  { phrase: 'transmisión manual', priority: 4 },
]

interface PhraseCandidate {
  phrase: string
  kind: HighlightKind
  priority: number
  source: 'lexicon' | 'inventory' | 'gemini'
}

export interface ApplyCaptionHighlightsOpts {
  jobId: string
  blocks: SubtitleBlock[]
  sequence: SequenceItem[]
  brandMentionTimeSec?: number
  vehicleContext?: VehicleHighlightContext
  /** false = solo léxico local */
  useGemini?: boolean
}

function countClipTransitionOverlapsBefore(clipIndex: number, sequenceLength: number): number {
  let n = 0
  for (const boundary of CLIP_BOUNDARY_INDICES) {
    if (clipIndex > boundary && boundary + 1 < sequenceLength) n++
  }
  return n
}

function computeVideoTimelineStartSec(sequence: SequenceItem[], clipIndex: number): number {
  let linear = 0
  for (let i = 0; i < clipIndex; i++) {
    linear += sequence[i]!.trim_duration
  }
  const overlap =
    CLIP_TRANSITION_OVERLAP_SEC * countClipTransitionOverlapsBefore(clipIndex, sequence.length)
  return Number(Math.max(0, linear - overlap).toFixed(3))
}

export function computeShowcaseStartSec(
  sequence: SequenceItem[],
  brandMentionTimeSec?: number
): number {
  const total = sequence.reduce((acc, it) => acc + it.trim_duration, 0)

  if (sequence.length > SHOWCASE_SEQUENCE_INDEX) {
    return computeVideoTimelineStartSec(sequence, SHOWCASE_SEQUENCE_INDEX)
  }

  if (brandMentionTimeSec != null && brandMentionTimeSec > 0) {
    return Number(Math.min(total - 4, brandMentionTimeSec + 8).toFixed(3))
  }

  return Number((total * 0.4).toFixed(3))
}

function transcriptFromBlocks(blocks: SubtitleBlock[]): string {
  return blocks.map((b) => b.text.trim()).filter(Boolean).join(' ')
}

function buildLocalCandidates(ctx?: VehicleHighlightContext): PhraseCandidate[] {
  const out: PhraseCandidate[] = []

  for (const { phrase, priority } of EMOTIONAL_PHRASES) {
    out.push({ phrase, kind: 'emotional', priority, source: 'lexicon' })
  }
  for (const { phrase, priority } of FEATURE_PHRASES) {
    out.push({ phrase, kind: 'feature', priority, source: 'lexicon' })
  }
  for (const { phrase, priority } of SPEC_PHRASES) {
    out.push({ phrase, kind: 'spec', priority, source: 'lexicon' })
  }

  if (ctx?.engineLiters?.trim()) {
    out.push({
      phrase: ctx.engineLiters.trim(),
      kind: 'spec',
      priority: 3,
      source: 'inventory',
    })
  }
  if (ctx?.transmission?.trim()) {
    const t = ctx.transmission.toLowerCase()
    if (/autom/i.test(t)) {
      out.push({
        phrase: 'transmisión automática',
        kind: 'spec',
        priority: 4,
        source: 'inventory',
      })
    }
    if (/manual/i.test(t)) {
      out.push({
        phrase: 'transmisión manual',
        kind: 'spec',
        priority: 4,
        source: 'inventory',
      })
    }
  }

  return out
}

function mergeGeminiCandidates(
  local: PhraseCandidate[],
  gemini: GeminiHighlightPhrase[]
): PhraseCandidate[] {
  const seen = new Set(local.map((c) => normalizeForMatch(c.phrase)))
  const merged = [...local]

  for (const g of gemini) {
    const norm = normalizeForMatch(g.phrase)
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    merged.push({
      phrase: g.phrase,
      kind: g.kind,
      priority: Math.max(1, g.priority - 1),
      source: 'gemini',
    })
  }

  return merged
}

function blockNorm(text: string): string {
  return normalizeForMatch(text)
}

function blockMatchesPhrase(block: SubtitleBlock, phrase: string): boolean {
  const normBlock = blockNorm(block.text)
  const normPhrase = blockNorm(phrase)
  if (!normPhrase) return false

  if (normPhrase.includes(' ')) {
    return normBlock.includes(normPhrase)
  }

  if (normBlock.includes(normPhrase)) return true

  const tokens = normBlock.split(' ').filter(Boolean)
  return tokens.some(
    (t) => t === normPhrase || (normPhrase.length >= 4 && t.startsWith(normPhrase.slice(0, 4)))
  )
}

function blockMatchesSpecNumber(block: SubtitleBlock): boolean {
  return /\b\d+[\.,]\d+\b/.test(block.text) && /\bmotor\b/i.test(block.text)
}

function isTransmisionGearBlock(text: string): boolean {
  const words = text.trim().toUpperCase().split(/\s+/)
  if (words.length !== 2) return false
  return /^TRANSMIS/i.test(words[0]!) && /^(MANUAL|AUTOM)/i.test(words[1]!)
}

function isLongPairBlock(text: string): boolean {
  if (isDriveBadgeText(text)) return false
  const words = text.trim().split(/\s+/)
  return words.length === 2 && words.every((w) => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '').length >= 5)
}

function isExcludedBlock(block: SubtitleBlock, showcaseStart: number): boolean {
  if (block.time < showcaseStart - 0.05) return true
  if (isDriveBadgeText(block.text)) return true
  if (isTransmisionGearBlock(block.text)) return true
  if (isLongPairBlock(block.text)) return true
  if (/\bcomenta\b/i.test(block.text)) return true
  if (block.highlightFx) return true
  return false
}

function isSetupBlock(block: SubtitleBlock): boolean {
  const n = blockNorm(block.text)
  return (
    /\b(ademas|además|cuenta con|tiene|incluye|ofrece|equipada|equipado)\b/.test(n) ||
    n.split(' ').length <= 3
  )
}

interface BlockMatch {
  blockIndex: number
  block: SubtitleBlock
  candidate: PhraseCandidate
  score: number
}

function scoreMatch(block: SubtitleBlock, candidate: PhraseCandidate): number {
  let score = 100 - candidate.priority * 8
  if (candidate.source === 'gemini') score += 6
  if (candidate.kind === 'feature') score += 4
  if (candidate.kind === 'emotional') score += 3
  const lenRatio = blockNorm(candidate.phrase).length / Math.max(1, blockNorm(block.text).length)
  if (lenRatio > 0.5) score += 5
  return score
}

function findBlockMatches(
  blocks: SubtitleBlock[],
  candidates: PhraseCandidate[],
  showcaseStart: number
): BlockMatch[] {
  const matches: BlockMatch[] = []

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex]!
    if (isExcludedBlock(block, showcaseStart)) continue

    let best: BlockMatch | null = null

    for (const candidate of candidates) {
      if (!blockMatchesPhrase(block, candidate.phrase)) continue
      const m: BlockMatch = {
        blockIndex,
        block,
        candidate,
        score: scoreMatch(block, candidate),
      }
      if (!best || m.score > best.score) best = m
    }

    if (!best && blockMatchesSpecNumber(block)) {
      best = {
        blockIndex,
        block,
        candidate: {
          phrase: block.text.trim(),
          kind: 'spec',
          priority: 3,
          source: 'lexicon',
        },
        score: 70,
      }
    }

    if (best) matches.push(best)
  }

  return matches
}

function assignHighlightEffects(
  blocks: SubtitleBlock[],
  matches: BlockMatch[],
  showcaseStart: number
): SubtitleBlock[] {
  const byBlock = new Map<number, BlockMatch>()
  for (const m of matches) {
    const prev = byBlock.get(m.blockIndex)
    if (!prev || m.score > prev.score) byBlock.set(m.blockIndex, m)
  }

  const punches = [...byBlock.values()].sort((a, b) => a.block.time - b.block.time).slice(0, MAX_PUNCH_BLOCKS)

  const fxByIndex = new Map<number, CaptionHighlightFx>()
  let lastSfxTime = -999

  for (const punch of punches) {
    if (punch.block.time - lastSfxTime < SFX_MIN_GAP_SEC && fxByIndex.size > 0) {
      continue
    }

    const prevBlock = blocks[punch.blockIndex - 1]
    const prevIndex = punch.blockIndex - 1
    const canUseSetup =
      prevBlock &&
      prevIndex >= 0 &&
      !fxByIndex.has(prevIndex) &&
      prevBlock.time >= showcaseStart - 0.3 &&
      !isDriveBadgeText(prevBlock.text) &&
      !prevBlock.highlightFx &&
      punch.block.time - prevBlock.time <= SETUP_MAX_GAP_SEC &&
      isSetupBlock(prevBlock)

    if (canUseSetup) {
      fxByIndex.set(prevIndex, 'pop')
      fxByIndex.set(punch.blockIndex, 'yellow_whoosh')
      lastSfxTime = punch.block.time
    } else {
      fxByIndex.set(punch.blockIndex, 'yellow_pop')
      lastSfxTime = punch.block.time
    }
  }

  if (fxByIndex.size === 0) return blocks

  return blocks.map((b, i) => {
    const fx = fxByIndex.get(i)
    if (!fx) return b
    return { ...b, highlightFx: fx }
  })
}

/**
 * Capa híbrida: léxico + inventario + Gemini opcional → metadata en bloques (Assembly timing).
 */
export async function applyCaptionHighlights(
  opts: ApplyCaptionHighlightsOpts
): Promise<SubtitleBlock[]> {
  const { jobId, blocks, sequence, brandMentionTimeSec, vehicleContext, useGemini = true } = opts

  if (blocks.length === 0) return blocks

  const showcaseStart = computeShowcaseStartSec(sequence, brandMentionTimeSec)
  let candidates = buildLocalCandidates(vehicleContext)

  if (useGemini) {
    try {
      const transcript = transcriptFromBlocks(blocks)
      const gemini = await fetchGeminiCaptionHighlights(transcript, vehicleContext ?? {}, jobId)
      candidates = mergeGeminiCandidates(candidates, gemini)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[CaptionHighlight][${jobId}] Gemini falló (solo local): ${msg}`)
    }
  }

  const matches = findBlockMatches(blocks, candidates, showcaseStart)
  const result = assignHighlightEffects(blocks, matches, showcaseStart)

  const applied = result.filter((b) => b.highlightFx)
  if (applied.length > 0) {
    console.log(
      `[CaptionHighlight][${jobId}] Showcase desde t=${showcaseStart.toFixed(2)}s → ` +
        `${applied.length} bloque(s): ` +
        applied
          .map(
            (b) =>
              `t=${b.time.toFixed(2)}s fx=${b.highlightFx} "${b.text.trim().slice(0, 28)}${b.text.length > 28 ? '…' : ''}"`
          )
          .join(' | ')
    )
  } else {
    console.log(
      `[CaptionHighlight][${jobId}] Sin highlights en showcase (t>=${showcaseStart.toFixed(2)}s, ${matches.length} match(es) crudos)`
    )
  }

  return result
}
