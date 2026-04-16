/**
 * Módulo Gemini V2 — Análisis multimodal (video + mapa de segmentos) para la Fábrica de Reels.
 *
 * Cuando useVisualAnalysis=true, Gemini recibe tanto los videos reales
 * (subidos al File API de Google) como el mapa de segmentos en texto.
 * Cuando useVisualAnalysis=false (fallback), solo recibe el texto.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Segment, SequenceItem } from './segmenter'
import type { GoogleFileRef } from './google-file-api'

const MODEL_VISUAL = 'gemini-2.5-flash'
const MODEL_TEXT = 'gemini-2.5-flash'
const GEMINI_TIMEOUT_MS = 180_000
const MAX_RETRIES = 2

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

// ─── Tipos de respuesta ──────────────────────────────────────────────────────

export interface GeminiSegmentAnalysis {
  sequence: SequenceItem[]
  total_duration: number
  overall_strategy: string
}

// ─── Extracción JSON ─────────────────────────────────────────────────────────

function extractJsonObject(text: string): string {
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No se encontró JSON válido en la respuesta: ${stripped.slice(0, 300)}`)
  }

  return stripped.slice(start, end + 1)
}

// ─── Validación de secuencia ─────────────────────────────────────────────────

const CAR_BRANDS = [
  'hyundai', 'kia', 'toyota', 'chevrolet', 'mazda', 'nissan', 'suzuki',
  'ford', 'honda', 'mitsubishi', 'renault', 'volkswagen', 'vw'
]

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isMistakeSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  return /me equivoque|equivoc|otra vez|de nuevo/.test(t)
}

function isPresentationSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasModelLikeToken = /\b[hx]?\d{1,3}\b/.test(t) || /\b(prado|picanto|hilux|rio|elantra|accent)\b/.test(t)
  return hasBrand || hasYear || hasModelLikeToken
}

function isEndCtaSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  return /solo aqui|ksi nuevos|casi nuevos|comenta\b/.test(t)
}

function enforceEditorialOrder(sequence: SequenceItem[], allSegments: Segment[]): SequenceItem[] {
  const lookup = new Map(allSegments.map((s) => [s.segment_id, s] as const))
  const intro: SequenceItem[] = []
  const middle: SequenceItem[] = []
  const outro: SequenceItem[] = []

  for (const item of sequence) {
    const seg = lookup.get(item.segment_id)
    if (!seg) {
      middle.push(item)
      continue
    }
    if (isEndCtaSegment(seg)) outro.push(item)
    else if (isPresentationSegment(seg)) intro.push(item)
    else middle.push(item)
  }

  return [...intro, ...middle, ...outro]
}

/** Normaliza texto para comparar si dos tomas dicen lo mismo (no confundir con solo repetir nombre de auto). */
function normalizeForDedupe(text: string): string {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordCountNormalized(t: string): number {
  return t.split(/\s+/).filter(Boolean).length
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return dp[n]
}

function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const d = levenshtein(a, b)
  return 1 - d / Math.max(a.length, b.length)
}

/**
 * True si dos segmentos son la misma frase (tomas repetidas), p.ej. dos clips distintos diciendo "con amplio espacio".
 * False si solo comparten nombre de modelo (presentación vs CTA distinto).
 */
function isSameUtterance(textA: string, textB: string): boolean {
  const na = normalizeForDedupe(textA)
  const nb = normalizeForDedupe(textB)
  if (!na || !nb) return false
  if (na === nb) return true

  const ca = wordCountNormalized(na)
  const cb = wordCountNormalized(nb)
  const wcRatio = Math.min(ca, cb) / Math.max(ca, cb)
  if (wcRatio < 0.65) return false

  const sim = stringSimilarity(na, nb)
  if (sim >= 0.94) return true
  if (sim >= 0.88 && wcRatio >= 0.82) return true
  if (sim >= 0.9 && wcRatio >= 0.72 && Math.abs(ca - cb) <= 2) return true
  return false
}

