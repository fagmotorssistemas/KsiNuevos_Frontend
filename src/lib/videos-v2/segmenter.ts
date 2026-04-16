/**
 * Segmentador V2 — Pre-procesa palabras crudas de AssemblyAI,
 * detecta silencios y construye un mapa de segmentos hablados continuos.
 * También genera el SRT ajustado desde cero para inyección directa en Creatomate.
 */

import type { RawWord } from './assemblyai'

// Pausa mínima entre palabras para considerar un separador de segmento.
// Bajamos el umbral para capturar micro-segmentos útiles (marca/modelo/año, CTA cortos).
const SILENCE_THRESHOLD_MS = 900

export interface Segment {
  segment_id: string   // "clipIndex_segmentNumber" e.g. "0_1"
  clip_index: number
  start_ms: number     // inicio en ms del video original
  end_ms: number       // fin en ms del video original
  start_s: number      // inicio en segundos
  end_s: number        // fin en segundos
  duration_s: number
  text: string
  word_count: number
  has_value: boolean
  words: RawWord[]     // palabras que componen el segmento (para SRT granular)
}

/**
 * Divide un array de palabras crudas en segmentos continuos de habla.
 * Cada vez que hay una pausa >= SILENCE_THRESHOLD_MS entre palabras,
 * se crea un nuevo segmento.
 */
export function buildSegmentMap(rawWords: RawWord[], clipIndex: number): Segment[] {
  if (rawWords.length === 0) return []

  const segments: Segment[] = []
  let segNumber = 1
  let currentWords: RawWord[] = [rawWords[0]]

  for (let i = 1; i < rawWords.length; i++) {
    const gap = rawWords[i].start - rawWords[i - 1].end

    if (gap >= SILENCE_THRESHOLD_MS) {
      segments.push(buildSegment(currentWords, clipIndex, segNumber))
      segNumber++
      currentWords = [rawWords[i]]
    } else {
      currentWords.push(rawWords[i])
    }
  }

  if (currentWords.length > 0) {
    segments.push(buildSegment(currentWords, clipIndex, segNumber))
  }

  return segments
}

function buildSegment(words: RawWord[], clipIndex: number, segNumber: number): Segment {
  const startMs = words[0].start
  const endMs = words[words.length - 1].end
  return {
    segment_id: `${clipIndex}_${segNumber}`,
    clip_index: clipIndex,
    start_ms: startMs,
    end_ms: endMs,
    start_s: Number((startMs / 1000).toFixed(3)),
    end_s: Number((endMs / 1000).toFixed(3)),
    duration_s: Number(((endMs - startMs) / 1000).toFixed(3)),
    text: words.map((w) => w.text).join(' '),
    word_count: words.length,
    has_value: true,
    words: [...words],
  }
}

// ─── Formato humano del mapa de segmentos para el prompt de Gemini ────────────

export function formatSegmentMapForPrompt(segments: Segment[]): string {
  return segments
    .map((s) =>
      `Clip ${s.clip_index} - Segmento ${s.segment_id} (${s.start_s.toFixed(2)}s a ${s.end_s.toFixed(2)}s, ${s.duration_s.toFixed(2)}s): '${s.text}'`
    )
    .join('\n')
}

// ─── SRT ajustado desde cero ──────────────────────────────────────────────────

export interface SequenceItem {
  segment_id: string
  clip_index: number
  trim_start: number   // en segundos, referencia al video original
  trim_end: number
  trim_duration: number
  order: number
  reason: string
}

/**
 * Construye un SRT con timestamps re-mapeados desde 00:00:00,000.
 * Busca cada segmento en el mapa original para tener las palabras individuales,
 * luego reajusta los timestamps al timeline final del Reel.
 */
