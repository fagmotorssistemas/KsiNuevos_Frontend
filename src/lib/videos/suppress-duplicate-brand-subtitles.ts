import type { SubtitleBlock } from './segmenter'
import { wordFuzzyMatches } from './subtitle-screen-text'

function modelFirstToken(modelLine: string): string {
  return modelLine
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '') ?? ''
}

function tokensFromBlockText(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim())
    .filter((w) => w.length >= 2)
}

function blockMentionsBrand(text: string, brand: string): boolean {
  return tokensFromBlockText(text).some((t) => wordFuzzyMatches(t, brand))
}

function blockMentionsModel(text: string, modelToken: string): boolean {
  if (modelToken.length < 3) return false
  return tokensFromBlockText(text).some((t) => wordFuzzyMatches(t, modelToken))
}

function isBrandModelMentionText(text: string, brand: string, modelToken: string): boolean {
  if (!blockMentionsBrand(text, brand)) return false
  if (modelToken.length >= 3) return blockMentionsModel(text, modelToken)
  return true
}

function blockKey(b: SubtitleBlock): string {
  return `${b.time.toFixed(3)}|${b.text.trim()}`
}

export interface SuppressDuplicateBrandSubsOpts {
  jobId?: string
  brand: string
  modelLine: string
}

/**
 * Quita el subtítulo de la primera mención oral de marca+modelo cuando el overlay de título
 * ya cubre el vehículo (t=0 o timing explícito). Evita duplicar "GETUR TRAVALLER" mal escrito.
 */
export function suppressDuplicateBrandMentionSubtitles(
  blocks: SubtitleBlock[],
  opts: SuppressDuplicateBrandSubsOpts
): SubtitleBlock[] {
  const brand = opts.brand.trim()
  const modelToken = modelFirstToken(opts.modelLine)
  if (!brand || brand.length < 2 || blocks.length === 0) return blocks

  const sorted = [...blocks].sort((a, b) => a.time - b.time || a.text.localeCompare(b.text))
  const removeKeys = new Set<string>()

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!
    const combined =
      i + 1 < sorted.length ? `${b.text} ${sorted[i + 1]!.text}` : b.text

    const singleMatch = isBrandModelMentionText(b.text, brand, modelToken)
    const pairMatch =
      i + 1 < sorted.length &&
      !singleMatch &&
      (isBrandModelMentionText(combined, brand, modelToken) ||
        (blockMentionsBrand(b.text, brand) && blockMentionsModel(sorted[i + 1]!.text, modelToken)))

    if (singleMatch) {
      removeKeys.add(blockKey(b))
      break
    }
    if (pairMatch) {
      removeKeys.add(blockKey(b))
      removeKeys.add(blockKey(sorted[i + 1]!))
      break
    }
  }

  if (removeKeys.size === 0) return blocks

  const filtered = blocks.filter((b) => !removeKeys.has(blockKey(b)))
  if (opts.jobId) {
    console.log(
      `[BrandSubtitleDedup][${opts.jobId}] Primera mención oral suprimida (${blocks.length} → ${filtered.length} bloques) ` +
        `marca="${brand}" modelo≈"${modelToken}"`
    )
  }
  return filtered
}