function dedupeSequenceByUtterance(
  sequence: SequenceItem[],
  segmentLookup: Map<string, Segment>,
  jobId: string
): SequenceItem[] {
  const kept: SequenceItem[] = []
  const keptTexts: string[] = []

  for (const item of sequence) {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) {
      kept.push(item)
      continue
    }
    const text = seg.text
    if (keptTexts.some((t) => isSameUtterance(t, text))) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Gemini] Dedupe: descartando ${item.segment_id} (misma frase que un clip ya elegido)`
      )
      continue
    }
    kept.push(item)
    keptTexts.push(text)
  }
  return kept
}

function sequenceUtteranceTexts(sequence: SequenceItem[], segmentLookup: Map<string, Segment>): string[] {
  return sequence
    .map((item) => segmentLookup.get(item.segment_id)?.text)
    .filter((t): t is string => !!t)
}

function validateSequence(
  raw: GeminiSegmentAnalysis,
  allSegments: Segment[],
  jobId: string
): GeminiSegmentAnalysis {
  const segmentLookup = new Map<string, Segment>()
  for (const s of allSegments) {
    segmentLookup.set(s.segment_id, s)
  }

  // 1) Limpiar duplicados y segmentos basura ("me equivoqué")
  const usedIds = new Set<string>()
  let sequence = raw.sequence
    .filter((item) => {
      if (usedIds.has(item.segment_id)) return false
      usedIds.add(item.segment_id)
      return true
    })
    .filter((item) => {
      const seg = segmentLookup.get(item.segment_id)
      return seg ? !isMistakeSegment(seg) : true
    })

  // 2) Forzar cortes exactos al segmento para no romper palabras
  sequence = sequence.map((item) => {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) return item
    return {
      ...item,
      trim_start: seg.start_s,
      trim_end: seg.end_s,
      trim_duration: Number((seg.end_s - seg.start_s).toFixed(3)),
    }
  })

  // 3) Permitir micro-segmentos relevantes (solo descartar ultra-cortos)
  const before = sequence.length
  sequence = sequence.filter((item) => item.trim_duration >= 0.8)
  if (sequence.length < before) {
    console.log(`[VideoV2Pipeline][${jobId}][Gemini] Se eliminaron ${before - sequence.length} segmentos ultra-cortos (<0.8s)`)
  }

  // 4) Orden editorial duro: presentación primero, CTA/marca al final
  sequence = enforceEditorialOrder(sequence, allSegments)

  // 4b) Misma frase en tomas distintas: conservar la primera en el orden actual, descartar el resto
  sequence = dedupeSequenceByUtterance(sequence, segmentLookup, jobId)

  // 5) Si quedó muy corto, agregar segmentos útiles no usados
  let totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
  if (totalDuration < 20) {
    const selected = new Set(sequence.map((s) => s.segment_id))
    const candidates = allSegments
      .filter((s) => !selected.has(s.segment_id) && !isMistakeSegment(s) && s.duration_s >= 0.8)
      .sort((a, b) => b.duration_s - a.duration_s)

    for (const seg of candidates) {
      if (totalDuration >= 24) break
      const existingTexts = sequenceUtteranceTexts(sequence, segmentLookup)
      if (existingTexts.some((t) => isSameUtterance(t, seg.text))) continue
      sequence.push({
        segment_id: seg.segment_id,
        clip_index: seg.clip_index,
        trim_start: seg.start_s,
        trim_end: seg.end_s,
        trim_duration: seg.duration_s,
        order: sequence.length + 1,
        reason: 'agregado automáticamente para alcanzar duración mínima',
      })
      totalDuration += seg.duration_s
    }
    totalDuration = Number(totalDuration.toFixed(3))
  }

  // 6) Si quedó muy largo, quitar últimos no prioritarios y recortar cierre
  if (totalDuration > 35 && sequence.length > 0) {
    for (let i = sequence.length - 1; i >= 0 && totalDuration > 33; i--) {
      const seg = segmentLookup.get(sequence[i].segment_id)
      if (seg && !isEndCtaSegment(seg) && !isPresentationSegment(seg)) {
        totalDuration -= sequence[i].trim_duration
        sequence.splice(i, 1)
      }
    }
    totalDuration = Number(totalDuration.toFixed(3))

    if (totalDuration > 35 && sequence.length > 0) {
      const last = sequence[sequence.length - 1]
      const excess = totalDuration - 33
      last.trim_duration = Number(Math.max(0.8, last.trim_duration - excess).toFixed(3))
      last.trim_end = Number((last.trim_start + last.trim_duration).toFixed(3))
      totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
    }
  }

  sequence.forEach((item, i) => { item.order = i + 1 })
  return { sequence, total_duration: totalDuration, overall_strategy: raw.overall_strategy }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildVisualPrompt(formattedSegmentMap: string, videoCount: number): string {
  const videoRef = videoCount === 1 ? 'el video' : `los ${videoCount} videos`
  const plural = videoCount > 1 ? 's' : ''

  return `Eres un editor de video profesional especializado en crear Reels virales de venta de autos para Instagram y TikTok. Eres el mejor del mundo en esto. Tu objetivo es crear un Reel que detenga el scroll y genere engagement.

