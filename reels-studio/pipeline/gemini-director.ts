/**
 * Gemini como director: ve los clips, lee la transcripción y devuelve el Plan Creativo.
 * Después, una segunda pasada sobre cuadros fijos ubica con precisión cada objeto
 * señalado (Gemini detecta mejor en imagen que en video).
 */
import { GoogleGenAI, type Content, type Part } from '@google/genai'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { creativePlanSchema, rawGraphicSchema, type CreativePlan, type FocusBox } from '../src/plan/schema'
import type { TranscribedWord } from './assemblyai'
import { DIRECTOR_SYSTEM, formatTranscript, formatVehicle, type VehicleInfo } from './director-prompt'

export const DEFAULT_MODEL = process.env.GEMINI_DIRECTOR_MODEL ?? 'gemini-3.8-flash'

/** Caja en el formato nativo de detección de Gemini: [ymin, xmin, ymax, xmax] en 0–1000. */
const box2d = z.array(z.number().min(0).max(1000)).length(4)

const geminiGraphicSchema = rawGraphicSchema.omit({ focus: true, focusEnd: true }).extend({
  focus_box: box2d.optional(),
  focus_box_end: box2d.optional(),
})
const geminiPlanSchema = creativePlanSchema.extend({ graphics: z.array(geminiGraphicSchema) })
type GeminiPlan = z.infer<typeof geminiPlanSchema>

export type DirectorClip = {
  id: string
  file: string
  durationSec: number
  width: number
  height: number
  words: TranscribedWord[]
}

/** JSON Schema para `responseJsonSchema`, sin las claves que la API no necesita. */
function client(apiKey?: string): GoogleGenAI {
  const key = apiKey ?? process.env.GEMINI_API_KEY
  if (!key) throw new Error('Falta GEMINI_API_KEY')
  return new GoogleGenAI({ apiKey: key })
}

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

export function boxToFocus(b: number[]): FocusBox {
  const [ymin, xmin, ymax, xmax] = b.map((n) => Math.min(1000, Math.max(0, n)) / 1000)
  return { x: xmin, y: ymin, w: Math.max(0.02, xmax - xmin), h: Math.max(0.02, ymax - ymin) }
}

function toCreativePlan(p: GeminiPlan): CreativePlan {
  return {
    ...p,
    graphics: p.graphics.map(({ focus_box, focus_box_end, ...g }) => ({
      ...g,
      focus: focus_box ? boxToFocus(focus_box) : undefined,
      focusEnd: focus_box_end ? boxToFocus(focus_box_end) : undefined,
    })),
  }
}

/** Revisa lo que el esquema no puede: clips y tiempos que existan de verdad. */
function semanticProblems(plan: GeminiPlan, clips: DirectorClip[]): string[] {
  const byId = new Map(clips.map((c) => [c.id, c]))
  const problems: string[] = []
  plan.cuts.forEach((c, i) => {
    const clip = byId.get(c.clipId)
    if (!clip) return problems.push(`cuts[${i}]: clipId "${c.clipId}" no existe`)
    if (c.endSec <= c.startSec) problems.push(`cuts[${i}]: endSec debe ser mayor que startSec`)
    if (c.endSec > clip.durationSec + 0.3) problems.push(`cuts[${i}]: endSec ${c.endSec} supera la duración de ${c.clipId} (${clip.durationSec.toFixed(2)} s)`)
  })
  plan.graphics.forEach((g, i) => {
    const inCut = plan.cuts.some((c) => c.clipId === g.clipId && g.atSec >= c.startSec - 0.3 && g.atSec <= c.endSec)
    if (!inCut) problems.push(`graphics[${i}] (${g.type}): atSec ${g.atSec} de ${g.clipId} no cae dentro de ningún corte elegido`)
  })
  const cta = plan.graphics.filter((g) => g.type === 'cta_end')
  if (cta.length !== 1) problems.push(`debe haber exactamente un cta_end (hay ${cta.length})`)
  else if (cta[0].clipId !== plan.cuts[plan.cuts.length - 1]?.clipId) problems.push('cta_end debe ir sobre el último corte')
  return problems
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
  const responseJsonSchema = jsonSchemaFor(geminiPlanSchema)

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[gemini] ${model}: pensando el Reel (intento ${attempt})…`)
    const res = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: DIRECTOR_SYSTEM, responseMimeType: 'application/json', responseJsonSchema, temperature: 0.7 },
    })
    const text = res.text ?? ''
    let problems: string[]
    let parsed: GeminiPlan | null = null
    try {
      const result = geminiPlanSchema.safeParse(JSON.parse(text))
      if (result.success) {
        parsed = result.data
        problems = semanticProblems(parsed, params.clips)
      } else {
        problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      }
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

function extractFrame(file: string, sec: number): string {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reel-frame-')), 'f.jpg')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', sec.toFixed(3), '-i', file, '-frames:v', '1', '-q:v', '3', out])
  return out
}

const detectionSchema = z.object({ found: z.boolean(), box_2d: box2d })

/**
 * Segunda pasada: para cada característica señalada, pide a Gemini la caja exacta del objeto
 * en el primer y el último cuadro del gráfico. Si no lo encuentra, el gráfico queda sin zoom.
 */
export async function refineFocusBoxes(params: {
  plan: CreativePlan
  clips: DirectorClip[]
  model?: string
  apiKey?: string
}): Promise<CreativePlan> {
  const ai = client(params.apiKey)
  const model = params.model ?? DEFAULT_MODEL
  const byId = new Map(params.clips.map((c) => [c.id, c]))

  const locate = async (file: string, sec: number, what: string): Promise<FocusBox | null> => {
    const img = fs.readFileSync(extractFrame(file, sec)).toString('base64')
    const res = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: img } },
            { text: `Ubica en esta imagen: ${what}. Devuelve box_2d [ymin, xmin, ymax, xmax] normalizado 0–1000 ajustado al objeto. Si no se ve con claridad, found=false.` },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', responseJsonSchema: jsonSchemaFor(detectionSchema), temperature: 0 },
    })
    const parsed = detectionSchema.safeParse(JSON.parse(res.text ?? '{}'))
    return parsed.success && parsed.data.found ? boxToFocus(parsed.data.box_2d) : null
  }

  const graphics = await Promise.all(
    params.plan.graphics.map(async (g) => {
      if (g.type !== 'feature_callout') return g
      const clip = byId.get(g.clipId)
      if (!clip) return g
      const what = `"${g.text}"${g.subtext ? ` (${g.subtext})` : ''} del vehículo`
      const endSec = Math.min(clip.durationSec - 0.05, g.atSec + g.durationSec)
      const [start, end] = await Promise.all([locate(clip.file, g.atSec, what), locate(clip.file, endSec, what)])
      if (!start) {
        console.warn(`[gemini] no se ve con claridad "${g.text}" en ${g.clipId}@${g.atSec}s: va sin zoom`)
        return { ...g, focus: undefined, focusEnd: undefined }
      }
      const moved = end && (Math.abs(end.x - start.x) > 0.03 || Math.abs(end.y - start.y) > 0.03)
      return { ...g, focus: start, focusEnd: moved ? end : undefined }
    })
  )
  return { ...params.plan, graphics }
}
