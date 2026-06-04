import type { GuionEscena } from '@/types/video-script'
import type { Segment, SequenceItem, SubtitleBlock } from './segmenter'

/** Umbral para alinear bloque Assembly ↔ escena usando solo `dialogo` (nunca se muestra en pantalla). */
const MIN_DIALOGUE_ALIGN = 0.18

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(s: string): Set<string> {
  const out = new Set<string>()
  for (const w of normalizeForMatch(s).split(' ')) {
    if (w.length > 1) out.add(w)
  }
  return out
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenSet(a)
  const sb = tokenSet(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const t of sa) {
    if (sb.has(t)) inter++
  }
  return inter / (sa.size + sb.size - inter)
}

/** Escena de cierre institucional (logo PNG al final del reel, no subtítulo). */
export function isInstitutionalClosingEscena(e: GuionEscena): boolean {
  if (e.accion?.trim().toLowerCase().includes('logo')) return true
  const compact = normalizeForMatch(e.texto_pantalla ?? '').replace(/\s+/g, '')
  return compact === 'ksinuevos' || compact === 'ksinuevo' || compact === 'ksinuevas'
}

/** Extrae número de escena del reason de secuencia por guión (p. ej. "guión escena 3: …"). */
export function parseEscenaNumberFromSequenceReason(reason?: string | null): number | null {
  if (!reason) return null
  const m = reason.match(/gui[oó]n escena\s+(\d+)/i)
  if (!m) return null
  const n = parseInt(m[1]!, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Un `texto_pantalla` por corte del montaje, en el mismo timeline que Shotstack (sin solapar).
 * Usar cuando la secuencia viene de tryBuildSequenceFromGuionDialogues.
 */
export function applyScreenTextFromGuionSequence(
  sequence: SequenceItem[],
  escenas: GuionEscena[],
  jobId?: string
): SubtitleBlock[] {
  const pantallaByEsc = new Map<number, string>()
  for (const e of escenas) {
    if (!e.texto_pantalla?.trim() || isInstitutionalClosingEscena(e)) continue
    pantallaByEsc.set(e.esc, e.texto_pantalla!.trim())
  }

  const escenasConPantalla = [...escenas]
    .filter((e) => e.texto_pantalla?.trim() && !isInstitutionalClosingEscena(e))
    .sort((a, b) => a.esc - b.esc)

  let timeline = 0
  const out: SubtitleBlock[] = []

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]!
    const dur = Number(Math.max(0.12, item.trim_duration).toFixed(3))
    const escNum = parseEscenaNumberFromSequenceReason(item.reason)
    const pantalla =
      (escNum != null ? pantallaByEsc.get(escNum) : undefined) ??
      escenasConPantalla[i]?.texto_pantalla?.trim()

    if (pantalla) {
      out.push({
        time: Number(timeline.toFixed(3)),
        duration: dur,
        text: pantalla,
      })
      if (jobId) {
        console.log(
          `[SubtitleGuion][${jobId}] escena ${escNum ?? i + 1} clip${item.clip_index} ` +
            `t=${timeline.toFixed(2)}s +${dur}s → "${pantalla.slice(0, 56)}${pantalla.length > 56 ? '…' : ''}"`
        )
      }
    }
    timeline += dur
  }

  return out
}

/**
 * Sustituye subtítulos por `texto_pantalla` únicamente.
 * `dialogo` solo sirve para alinear tiempos con Assembly; nunca va al render.
 * Un bloque de salida por escena con texto en pantalla.
 */
