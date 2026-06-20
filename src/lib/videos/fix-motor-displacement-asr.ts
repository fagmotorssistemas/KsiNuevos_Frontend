import type { RawWord } from './assemblyai'

const MOTOR_RE = /^motor(es)?$/i
const HORAS_RE = /^horas?$/i
const MINUTOS_RE = /^minutos?$/i
const FUEL_RE = /^(diesel|di[eé]sel|turbo|intercooler|crdi|gasolina|gas|hp|caballos?)$/i

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
}

export type FixMotorDisplacementOpts = {
  /** Cilindrada del inventario / vehicle_line_2, p. ej. "2.5". */
  expectedDisplacement?: string | null
  jobId?: string
  clipIndex?: number
}

/** Extrae cilindrada tipo 2.5 de la ficha del vehículo. */
export function extractEngineDisplacementFromVehicleText(
  text: string | null | undefined
): string | null {
  if (!text?.trim()) return null
  const m = text.match(/\b(\d)[.,](\d)\b/)
  if (!m) return null
  return `${m[1]}.${m[2]}`
}

function normalizeToken(text: string): string {
  return text.trim().replace(/[,.:;!?]+$/g, '')
}

function parseDisplacementDigitToken(text: string): number | null {
  const core = normalizeToken(text).toLowerCase()
  if (/^\d+$/.test(core)) {
    const n = parseInt(core, 10)
    return n >= 0 && n <= 9 ? n : null
  }
  return NUMBER_WORDS[core] ?? null
}

function isFuelWord(text: string): boolean {
  return FUEL_RE.test(normalizeToken(text))
}

function isMotorWord(text: string): boolean {
  return MOTOR_RE.test(normalizeToken(text))
}

function hasMotorContext(words: RawWord[], beforeIndex: number, lookback = 8): boolean {
  for (let j = Math.max(0, beforeIndex - lookback); j < beforeIndex; j++) {
    if (isMotorWord(words[j]!.text)) return true
  }
  return false
}

function hasFuelContext(words: RawWord[], afterIndex: number, lookahead = 3): boolean {
  for (let j = afterIndex + 1; j <= Math.min(words.length - 1, afterIndex + lookahead); j++) {
    if (isFuelWord(words[j]!.text)) return true
  }
  return false
}

function resolveReplacement(
  n: number,
  m: number,
  expected: string | null | undefined
): string | null {
  const fromPattern = `${n}.${m}`
  if (!expected?.trim()) return fromPattern
  const norm = expected.trim().replace(',', '.')
  const [eInt, eDec] = norm.split('.')
  if (eInt === String(n) && eDec === String(m)) return norm
  return null
}

function tryMergeHourMinutePattern(
  words: RawWord[],
  start: number,
  expected: string | null | undefined
): { word: RawWord; nextIndex: number; log: string } | null {
  if (start + 3 >= words.length) return null

  const nTok = words[start]!
  const horasTok = words[start + 1]!
  const mTok = words[start + 2]!
  const minTok = words[start + 3]!

  if (!HORAS_RE.test(horasTok.text) || !MINUTOS_RE.test(minTok.text)) return null

  const n = parseDisplacementDigitToken(nTok.text)
  const m = parseDisplacementDigitToken(mTok.text)
  if (n == null || m == null) return null
  if (!hasMotorContext(words, start)) return null
  if (!hasFuelContext(words, start + 3)) return null

  const replacement = resolveReplacement(n, m, expected)
  if (!replacement) return null

  return {
    word: { text: replacement, start: nTok.start, end: minTok.end },
    nextIndex: start + 4,
    log: `"${nTok.text} ${horasTok.text} ${mTok.text} ${minTok.text}" → "${replacement}"`,
  }
}

/** N horas M + combustible (sin token "minutos"), p. ej. "dos horas cuatro diésel". */
function tryMergeHourFuelPattern(
  words: RawWord[],
  start: number,
  expected: string | null | undefined
): { word: RawWord; nextIndex: number; log: string } | null {
  if (start + 2 >= words.length) return null

  const nTok = words[start]!
  const horasTok = words[start + 1]!
  const mTok = words[start + 2]!

  if (!HORAS_RE.test(horasTok.text)) return null
  if (start + 3 < words.length && MINUTOS_RE.test(words[start + 3]!.text)) return null

  const n = parseDisplacementDigitToken(nTok.text)
  const m = parseDisplacementDigitToken(mTok.text)
  if (n == null || m == null) return null
  if (!hasMotorContext(words, start)) return null
  if (!hasFuelContext(words, start + 2)) return null

  const replacement = resolveReplacement(n, m, expected)
  if (!replacement) return null

  return {
    word: { text: replacement, start: nTok.start, end: mTok.end },
    nextIndex: start + 3,
    log: `"${nTok.text} ${horasTok.text} ${mTok.text}" → "${replacement}"`,
  }
}

/**
 * Corrige ASR que confunde cilindrada (2.5) con duración ("2 horas 5 minutos")
 * cuando hay contexto motor + combustible. Solo afecta ese patrón.
 */
export function fixMotorDisplacementAsrWords(
  words: RawWord[],
  opts: FixMotorDisplacementOpts = {}
): RawWord[] {
  if (words.length < 3) return words

  const result: RawWord[] = []
  const fixLogs: string[] = []
  let i = 0

  while (i < words.length) {
    const merged4 = tryMergeHourMinutePattern(words, i, opts.expectedDisplacement)
    if (merged4) {
      result.push(merged4.word)
      fixLogs.push(merged4.log)
      i = merged4.nextIndex
      continue
    }

    const merged3 = tryMergeHourFuelPattern(words, i, opts.expectedDisplacement)
    if (merged3) {
      result.push(merged3.word)
      fixLogs.push(merged3.log)
      i = merged3.nextIndex
      continue
    }

    result.push({ ...words[i]! })
    i++
  }

  if (fixLogs.length > 0) {
    const clipTag = opts.clipIndex != null ? `_clip${opts.clipIndex}` : ''
    const tag = opts.jobId ? `[MotorDispFix][${opts.jobId}${clipTag}]` : '[MotorDispFix]'
    const hint =
      opts.expectedDisplacement?.trim() ? ` (inventario ${opts.expectedDisplacement.trim()})` : ''
    console.log(`${tag} ${fixLogs.join('; ')}${hint}`)
  }

  return result
}
