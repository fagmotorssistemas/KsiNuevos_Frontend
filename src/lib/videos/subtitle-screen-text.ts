import type { GuionEscena } from '@/types/video-script'
import type { SequenceItem, SubtitleBlock } from './segmenter'

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
