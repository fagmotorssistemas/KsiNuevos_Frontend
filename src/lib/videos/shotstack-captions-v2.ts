/**
 * Captions V2 — lineal fijo abajo (sin alternar ni olas).
 * Tipografía: Montserrat 900 HTML; tamaño fijo ~90px (el que quedó bien).
 *
 * Karaoke = UN solo clip: la frase no se mueve ni cambia de tamaño;
 * solo la palabra activa pasa a #9F0712 y la anterior vuelve a blanco.
 * Empaquetado: ≤14 chars; palabras ≥9 van solas.
 */

import type { SubtitleBlock } from './segmenter'
import {
  OUTPUT_WIDTH,
  s720,
  htmlEscape,
  dropOverlappingSubtitleBlocks,
  type ShotstackClip,
  type ShotstackTrack,
} from './shotstack-captions-shared'

export function buildCaptionHtmlTracksV2(
  blocks: SubtitleBlock[],
  totalDuration: number,
  jobId?: string
): ShotstackTrack[] {
  void totalDuration
  const safe = jobId ? dropOverlappingSubtitleBlocks(blocks, jobId) : blocks
  const validBlocks = safe.filter((b) => b.text?.trim() && b.duration > 0.01)
  if (validBlocks.length === 0) return []

  const CAPTION_V2_OFFSET_Y = 0.15
  const CAPTION_V2_ACTIVE_COLOR = '#9F0712'
  const CAPTION_V2_BASE_COLOR = '#FFFFFF'
  const MAX_VISIBLE_CHARS = 14
  const LONG_WORD_SOLO = 9
  const CHAR_EM = 0.68
  const WORD_GAP_EM = 0.3
  const USEFUL_LINE_W = Math.floor(OUTPUT_WIDTH * 0.88)
  const captionBoxW = s720(700)
  const captionBoxH = s720(200)
  const MIN_WORD_SEC = 0.12
  /** Tamaño que quedó bien (HTML Montserrat 900, karaoke solo-color). */
  const V2_FONT_PX = 90

  const clips: ShotstackClip[] = []
  let chunkCount = 0
  let karaokeSlices = 0

  function glyphWidthPx(word: string, fontPx: number): number {
    return Math.max(fontPx * 0.5, word.length * CHAR_EM * fontPx)
  }

  function estimateLinePx(words: string[], fontPx: number): number {
    if (words.length === 0) return 0
    const gap = WORD_GAP_EM * fontPx
    return (
      words.reduce((a, w) => a + glyphWidthPx(w, fontPx), 0) +
      gap * Math.max(0, words.length - 1)
    )
  }

  function packVisibleChunks(words: string[], fontPx: number): string[][] {
    const chunks: string[][] = []
    let cur: string[] = []
    let len = 0

    function flush() {
      if (cur.length > 0) chunks.push(cur)
      cur = []
      len = 0
    }

    for (const w of words) {
      if (w.length >= LONG_WORD_SOLO) {
        flush()
        chunks.push([w])
        continue
      }
      const nextLen = cur.length === 0 ? w.length : len + 1 + w.length
      const nextWords = cur.length === 0 ? [w] : [...cur, w]
      const tooManyChars = cur.length > 0 && nextLen > MAX_VISIBLE_CHARS
      const tooWide =
        cur.length > 0 && estimateLinePx(nextWords, fontPx) > USEFUL_LINE_W
      if (tooManyChars || tooWide) {
        flush()
        cur = [w]
        len = w.length
      } else {
        cur.push(w)
        len = nextLen
      }
    }
    flush()
    return chunks
  }

  function fitFontSize(words: string[], preferred: number): number {
    const line = estimateLinePx(words, preferred)
    if (line <= USEFUL_LINE_W) return preferred
    const totalChars =
      words.reduce((a, w) => a + w.length, 0) + Math.max(0, words.length - 1)
    const fitted = Math.floor(USEFUL_LINE_W / (totalChars * CHAR_EM))
    return Math.max(56, Math.min(preferred, fitted))
  }

  /**
   * Una sola línea HTML: tamaño/espacio/posición fijos.
   * Solo cambia el color de la palabra activa (<b>).
   */
  function karaokeHtml(
    words: string[],
    activeIndex: number,
    fontPx: number
  ): { html: string; css: string } {
    const inner = words
      .map((w, i) =>
        i === activeIndex ? `<b>${htmlEscape(w)}</b>` : htmlEscape(w)
      )
      .join(' ')
    return {
      html: `<p>${inner}</p>`,
      css:
        // Familia exacta del TTF Montserrat-Black (subfamily Regular).
        // No usar 'Montserrat'+900: Shotstack HTML no matchea y cae a sans delgada.
        `p { font-family: 'Montserrat Black'; font-weight: normal; font-size: ${fontPx}px; ` +
        `text-align: center; text-transform: uppercase; color: ${CAPTION_V2_BASE_COLOR}; ` +
        `margin: 0; line-height: 1.15; } ` +
        `b { color: ${CAPTION_V2_ACTIVE_COLOR}; font-weight: normal; }`,
    }
  }

  type KaraokeSlice = { start: number; length: number; active: number }

  function chunkWindows(
    b: SubtitleBlock,
    chunks: string[][],
    allWords: string[]
  ): { start: number; length: number; wordTimings?: { start: number; end: number }[] }[] {
    const blockStart = Number(b.time.toFixed(3))
    const blockLen = Number(b.duration.toFixed(3))
    const blockEnd = Number((blockStart + blockLen).toFixed(3))
    const weights = chunks.map((c) => Math.max(1, c.length))
    const weightSum = weights.reduce((a, c) => a + c, 0)

    let wordOffset = 0
    const windows: {
      start: number
      length: number
      wordTimings?: { start: number; end: number }[]
    }[] = []

    let t = blockStart
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]!
      const isLast = ci === chunks.length - 1
      const remaining = Number((blockEnd - t).toFixed(3))
      if (remaining <= 0.01) break

      let length: number
      if (isLast) {
        length = remaining
      } else {
        const share = (weights[ci]! / weightSum) * blockLen
        length = Number(
          Math.min(
            remaining - 0.08 * (chunks.length - 1 - ci),
            Math.max(MIN_WORD_SEC * chunk.length, share)
          ).toFixed(3)
        )
        length = Number(Math.max(0.08, length).toFixed(3))
      }

      let wordTimings: { start: number; end: number }[] | undefined
      if (b.words && b.words.length === allWords.length) {
        wordTimings = b.words
          .slice(wordOffset, wordOffset + chunk.length)
          .map((w) => ({ start: w.start, end: w.end }))
      }
      wordOffset += chunk.length

      windows.push({ start: Number(t.toFixed(3)), length, wordTimings })
      t = Number((t + length).toFixed(3))
    }
    return windows
  }

  function karaokeSlicesForChunk(
    wordCount: number,
    chunkStart: number,
    chunkLen: number,
    wordTimings?: { start: number; end: number }[]
  ): KaraokeSlice[] {
    const chunkEnd = Number((chunkStart + chunkLen).toFixed(3))

    if (wordCount <= 1) {
      return [{ start: chunkStart, length: chunkLen, active: 0 }]
    }

    if (wordTimings && wordTimings.length === wordCount) {
      const out: KaraokeSlice[] = []
      for (let i = 0; i < wordCount; i++) {
        const w = wordTimings[i]!
        const start =
          i === 0
            ? chunkStart
            : Number(Math.max(chunkStart, Math.min(chunkEnd, w.start)).toFixed(3))
        const end =
          i === wordCount - 1
            ? chunkEnd
            : Number(
                Math.max(
                  start + 0.05,
                  Math.min(chunkEnd, wordTimings[i + 1]!.start)
                ).toFixed(3)
              )
        out.push({
          start,
          length: Number(Math.max(0.05, end - start).toFixed(3)),
          active: i,
        })
      }
      return out
    }

    const ideal = chunkLen / wordCount
    const wordDur = Number(Math.max(MIN_WORD_SEC, ideal).toFixed(3))
    const out: KaraokeSlice[] = []
    let t = chunkStart
    for (let i = 0; i < wordCount; i++) {
      const isLast = i === wordCount - 1
      const remaining = Number((chunkEnd - t).toFixed(3))
      if (remaining <= 0.01) break
      const len = isLast
        ? remaining
        : Number(
            Math.min(
              wordDur,
              Math.max(0.08, remaining - 0.08 * (wordCount - 1 - i))
            ).toFixed(3)
          )
      out.push({ start: Number(t.toFixed(3)), length: len, active: i })
      t = Number((t + len).toFixed(3))
    }
    return out
  }

  function pushKaraokeSlice(
    words: string[],
    slice: KaraokeSlice,
    fontPx: number
  ) {
    karaokeSlices++
    // Un solo formato tipográfico (Montserrat 900) para 1 o N palabras.
    // Solo cambia el color de la activa; sin mezclar rich-text + html.
    const { html, css } = karaokeHtml(words, slice.active, fontPx)
    clips.push({
      asset: {
        type: 'html',
        html,
        css,
        width: captionBoxW,
        height: captionBoxH,
        background: 'transparent',
      },
      start: slice.start,
      length: slice.length,
      position: 'bottom',
      offset: { x: 0, y: CAPTION_V2_OFFSET_Y },
    })
  }

  for (const b of validBlocks) {
    const text = b.text.trim().toUpperCase()
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length === 0) continue

    const chunks = packVisibleChunks(words, V2_FONT_PX)
    const windows = chunkWindows(b, chunks, words)

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]!
      const win = windows[ci]
      if (!win || win.length <= 0.01) continue

      chunkCount++
      const sz = fitFontSize(chunk, V2_FONT_PX)
      const slices = karaokeSlicesForChunk(
        chunk.length,
        win.start,
        win.length,
        win.wordTimings
      )
      for (const slice of slices) {
        if (slice.length <= 0.01) continue
        pushKaraokeSlice(chunk, slice, sz)
      }
    }
  }

  if (jobId) {
    console.log(
      `[Shotstack][${jobId}] Captions V2: ${validBlocks.length} frase(s), ` +
        `${chunkCount} grupo(s)≤${MAX_VISIBLE_CHARS} chars, ${karaokeSlices} slices, ` +
        `karaoke solo-color ~${V2_FONT_PX}px Montserrat`
    )
  }

  return clips.length > 0 ? [{ clips }] : []
}