export function applyScreenTextFromGuion(
  blocks: SubtitleBlock[],
  escenas: GuionEscena[]
): SubtitleBlock[] {
  const rows = [...escenas]
    .filter(
      (e) =>
        e.texto_pantalla?.trim() &&
        Number.isFinite(e.esc) &&
        !isInstitutionalClosingEscena(e)
    )
    .sort((a, b) => a.esc - b.esc)

  if (rows.length === 0) return blocks

  const sorted = [...blocks]
    .filter((b) => b.text.trim().length > 0 || b.duration > 0)
    .sort((a, b) => a.time - b.time)

  if (sorted.length === 0) return []

  const used = new Set<number>()
  const out: SubtitleBlock[] = []

  for (const row of rows) {
    const pantalla = row.texto_pantalla!.trim()
    const dialogo = row.dialogo?.trim() ?? ''

    let bestIdx = -1
    let bestScore = MIN_DIALOGUE_ALIGN

    if (dialogo) {
      for (let i = 0; i < sorted.length; i++) {
        if (used.has(i)) continue
        const score = jaccardSimilarity(sorted[i]!.text, dialogo)
        if (score > bestScore) {
          bestScore = score
          bestIdx = i
        }
      }
    }

    if (bestIdx < 0) {
      for (let i = 0; i < sorted.length; i++) {
        if (!used.has(i)) {
          bestIdx = i
          break
        }
      }
    }

    if (bestIdx < 0) continue

    used.add(bestIdx)
    const matched = sorted[bestIdx]!

    out.push({
      time: Number(matched.time.toFixed(3)),
      duration: Number(Math.max(0.24, matched.duration).toFixed(3)),
      text: pantalla,
      ...(matched.words?.length ? { words: matched.words } : {}),
    })
  }

  return out
}

export { jaccardSimilarity, normalizeForMatch, tokenSet }

// ─── Caption blocks from dialogo + Assembly word-level timing ─────────────────

/**
 * Divide el dialogo en tokens preservando TODO el texto.
 * Incluye artículos, preposiciones, números (1.5, 4x4, etc.).
 * Solo elimina puntuación extrema de cada token; no filtra palabras.
 */
