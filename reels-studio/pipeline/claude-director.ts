/**
 * Claude como director: mismo trabajo y mismo Plan Creativo que Gemini, pero Claude no recibe
 * video, así que se le mandan cuadros fijos de cada clip (con su segundo) junto a la transcripción.
 * Activo con DIRECTOR_PROVIDER=claude (o si solo hay ANTHROPIC_API_KEY); ver run.ts.
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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

export const DEFAULT_MODEL = process.env.CLAUDE_DIRECTOR_MODEL ?? 'claude-opus-5-5'

/** Tope de cuadros por Reel (todas las tomas juntas): suficiente para ver cada momento sin disparar el costo. */
const FRAME_BUDGET = 90
const MAX_FPS = 2
const MIN_FPS = 0.5

/** Modelos con respaldo automático del servidor si un filtro de seguridad rechaza la solicitud. */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'])

const FRAMES_NOTE = `CÓMO VES LOS CLIPS: no recibes el video sino cuadros fijos de cada clip, en orden, cada uno con su segundo
("clip2 · 3.5 s"). Entre dos cuadros pasa lo mismo que en la transcripción de ese tramo. Usa los segundos de la
transcripción para cortar y los cuadros para saber qué se ve (exterior, interior, la mano señalando, tomas movidas o
vacías). "focus_box" es aproximado: después se ubica con precisión, pero que caiga sobre el objeto correcto.`

function client(apiKey?: string): Anthropic {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY')
  return new Anthropic({ apiKey: key })
}

/** Formato de salida con el esquema del plan; la validación la hace `checkPlan` para poder pedir correcciones. */
function outputFormat(schema: typeof directorPlanSchema | typeof detectionSchema) {
  const { type, schema: jsonSchema } = betaZodOutputFormat(schema)
  return { type, schema: jsonSchema }
}

/** Cuadros parejos de un clip (JPEG, lado mayor 960 px), con el segundo de cada uno. */
function sampleFrames(clip: DirectorClip, fps: number): Array<{ sec: number; data: string }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `reel-${clip.id}-`))
  try {
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', clip.file,
      '-vf', `fps=${fps},scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)'`,
      '-q:v', '5', path.join(dir, 'f-%04d.jpg'),
    ])
    return fs
      .readdirSync(dir)
      .sort()
      .map((f, i) => ({ sec: i / fps, data: fs.readFileSync(path.join(dir, f)).toString('base64') }))
      .filter((f) => f.sec <= clip.durationSec)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** Errores de la API en palabras claras (es lo que ve el equipo en la lista de videos). */
function explain(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) return new Error('Anthropic: la clave ANTHROPIC_API_KEY no es válida')
  if (err instanceof Anthropic.PermissionDeniedError) return new Error(`Anthropic: la clave no tiene permiso (${err.message})`)
  if (err instanceof Anthropic.RateLimitError) return new Error('Anthropic: límite de uso alcanzado, intenta en unos minutos')
  if (err instanceof Anthropic.BadRequestError) return new Error(`Anthropic rechazó la solicitud: ${err.message}`)
  if (err instanceof Anthropic.APIError) return new Error(`Anthropic falló (${err.status ?? 'sin conexión'}): ${err.message}`)
  return err instanceof Error ? err : new Error(String(err))
}

function textOf(message: Anthropic.Beta.BetaMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

function fallbackParams(model: string) {
  return FALLBACK_MODELS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}
}

