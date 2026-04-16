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

function validateSequence(
  raw: GeminiSegmentAnalysis,
  allSegments: Segment[],
  jobId: string
): GeminiSegmentAnalysis {
  const segmentLookup = new Map<string, Segment>()
  for (const s of allSegments) {
    segmentLookup.set(s.segment_id, s)
  }

  let { sequence } = raw

  // Validación 3: ajustar trim_start/trim_end a los límites reales del segmento
  sequence = sequence.map((item) => {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) return item

    let trimStart = item.trim_start
    let trimEnd = item.trim_end

    if (trimStart < seg.start_s) {
      console.warn(`[VideoV2Pipeline][${jobId}][Gemini] trim_start ${trimStart} < seg.start ${seg.start_s} → ajustando`)
      trimStart = seg.start_s
    }
    if (trimEnd > seg.end_s) {
      console.warn(`[VideoV2Pipeline][${jobId}][Gemini] trim_end ${trimEnd} > seg.end ${seg.end_s} → ajustando`)
      trimEnd = seg.end_s
    }

    const trimDuration = Number((trimEnd - trimStart).toFixed(3))

    return { ...item, trim_start: trimStart, trim_end: trimEnd, trim_duration: trimDuration }
  })

  // Validación 4: eliminar segmentos < 2s (tolerancia bajo el mínimo del prompt de 3s)
  const before = sequence.length
  sequence = sequence.filter((item) => {
    if (item.trim_duration < 2) {
      console.warn(`[VideoV2Pipeline][${jobId}][Gemini] Segmento ${item.segment_id} (${item.trim_duration}s) < 2s → eliminado`)
      return false
    }
    return true
  })
  if (sequence.length < before) {
    console.log(`[VideoV2Pipeline][${jobId}][Gemini] Se eliminaron ${before - sequence.length} segmentos cortos`)
  }

  // Recalcular total_duration
  let totalDuration = sequence.reduce((sum, item) => sum + item.trim_duration, 0)
  totalDuration = Number(totalDuration.toFixed(3))

  // Validación 1: muy corto → agregar segmentos no usados de mayor duración
  if (totalDuration < 22) {
    console.warn(`[VideoV2Pipeline][${jobId}][Gemini] total_duration ${totalDuration}s < 22s → buscando segmentos extra`)

    const usedIds = new Set(sequence.map((s) => s.segment_id))
    const unused = allSegments
      .filter((s) => !usedIds.has(s.segment_id) && s.duration_s >= 3)
      .sort((a, b) => b.duration_s - a.duration_s)

    for (const candidate of unused) {
      if (totalDuration >= 25) break
      const newItem: SequenceItem = {
        segment_id: candidate.segment_id,
        clip_index: candidate.clip_index,
        trim_start: candidate.start_s,
        trim_end: candidate.end_s,
        trim_duration: candidate.duration_s,
        order: sequence.length + 1,
        reason: 'agregado automáticamente para alcanzar duración mínima',
      }
      sequence.push(newItem)
      totalDuration += candidate.duration_s
    }
    totalDuration = Number(totalDuration.toFixed(3))
  }

  // Validación 2: muy largo → recortar último segmento
  if (totalDuration > 35) {
    console.warn(`[VideoV2Pipeline][${jobId}][Gemini] total_duration ${totalDuration}s > 35s → recortando`)

    const excess = totalDuration - 33
    const last = sequence[sequence.length - 1]
    last.trim_duration = Number((last.trim_duration - excess).toFixed(3))
    last.trim_end = Number((last.trim_start + last.trim_duration).toFixed(3))

    if (last.trim_duration < 2) {
      sequence.pop()
    }

    totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
  }

  // Renumerar order
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
3. La duración total DEBE estar entre 25 y 32 segundos. Este es el sweet spot para Reels virales.
4. Cada segmento individual DEBE durar mínimo 3 segundos para que sea cómodo de ver.

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
4. Cada segmento individual DEBE durar mínimo 3 segundos.

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