function tokenizeDialogo(dialogo: string): string[] {
  return dialogo
    .split(/\s+/)
    .map(w => w.replace(/^[.,;:!?¡¿"'()\-]+|[.,;:!?¡¿"'()\-]+$/g, '').trim())
    .filter(w => w.length > 0)
}

function chunkTokens(arr: string[], size: number): string[][] {
  const result: string[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

/**
 * Chunking inteligente que mantiene pares técnicos juntos:
 * TRANSMISIÓN+MANUAL, TRANSMISIÓN+AUTOMÁTICA, MOTOR+[número], etc.
 * El word antes o después del par puede quedar solo.
 */
function smartChunkTokens(tokens: string[], size: number): string[][] {
  // Token que "abre" un par técnico bloqueado
  const PAIR_TRIGGER  = /^(transmis|motor)/i
  // Token que puede "cerrar" un par técnico (va después del trigger)
  const PAIR_FOLLOW   = /^(manual|autom[aá]t|\d+[\.,]\d+|\d{3,4}cc)/i

  // Paso 1: agrupar tokens en "unidades" (par bloqueado = 1 unidad de 2 tokens)
  const units: string[][] = []
  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]!
    if (
      PAIR_TRIGGER.test(tok) &&
      i + 1 < tokens.length &&
      PAIR_FOLLOW.test(tokens[i + 1]!)
    ) {
      units.push([tok, tokens[i + 1]!])
      i += 2
    } else {
      units.push([tok])
      i++
    }
  }

  // Paso 2: agrupar unidades en chunks de `size` tokens (sin romper unidades)
  const chunks: string[][] = []
  let current: string[] = []
  for (const unit of units) {
    if (current.length > 0 && current.length + unit.length > size) {
      chunks.push(current)
      current = [...unit]
    } else {
      current.push(...unit)
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

/** Coincidencia difusa por prefijo de 4 caracteres (maneja errores de Assembly). */
function wordFuzzyMatches(assemblyWord: string, keyword: string): boolean {
  const a = normalizeForMatch(assemblyWord)
  const k = normalizeForMatch(keyword)
  if (a.length < 2 || k.length < 2) return false
  const pLen = Math.min(4, Math.min(a.length, k.length))
  return a.slice(0, pLen) === k.slice(0, pLen)
}

function findFirstMatchingWordIdx(
  asmWords: { text: string; start: number; end: number }[],
  keywords: string[],
  fromIdx = 0
): number {
  for (let i = fromIdx; i < asmWords.length; i++) {
    if (keywords.some(k => wordFuzzyMatches(asmWords[i]!.text, k))) return i
  }
  return -1
}

function addKeywordCaptionBlocks(
  keywords: string[],
  asmWords: { text: string; start: number; end: number }[],
  trimStartMs: number,
  timelineOffsetMs: number,
  sceneDurMs: number,
  out: SubtitleBlock[]
): void {
  if (keywords.length === 0) return
  const chunks = smartChunkTokens(keywords, 2)

  if (asmWords.length === 0) {
    // Sin Assembly → distribuir uniformemente en la escena
    const chunkDurMs = sceneDurMs / chunks.length
    chunks.forEach((chunk, ci) => {
      out.push({
        time: Number(((timelineOffsetMs + ci * chunkDurMs) / 1000).toFixed(3)),
        duration: Number(Math.max(0.3, chunkDurMs / 1000).toFixed(3)),
        text: chunk.join(' ').toUpperCase(),
      })
    })
    return
  }

  let lastAsmIdx = 0
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci]!
    const chunkText = chunk.join(' ').toUpperCase()

    const matchIdx = findFirstMatchingWordIdx(asmWords, chunk, lastAsmIdx)
    let startMs: number
    if (matchIdx >= 0) {
      startMs = timelineOffsetMs + (asmWords[matchIdx]!.start - trimStartMs)
      lastAsmIdx = matchIdx + 1
    } else {
      // Fallback: posición proporcional
      const fraction = ci / chunks.length
      startMs = timelineOffsetMs + fraction * sceneDurMs
    }

    // Duración hasta el inicio del siguiente chunk (o fin de escena)
    const nextMatchIdx = ci + 1 < chunks.length
      ? findFirstMatchingWordIdx(asmWords, chunks[ci + 1]!, lastAsmIdx)
      : -1
    const endMs = nextMatchIdx >= 0
      ? timelineOffsetMs + (asmWords[nextMatchIdx]!.start - trimStartMs)
      : timelineOffsetMs + sceneDurMs

    out.push({
      time: Number((Math.max(0, startMs) / 1000).toFixed(3)),
      duration: Number(Math.max(0.12, (endMs - startMs) / 1000).toFixed(3)),
      text: chunkText,
    })
  }
}

/**
 * Construye bloques de subtítulos usando el contenido de `dialogo` de cada escena
 * y los timestamps exactos de palabras de AssemblyAI.
 *
 * Reglas:
 * - Cada `dialogo` → palabras clave (sin relleno) → bloques de subtítulo con timing Assembly
 * - PRIMERA vez que el `dialogo` menciona marca+modelo → bloque de overlay de título (brandTimeSec/brandLengthSec)
 *   - Dentro de esa misma escena, las palabras clave restantes (no-marca) siguen como subtítulos normales
 * - Menciones posteriores de marca+modelo → subtítulos normales
 */
export function buildCaptionBlocksFromDialogoAssembly(
  sequence: SequenceItem[],
  allSegments: Segment[],
  escenas: GuionEscena[],
  /** Palabras clave de la marca/modelo, ej: ['ford', 'ecosport'] */
  brandKeywords: string[],
  jobId?: string
): { captionBlocks: SubtitleBlock[]; brandTimeSec: number | null; brandLengthSec: number | null } {
  const segLookup = new Map<string, Segment>()
  for (const s of allSegments) segLookup.set(s.segment_id, s)

  const escenaByNum = new Map<number, GuionEscena>()
  for (const e of escenas) escenaByNum.set(e.esc, e)
  const escenasOrdered = [...escenas].sort((a, b) => a.esc - b.esc)

  const cleanBrandKws = brandKeywords
    .map(k => normalizeForMatch(k))
    .filter(k => k.length >= 3)

  const hasBrand = (kws: string[]) =>
    cleanBrandKws.length > 0 &&
    kws.some(kw => cleanBrandKws.some(bk => wordFuzzyMatches(kw, bk)))

  const captionBlocks: SubtitleBlock[] = []
  let brandTimeSec: number | null = null
  let brandLengthSec: number | null = null
  let brandFoundOnce = false
  let timelineOffsetMs = 0

  for (let si = 0; si < sequence.length; si++) {
    const item = sequence[si]!
    const trimStartMs = item.trim_start * 1000
    const sceneDurMs  = item.trim_duration * 1000

    const escNum  = parseEscenaNumberFromSequenceReason(item.reason)
    const escena  = (escNum != null ? escenaByNum.get(escNum) : undefined) ?? escenasOrdered[si]

    if (escena && isInstitutionalClosingEscena(escena)) {
      timelineOffsetMs += sceneDurMs
      continue
    }

    const dialogo  = escena?.dialogo?.trim() ?? ''
    // Dialogo completo tokenizado — sin filtrar nada (se muestra parte a parte)
    const keywords = dialogo ? tokenizeDialogo(dialogo) : []

    const seg      = segLookup.get(item.segment_id)
    const asmWords = seg
      ? seg.words.filter(w => w.start >= trimStartMs - 50 && w.end <= trimStartMs + sceneDurMs + 50)
      : []

    const sceneLabelForLog = `escena ${escNum ?? si + 1}`

    if (hasBrand(keywords) && !brandFoundOnce) {
      // ── PRIMERA mención de marca: overlay de título ──────────────────────
      brandFoundOnce = true

      // Encontrar el índice del ÚLTIMO keyword de marca en el diálogo tokenizado
      // (ej: ["El", "FORD", "ECOSPORT", "ofrece"] → lastBrandTokenIdx = 2)
      let lastBrandTokenIdx = -1
      for (let i = 0; i < keywords.length; i++) {
        if (cleanBrandKws.some(bk => wordFuzzyMatches(keywords[i]!, bk))) {
          lastBrandTokenIdx = i
        }
      }
      // Solo las palabras que vienen DESPUÉS del último keyword de marca → subtítulos
      const postBrandKws = lastBrandTokenIdx >= 0 ? keywords.slice(lastBrandTokenIdx + 1) : []
      const brandKws     = lastBrandTokenIdx >= 0 ? keywords.slice(0, lastBrandTokenIdx + 1).filter(kw => cleanBrandKws.some(bk => wordFuzzyMatches(kw, bk))) : []

      let brandStartMs = timelineOffsetMs
      let brandEndMs   = timelineOffsetMs + sceneDurMs

      if (asmWords.length > 0) {
        const firstBrandIdx = findFirstMatchingWordIdx(asmWords, brandKws.length > 0 ? brandKws : keywords)
        if (firstBrandIdx >= 0) {
          brandStartMs = timelineOffsetMs + (asmWords[firstBrandIdx]!.start - trimStartMs)
        }
        if (postBrandKws.length > 0) {
          const firstPostBrandIdx = findFirstMatchingWordIdx(asmWords, postBrandKws)
          if (firstPostBrandIdx >= 0) {
            brandEndMs = timelineOffsetMs + (asmWords[firstPostBrandIdx]!.start - trimStartMs)
            // Palabras DESPUÉS de la marca → subtítulos normales desde ese punto
            addKeywordCaptionBlocks(
              postBrandKws,
              asmWords.slice(firstPostBrandIdx),
              trimStartMs,
              timelineOffsetMs,
              sceneDurMs,
              captionBlocks
            )
          }
        }
      } else if (postBrandKws.length > 0) {
        // Sin Assembly: las post-marca van como subtítulos proporcionales
        addKeywordCaptionBlocks(postBrandKws, [], trimStartMs, timelineOffsetMs, sceneDurMs, captionBlocks)
      }

      brandTimeSec  = Number((Math.max(0, brandStartMs) / 1000).toFixed(3))
      brandLengthSec = Number((Math.max(0.5, brandEndMs - brandStartMs) / 1000).toFixed(3))

      console.log(
        `[SubtitleDialogo]${jobId ? `[${jobId}]` : ''} ${sceneLabelForLog} → ` +
        `BRAND OVERLAY t=${brandTimeSec.toFixed(2)}s +${brandLengthSec.toFixed(2)}s ` +
        `dialogo="${dialogo.slice(0, 60)}"`
      )
    } else if (keywords.length > 0) {
      // ── Subtítulo normal ─────────────────────────────────────────────────
      const prevLen = captionBlocks.length
      addKeywordCaptionBlocks(keywords, asmWords, trimStartMs, timelineOffsetMs, sceneDurMs, captionBlocks)
      const newBlocks = captionBlocks.slice(prevLen)
      for (const b of newBlocks) {
        console.log(
          `[SubtitleDialogo]${jobId ? `[${jobId}]` : ''} ${sceneLabelForLog} → ` +
          `caption t=${b.time.toFixed(2)}s +${b.duration.toFixed(2)}s "${b.text.slice(0, 40)}"`
        )
      }
    }

    timelineOffsetMs += sceneDurMs
  }

  return { captionBlocks, brandTimeSec, brandLengthSec }
}
