/**
 * Gemini como director: ve los clips, lee la transcripción y devuelve el Plan Creativo.
 * Después, una segunda pasada sobre cuadros fijos ubica con precisión cada objeto
 * señalado (Gemini detecta mejor en imagen que en video).
 */
import { GoogleGenAI, type Content, type Part } from '@google/genai'
import path from 'node:path'
import { z } from 'zod'
import type { CreativePlan } from '../src/plan/schema'
import { DIRECTOR_SYSTEM, formatTranscript, formatVehicle, type VehicleInfo } from './director-prompt'
import {
  boxToFocus,
  checkPlan,
  detectionSchema,
  directorPlanSchema,
  locatePrompt,
  refineFocusBoxesWith,
  toCreativePlan,
  type DirectorClip,
  type DirectorPlan,
} from './director-plan'

export const DEFAULT_MODEL = process.env.GEMINI_DIRECTOR_MODEL ?? 'gemini-3.8-flash'

function client(apiKey?: string): GoogleGenAI {
  const key = apiKey ?? process.env.GEMINI_API_KEY
  if (!key) throw new Error('Falta GEMINI_API_KEY')
  return new GoogleGenAI({ apiKey: key })
}

/** JSON Schema para `responseJsonSchema`, sin las claves que la API no necesita. */
function jsonSchemaFor(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip)
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node)) {
        if (k === '$schema' || k === 'additionalProperties') continue
        out[k] = strip(v)
      }
      return out
    }
    return node
  }
  return strip(z.toJSONSchema(schema))
}

async function uploadVideo(ai: GoogleGenAI, file: string) {
  let f = await ai.files.upload({ file, config: { mimeType: 'video/mp4', displayName: path.basename(file) } })
  const deadline = Date.now() + 5 * 60 * 1000
  while (f.state === 'PROCESSING' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500))
    f = await ai.files.get({ name: f.name! })
  }
  if (f.state !== 'ACTIVE') throw new Error(`Gemini no pudo procesar ${file} (estado ${f.state})`)
  return f
}

export async function directReel(params: {
  clips: DirectorClip[]
  vehicle: VehicleInfo
  model?: string
  apiKey?: string
}): Promise<{ plan: CreativePlan; raw: unknown }> {
  const ai = client(params.apiKey)
  const model = params.model ?? DEFAULT_MODEL

  console.log(`[gemini] subiendo ${params.clips.length} clips…`)
  const uploaded = await Promise.all(params.clips.map((c) => uploadVideo(ai, c.file)))

  const parts: Part[] = [
    { text: `DATOS DEL VEHÍCULO\n${formatVehicle(params.vehicle)}\n\nCLIPS GRABADOS POR EL ASESOR (en el orden en que se subieron):` },
  ]
  params.clips.forEach((c, i) => {
    parts.push({
      text: `\n=== CLIP ${c.id} · ${c.durationSec.toFixed(2)} s · ${c.width}×${c.height} ===\nTranscripción (palabra(segundo)): ${formatTranscript(c.words)}`,
    })
    // 4 cuadros por segundo: los clips son cortos y así ubica mejor objetos y momentos.
    parts.push({ fileData: { fileUri: uploaded[i].uri!, mimeType: 'video/mp4' }, videoMetadata: { fps: 4 } })
  })
  parts.push({ text: '\nDiseña el Reel y devuelve SOLO el JSON del plan.' })

  const contents: Content[] = [{ role: 'user', parts }]
  const responseJsonSchema = jsonSchemaFor(directorPlanSchema)

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[gemini] ${model}: pensando el Reel (intento ${attempt})…`)
    const res = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: DIRECTOR_SYSTEM, responseMimeType: 'application/json', responseJsonSchema, temperature: 0.7 },
    })
    const text = res.text ?? ''
    let problems: string[]
    let parsed: DirectorPlan | null = null
    try {
      ;({ plan: parsed, problems } = checkPlan(JSON.parse(text), params.clips))
    } catch (err) {
      problems = [`JSON inválido: ${String(err)}`]
    }
    if (parsed && problems.length === 0) {
      return { plan: toCreativePlan(parsed), raw: JSON.parse(text) }
    }
    console.warn(`[gemini] el plan tiene problemas:\n- ${problems.join('\n- ')}`)
    contents.push({ role: 'model', parts: [{ text }] }, { role: 'user', parts: [{ text: `Corrige estos problemas y devuelve el JSON completo:\n- ${problems.join('\n- ')}` }] })
  }
  throw new Error('Gemini no devolvió un plan válido tras 3 intentos')
}

/** Segunda pasada con Gemini (ver `refineFocusBoxesWith`). */
export async function refineFocusBoxes(params: {
  plan: CreativePlan
  clips: DirectorClip[]
  model?: string
  apiKey?: string
}): Promise<CreativePlan> {
  const ai = client(params.apiKey)
  const model = params.model ?? DEFAULT_MODEL
  return refineFocusBoxesWith({
    plan: params.plan,
    clips: params.clips,
    tag: 'gemini',
    locate: async (img, what) => {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: locatePrompt(what) }] }],
        config: { responseMimeType: 'application/json', responseJsonSchema: jsonSchemaFor(detectionSchema), temperature: 0 },
      })
      const parsed = detectionSchema.safeParse(JSON.parse(res.text ?? '{}'))
      return parsed.success && parsed.data.found ? boxToFocus(parsed.data.box_2d) : null
    },
  })
}