export async function directReel(params: {
  clips: DirectorClip[]
  vehicle: VehicleInfo
  model?: string
  apiKey?: string
}): Promise<{ plan: CreativePlan; raw: unknown }> {
  const anthropic = client(params.apiKey)
  const model = params.model ?? DEFAULT_MODEL

  const totalSec = params.clips.reduce((s, c) => s + c.durationSec, 0)
  const fps = Math.min(MAX_FPS, Math.max(MIN_FPS, FRAME_BUDGET / Math.max(1, totalSec)))
  console.log(`[claude] preparando cuadros de ${params.clips.length} clips (${fps.toFixed(2)} por segundo)…`)

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: 'text', text: `DATOS DEL VEHÍCULO\n${formatVehicle(params.vehicle)}\n\nCLIPS GRABADOS POR EL ASESOR (en el orden en que se subieron):` },
  ]
  let frameCount = 0
  for (const c of params.clips) {
    content.push({
      type: 'text',
      text: `\n=== CLIP ${c.id} · ${c.durationSec.toFixed(2)} s · ${c.width}×${c.height} ===\nTranscripción (palabra(segundo)): ${formatTranscript(c.words)}\nCuadros:`,
    })
    for (const f of sampleFrames(c, fps)) {
      content.push({ type: 'text', text: `${c.id} · ${f.sec.toFixed(1)} s` })
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } })
      frameCount++
    }
  }
  // Los reintentos repiten todo lo anterior: queda en caché y se cobra mucho menos.
  content.push({ type: 'text', text: '\nDiseña el Reel y devuelve SOLO el JSON del plan.', cache_control: { type: 'ephemeral' } })
  console.log(`[claude] ${frameCount} cuadros listos`)

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content }]
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[claude] ${model}: pensando el Reel (intento ${attempt})…`)
    let message: Anthropic.Beta.BetaMessage
    try {
      message = await anthropic.beta.messages
        .stream({
          model,
          max_tokens: 64000,
          system: [
            { type: 'text', text: DIRECTOR_SYSTEM },
            { type: 'text', text: FRAMES_NOTE },
          ],
          messages,
          output_config: { effort: 'high', format: outputFormat(directorPlanSchema) },
          ...fallbackParams(model),
        })
        .finalMessage()
    } catch (err) {
      throw explain(err)
    }
    const u = message.usage
    console.log(`[claude] tokens: entrada ${u.input_tokens} (+${u.cache_read_input_tokens ?? 0} de caché), salida ${u.output_tokens}`)
    if (message.stop_reason === 'refusal') {
      throw new Error(`Claude no quiso hacer el plan (${message.stop_details?.category ?? 'sin categoría'}): ${message.stop_details?.explanation ?? ''}`)
    }

    const text = textOf(message)
    let problems: string[]
    let parsed: DirectorPlan | null = null
    if (message.stop_reason === 'max_tokens') {
      problems = ['la respuesta quedó cortada: devuelve un plan más compacto (reasons breves)']
    } else {
      try {
        ;({ plan: parsed, problems } = checkPlan(JSON.parse(text), params.clips))
      } catch (err) {
        problems = [`JSON inválido: ${String(err)}`]
      }
    }
    if (parsed && problems.length === 0) {
      return { plan: toCreativePlan(parsed), raw: JSON.parse(text) }
    }
    console.warn(`[claude] el plan tiene problemas:\n- ${problems.join('\n- ')}`)
    messages.push(
      { role: 'assistant', content: message.content },
      { role: 'user', content: `Corrige estos problemas y devuelve el JSON completo:\n- ${problems.join('\n- ')}` }
    )
  }
  throw new Error('Claude no devolvió un plan válido tras 3 intentos')
}

/** Segunda pasada con Claude (ver `refineFocusBoxesWith`); se usa cuando no hay GEMINI_API_KEY. */
export async function refineFocusBoxes(params: {
  plan: CreativePlan
  clips: DirectorClip[]
  model?: string
  apiKey?: string
}): Promise<CreativePlan> {
  const anthropic = client(params.apiKey)
  const model = params.model ?? DEFAULT_MODEL
  return refineFocusBoxesWith({
    plan: params.plan,
    clips: params.clips,
    tag: 'claude',
    locate: async (img, what) => {
      let message: Anthropic.Beta.BetaMessage
      try {
        message = await anthropic.beta.messages.create({
          model,
          max_tokens: 8000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } },
                { type: 'text', text: locatePrompt(what) },
              ],
            },
          ],
          output_config: { effort: 'low', format: outputFormat(detectionSchema) },
          ...fallbackParams(model),
        })
      } catch (err) {
        throw explain(err)
      }
      if (message.stop_reason !== 'end_turn') return null
      try {
        const parsed = detectionSchema.safeParse(JSON.parse(textOf(message)))
        return parsed.success && parsed.data.found ? boxToFocus(parsed.data.box_2d) : null
      } catch {
        return null
      }
    },
  })
}
