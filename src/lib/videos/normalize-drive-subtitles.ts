import type { SubtitleBlock } from './segmenter'
import {
  type DriveBadge,
  fixTraccionXDriveText,
  isDriveBadgeText,
  isGarbledDriveSubtitleText,
  isTraccionXLoneDriveText,
} from './drive-badge'

function wordsMatchTraccionX(block: SubtitleBlock): boolean {
  if (!block.words?.length) return false
  const tokens = block.words.map((w) =>
    w.text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  )
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i] === 'traccion' && tokens[i + 1] === 'x') return true
  }
  return false
}

function shouldNormalizeBlock(block: SubtitleBlock, badge: DriveBadge): boolean {
  const text = block.text?.trim() ?? ''
  if (!text) return false
  if (isGarbledDriveSubtitleText(text, badge)) return true
  if (wordsMatchGarbled(block, badge)) return true
  return false
}

function wordsMatchGarbled(block: SubtitleBlock, badge: DriveBadge): boolean {
  if (!block.words?.length) return false
  const tokens = block.words.map((w) =>
    w.text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  )

  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i]!
    const b = tokens[i + 1]!
    const c = tokens[i + 2]

    if (badge === '4X4') {
      if (a === 'x' && b === '4' && (c === 'a' || c === 'cuatro' || c === undefined)) return true
      if (a === '4' && b === 'x' && c === '4') return true
    }
    if (badge === '4X2') {
      if (a === 'x' && b === '4' && (c === '2' || c === 'dos' || c === undefined)) return true
      if (a === '4' && b === 'x' && c === '2') return true
    }
  }
  return false
}

/**
 * Reemplaza subtítulos mal transcritos (ej. "x 4 a") por el badge del inventario (4X4 / 4X2).
 */
export function normalizeDriveSubtitleBlocks(
  blocks: SubtitleBlock[],
  badge: DriveBadge | null,
  jobId?: string
): SubtitleBlock[] {
  if (!badge) return blocks

  return blocks.map((block) => {
    const text = block.text?.trim() ?? ''
    if (!text) return block

    if (isDriveBadgeText(text)) {
      const canonical = text.toUpperCase() as DriveBadge
      if (canonical === badge) {
        return { ...block, text: badge }
      }
      return block
    }

    const needsTraccionFix = isTraccionXLoneDriveText(text) || wordsMatchTraccionX(block)
    if (needsTraccionFix) {
      const traccionFixed = fixTraccionXDriveText(text, badge)
      if (traccionFixed && traccionFixed !== text) {
        if (jobId) {
          console.log(
            `[DriveSubtitle][${jobId}] "${text.slice(0, 40)}" → "${traccionFixed.slice(0, 40)}" (tracción X→${badge})`
          )
        }
        return {
          ...block,
          text: traccionFixed,
          words: undefined,
        }
      }
    }

    if (!shouldNormalizeBlock(block, badge)) return block

    if (jobId) {
      console.log(
        `[DriveSubtitle][${jobId}] "${text.slice(0, 40)}" → ${badge} (Assembly→inventario)`
      )
    }

    return {
      ...block,
      text: badge,
      words: undefined,
    }
  })
}