Acabas de ver ${videoRef} completo${plural}. Ahora tienes el mapa de segmentos hablados con timestamps EXACTOS del audio:

${formattedSegmentMap}

REGLAS ABSOLUTAS DE CORTE:
1. NUNCA cortes a la mitad de una palabra o frase. Cada segmento debe empezar y terminar en una pausa natural del habla.
2. Usa EXACTAMENTE los trim_start y trim_end que correspondan al inicio y fin del segmento (start_s y end_s del mapa). NO modifiques los timestamps a menos que el segmento sea demasiado largo y necesites usar solo una parte (en ese caso, corta en una pausa natural entre palabras).
3. La duración total DEBE estar entre 20 y 32 segundos. Este es el sweet spot para Reels virales.
4. Si detectas partes de error del vendedor (ej: "me equivoqué", "otra vez", "de nuevo"), descártalas.
5. Los segmentos de presentación de vehículo (marca/modelo/año) deben ir al INICIO.
6. Los segmentos tipo CTA o marca ("comenta ...", "solo aquí en Ksi/Casi Nuevos") deben ir al FINAL.


CRITERIOS DE SELECCIÓN VISUAL (en orden de prioridad):
- GANCHO (primer segmento): Elige la toma más impactante visualmente + el texto más llamativo. Debe generar curiosidad o emoción en los primeros 2 segundos.
- Prioriza tomas donde el vendedor está frente a la cámara con buena energía
- Incluye tomas que muestren el auto desde ángulos atractivos
- Descarta: vendedor de espaldas, tomas borrosas, caminando sin hablar, silencios largos
- El cierre debe tener una llamada a acción o dato memorable

ESTRUCTURA IDEAL:
1. Gancho potente (3-5s) → 2. Info clave del auto (5-8s) → 3. Características/precio (5-8s) → 4. Cierre con CTA (3-5s)

Responde SOLO con este JSON, sin markdown, sin explicaciones:
{"sequence":[{"segment_id":"0_2","clip_index":0,"trim_start":35.10,"trim_end":41.80,"trim_duration":6.70,"order":1,"reason":"gancho visual: vendedor energético frente al auto mencionando precio"}],"total_duration":28.00,"overall_strategy":"descripción breve de la estrategia editorial"}`
}

function buildTextOnlyPrompt(formattedSegmentMap: string): string {
  return `Eres un editor de video profesional especializado en crear Reels virales de venta de autos para Instagram y TikTok. Eres el mejor del mundo en esto.

Material disponible dividido en segmentos hablados (silencios eliminados):

${formattedSegmentMap}

REGLAS ABSOLUTAS DE CORTE:
1. NUNCA cortes a la mitad de una palabra o frase. Cada segmento debe empezar y terminar en una pausa natural.
2. Usa EXACTAMENTE los trim_start y trim_end del segmento (start_s y end_s del mapa). NO inventes timestamps.
3. La duración total DEBE estar entre 25 y 32 segundos.
4. Puedes usar segmentos cortos si aportan valor (incluso alrededor de 1 segundo) siempre que no corten palabras.
5. Si detectas partes de error del vendedor (ej: "me equivoqué", "otra vez", "de nuevo"), descártalas.
6. Los segmentos de presentación de vehículo (marca/modelo/año) deben ir al INICIO.
7. Los segmentos tipo CTA o marca ("comenta ...", "solo aquí en Ksi/Casi Nuevos") deben ir al FINAL.