export function buildAdjustedSRT(
  sequence: SequenceItem[],
  allSegments: Segment[]
): string {
  const segmentLookup = new Map<string, Segment>()
  for (const s of allSegments) {
    segmentLookup.set(s.segment_id, s)
  }

  const srtBlocks: string[] = []
  let blockIndex = 1
  let timelineOffsetMs = 0

  for (const item of sequence) {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) {
      timelineOffsetMs += item.trim_duration * 1000
      continue
    }

    // Filtrar solo las palabras que caen dentro del rango trim_start..trim_end
    const trimStartMs = item.trim_start * 1000
    const trimEndMs = item.trim_end * 1000
    const wordsInRange = seg.words.filter(
      (w) => w.start >= trimStartMs - 50 && w.end <= trimEndMs + 50
    )

    if (wordsInRange.length === 0) {
      // Sin palabras → generar un solo bloque con el texto del segmento
      const startSrt = msToSrtTime(timelineOffsetMs)
      const endSrt = msToSrtTime(timelineOffsetMs + item.trim_duration * 1000)
      srtBlocks.push(`${blockIndex}\n${startSrt} --> ${endSrt}\n${seg.text}`)
      blockIndex++
      timelineOffsetMs += item.trim_duration * 1000
      continue
    }

    // Agrupar palabras en bloques de ~3 palabras para subtítulos estilo Hormozi
    const WORDS_PER_BLOCK = 3
    for (let i = 0; i < wordsInRange.length; i += WORDS_PER_BLOCK) {
      const chunk = wordsInRange.slice(i, i + WORDS_PER_BLOCK)
      const chunkText = chunk.map((w) => w.text).join(' ')

      // Reubicar: offset del word dentro del segmento original → posición en timeline
      const wordOffsetFromTrimStart = chunk[0].start - trimStartMs
      const wordEndOffset = chunk[chunk.length - 1].end - trimStartMs

      const newStart = timelineOffsetMs + wordOffsetFromTrimStart
      const newEnd = timelineOffsetMs + wordEndOffset

      srtBlocks.push(
        `${blockIndex}\n${msToSrtTime(Math.max(0, newStart))} --> ${msToSrtTime(Math.max(0, newEnd))}\n${chunkText}`
      )
      blockIndex++
    }

    timelineOffsetMs += item.trim_duration * 1000
  }

  return srtBlocks.join('\n\n')
}

// ─── Bloques de subtítulos estructurados para Creatomate ──────────────────────

export interface SubtitleWordTiming {
  text: string
  /** Tiempo absoluto en la línea de tiempo del Reel (segundos) */
  start: number
  end: number
}

export interface SubtitleBlock {
  time: number     // segundos desde el inicio del Reel
  duration: number // segundos
  text: string     // 2-3 palabras
  /** Tiempos por palabra (karaoke); si hay varias, el render puede resaltar en rojo palabra a palabra */
  words?: SubtitleWordTiming[]
}

/**
 * Construye bloques de subtítulos estructurados (NO formato SRT).
 * Cada bloque tiene time, duration y texto listo para ser un elemento
 * independiente en la composición de Creatomate.
 */
export function buildSubtitleBlocks(
  sequence: SequenceItem[],
  allSegments: Segment[]
): SubtitleBlock[] {
  const segmentLookup = new Map<string, Segment>()
  for (const s of allSegments) {
    segmentLookup.set(s.segment_id, s)
  }

  const blocks: SubtitleBlock[] = []
  let timelineOffsetMs = 0

  for (const item of sequence) {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) {
      timelineOffsetMs += item.trim_duration * 1000
      continue
    }

    const trimStartMs = item.trim_start * 1000
    const trimEndMs = item.trim_end * 1000
    const wordsInRange = seg.words.filter(
      (w) => w.start >= trimStartMs - 50 && w.end <= trimEndMs + 50
    )

    if (wordsInRange.length === 0) {
      blocks.push({
        time: Number((timelineOffsetMs / 1000).toFixed(3)),
        duration: Number(item.trim_duration.toFixed(3)),
        text: seg.text,
      })
      timelineOffsetMs += item.trim_duration * 1000
      continue
    }

    const WORDS_PER_BLOCK = 3
    for (let i = 0; i < wordsInRange.length; i += WORDS_PER_BLOCK) {
      const chunk = wordsInRange.slice(i, i + WORDS_PER_BLOCK)
      const chunkText = chunk.map((w) => w.text).join(' ')

      const wordOffsetFromTrimStart = chunk[0].start - trimStartMs
      const wordEndOffset = chunk[chunk.length - 1].end - trimStartMs

      const startMs = timelineOffsetMs + wordOffsetFromTrimStart
      const endMs = timelineOffsetMs + wordEndOffset
      const durationMs = endMs - startMs

      // Mínimo 300ms de duración para que sea legible
      const finalDuration = Math.max(300, durationMs)
      const blockTimeS = Number((Math.max(0, startMs) / 1000).toFixed(3))
      const blockDurS = Number((finalDuration / 1000).toFixed(3))

      const words: SubtitleWordTiming[] = chunk.map((w) => {
        const absStart = (timelineOffsetMs + (w.start - trimStartMs)) / 1000
        const absEnd = (timelineOffsetMs + (w.end - trimStartMs)) / 1000
        return {
          text: w.text,
          start: Number(absStart.toFixed(3)),
          end: Number(absEnd.toFixed(3)),
        }
      })

      blocks.push({
        time: blockTimeS,
        duration: blockDurS,
        text: chunkText,
        words,
      })
    }

    timelineOffsetMs += item.trim_duration * 1000
  }

  return blocks
}

// ─── Helpers SRT ──────────────────────────────────────────────────────────────

function msToSrtTime(ms: number): string {
  const totalMs = Math.round(ms)
  const milliseconds = totalMs % 1000
  const totalSeconds = Math.floor(totalMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad3(milliseconds)}`
}

function pad(n: number) { return String(n).padStart(2, '0') }
function pad3(n: number) { return String(n).padStart(3, '0') }
