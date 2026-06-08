import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-flash-latest'

export type GeminiHighlightKind = 'spec' | 'feature' | 'emotional'

export interface GeminiHighlightPhrase {
  phrase: string
  kind: GeminiHighlightKind
  priority: number
}

export interface VehicleHighlightContext {
  brand?: string | null
  model?: string | null
  year?: string | null
  engineLiters?: string | null
  transmission?: string | null
  driveType?: string | null
}

function buildPrompt(transcript: string, ctx: VehicleHighlightContext): string {
  const vehicleLine = [ctx.brand, ctx.model, ctx.year].filter(Boolean).join(' ') || 'vehículo seminuevo'
  const specs = [
    ctx.engineLiters ? `Motor: ${ctx.engineLiters}` : null,
    ctx.transmission ? `Transmisión: ${ctx.transmission}` : null,
    ctx.driveType ? `Tracción: ${ctx.driveType}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const capped =
    transcript.length > 8000 ? `${transcript.slice(0, 8000)}\n[… truncado]` : transcript

  return `Eres editor de Reels de autos. NO editas video ni tiempos. Solo eliges frases del DIÁLOGO que merecen destacarse en pantalla (técnicas, equipamiento o emocionales de venta).

Vehículo: ${vehicleLine}
${specs ? `${specs}\n` : ''}
Transcripción (AssemblyAI):
"""
${capped}
"""

Devuelve SOLO JSON válido (sin markdown):
{
  "caption_highlights": [
    { "phrase": "texto exacto o casi exacto dicho en la transcripción", "kind": "spec|feature|emotional", "priority": 1 }
  ]
}

Reglas:
- Entre 3 y 8 frases, "priority" 1 = más importante.
- "phrase" debe aparecer (o casi) en la transcripción: ej. "amplia cabina", "confianza", "pantalla multimedia", "resistencia".
- kind=spec: motor, cilindrada, 4x4, diésel, turbo.
- kind=feature: cabina, pantalla, equipamiento, diseño.
- kind=emotional: confianza, resistencia, durabilidad, desempeño.
- NO incluyas "comenta", marca del concesionario ni CTAs.
- NO repitas la misma idea.`
}

function parseHighlightsJson(raw: string): GeminiHighlightPhrase[] {
  const trimmed = raw.trim().replace(/^```json?\s*|\s*```$/gi, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return []
    parsed = JSON.parse(match[0]!)
  }

  const arr = (parsed as { caption_highlights?: unknown })?.caption_highlights
  if (!Array.isArray(arr)) return []

  const out: GeminiHighlightPhrase[] = []
  for (const item of arr) {
    if (typeof item !== 'object' || item == null) continue
    const o = item as Record<string, unknown>
    const phrase = typeof o.phrase === 'string' ? o.phrase.trim() : ''
    if (phrase.length < 3) continue
    const kindRaw = typeof o.kind === 'string' ? o.kind.toLowerCase() : 'feature'
    const kind: GeminiHighlightKind =
      kindRaw === 'spec' || kindRaw === 'emotional' ? kindRaw : 'feature'
    const priority =
      typeof o.priority === 'number' && Number.isFinite(o.priority)
        ? Math.max(1, Math.min(10, Math.round(o.priority)))
        : out.length + 1
    out.push({ phrase, kind, priority })
  }
  return out.slice(0, 8)
}

/**
 * Capa 2 opcional: Gemini prioriza frases a destacar (sin timestamps).
 */
export async function fetchGeminiCaptionHighlights(
  transcript: string,
  ctx: VehicleHighlightContext,
  jobId: string
): Promise<GeminiHighlightPhrase[]> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    console.log(`[HighlightGemini][${jobId}] Sin GEMINI_API_KEY — solo léxico local`)
    return []
  }
  if (!transcript.trim()) return []

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: MODEL })
  const result = await model.generateContent(buildPrompt(transcript, ctx))
  const text = result.response.text().trim()
  const highlights = parseHighlightsJson(text)

  console.log(
    `[HighlightGemini][${jobId}] ${highlights.length} frases priorizadas: ` +
      highlights.map((h) => `"${h.phrase}"(${h.kind},p${h.priority})`).join(', ')
  )
  return highlights
}