CRITERIOS DE SELECCIÓN:
- GANCHO (primer segmento): La frase más impactante, una pregunta, un precio, algo que detenga el scroll
- Puedes reordenar segmentos: no importa el orden original del video
- Puedes usar segmentos del mismo clip de forma discontinua
- Descarta: presentaciones aburridas, muletillas, repeticiones, silencios

ESTRUCTURA IDEAL:
1. Gancho potente (3-5s) → 2. Info clave (5-8s) → 3. Características/precio (5-8s) → 4. Cierre memorable (3-5s)

Responde SOLO con este JSON, sin markdown, sin explicaciones:
{"sequence":[{"segment_id":"0_2","clip_index":0,"trim_start":35.10,"trim_end":41.80,"trim_duration":6.70,"order":1,"reason":"gancho: pregunta directa sobre el auto"}],"total_duration":28.00,"overall_strategy":"descripción breve de la estrategia"}`
}

// ─── Función principal: analyzeSegments ──────────────────────────────────────

/**
 * Envía el mapa de segmentos a Gemini, opcionalmente con los videos reales
 * subidos al File API de Google para análisis visual + textual.
 *
 * @param formattedSegmentMap  Mapa de segmentos formateado en texto
 * @param allSegments          Array de todos los segmentos para validación
 * @param jobId                ID del job para logging
 * @param googleFileRefs       Referencias a videos en el File API de Google (vacío = solo texto)
 * @param useVisualAnalysis    true = enviar videos + texto, false = solo texto
 */
export async function analyzeSegments(
  formattedSegmentMap: string,
  allSegments: Segment[],
  jobId: string,
  googleFileRefs: GoogleFileRef[] = [],
  useVisualAnalysis: boolean = false
): Promise<GeminiSegmentAnalysis> {
  const mode = useVisualAnalysis && googleFileRefs.length > 0 ? 'visual+texto' : 'solo texto'
  console.log(`[VideoV2Pipeline][${jobId}][Gemini] Analizando ${allSegments.length} segmentos (modo: ${mode})`)

  const genAI = getGenAI()
  const selectedModel = (useVisualAnalysis && googleFileRefs.length > 0) ? MODEL_VISUAL : MODEL_TEXT
  const model = genAI.getGenerativeModel({ model: selectedModel })

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const strictSuffix = attempt > 1
        ? '\n\nIMPORTANTE: Responde SOLO con el JSON, sin texto adicional, sin bloques de código, sin explicaciones.'
        : ''

      let contentParts: Parameters<typeof model.generateContent>[0]

      if (useVisualAnalysis && googleFileRefs.length > 0) {
        const prompt = buildVisualPrompt(formattedSegmentMap, googleFileRefs.length) + strictSuffix
        contentParts = [
          ...googleFileRefs.map((ref) => ({
            fileData: { mimeType: ref.mimeType, fileUri: ref.fileUri },
          })),
          { text: prompt },
        ]
      } else {
        contentParts = buildTextOnlyPrompt(formattedSegmentMap) + strictSuffix
      }

      const result = await Promise.race([
        model.generateContent(contentParts),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
        ),
      ])

      const rawText = result.response.text()
      console.log(`[VideoV2Pipeline][${jobId}][Gemini] Respuesta (${rawText.length} chars, modo: ${mode})`)

      const jsonStr = extractJsonObject(rawText)
      const parsed = JSON.parse(jsonStr) as GeminiSegmentAnalysis
      const validated = validateSequence(parsed, allSegments, jobId)

      console.log(
        `[VideoV2Pipeline][${jobId}][Gemini] Secuencia validada: ${validated.sequence.length} segmentos, ${validated.total_duration.toFixed(1)}s total`
      )

      return validated
    } catch (err) {
      if (attempt > MAX_RETRIES) {
        throw new Error(`[VideoV2Pipeline][${jobId}][Gemini] Error analizando segmentos tras ${MAX_RETRIES + 1} intentos: ${err}`)
      }
      console.warn(`[VideoV2Pipeline][${jobId}][Gemini] Reintento ${attempt}: ${err}`)
      await sleep(3000 * attempt)
    }
  }

  throw new Error('Gemini no pudo analizar los segmentos')
}
