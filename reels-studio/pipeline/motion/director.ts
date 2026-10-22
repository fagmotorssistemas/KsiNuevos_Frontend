/**
 * Claude como director de motion graphics: una conversación que (1) escribe la composición a partir del guion y los
 * cuadros, (2) corrige los errores que encuentra HyperFrames y (3) revisa capturas del resultado y lo mejora.
 * La conversación solo crece hacia adelante (se devuelve el contenido completo de cada respuesta), así el system
 * prompt y lo anterior quedan en caché.
 */
import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import type { Blocks } from './compose'
import { FIX_PROMPT, REVIEW_PROMPT } from './prompt'

export const MOTION_MODEL = process.env.CLAUDE_MOTION_MODEL ?? process.env.CLAUDE_DIRECTOR_MODEL ?? 'claude-opus-5-5'
const EFFORT = (process.env.CLAUDE_MOTION_EFFORT ?? 'high') as 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Modelos con respaldo automático del servidor si un filtro de seguridad rechaza la solicitud. */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'])

export type MotionResult = Blocks & { notes: string }

function explain(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) return new Error('Anthropic: la clave ANTHROPIC_API_KEY no es válida')
  if (err instanceof Anthropic.RateLimitError) return new Error('Anthropic: límite de uso alcanzado, intenta en unos minutos')
  if (err instanceof Anthropic.BadRequestError) return new Error(`Anthropic rechazó la solicitud: ${err.message}`)
  if (err instanceof Anthropic.APIError) return new Error(`Anthropic falló (${err.status ?? 'sin conexión'}): ${err.message}`)
  return err instanceof Error ? err : new Error(String(err))
}

const textOf = (m: Anthropic.Beta.BetaMessage) =>
  m.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

/** Contenido de la última <tag>…</tag> (sin cercas ``` que a veces se cuelan). */
function tag(text: string, name: string): string | null {
  const all = [...text.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g'))]
  if (!all.length) return null
  return all[all.length - 1][1].replace(/^\s*```[a-z]*\s*\n?/i, '').replace(/\n?\s*```\s*$/, '').trim()
}

export function parseBlocks(text: string): MotionResult | null {
  const css = tag(text, 'css')
  const markup = tag(text, 'markup')
  const timeline = tag(text, 'timeline')
  const three = tag(text, 'three')
  if (css === null || markup === null || timeline === null || three === null) return null
  return { css, markup, timeline, three, notes: tag(text, 'notas') ?? '' }
}

export class MotionDirector {
  private client: Anthropic
  private messages: Anthropic.Beta.BetaMessageParam[] = []
  readonly log: Array<{ step: string; input: number; cached: number; output: number }> = []

  constructor(
    private system: string[],
    private model = MOTION_MODEL,
    apiKey = process.env.ANTHROPIC_API_KEY
  ) {
    if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY')
    this.client = new Anthropic({ apiKey })
  }

  private async turn(step: string, content: Anthropic.Beta.BetaContentBlockParam[]): Promise<string> {
    this.messages.push({ role: 'user', content })
    console.log(`[motion] ${this.model}: ${step}…`)
    let message: Anthropic.Beta.BetaMessage
    try {
      message = await this.client.beta.messages
        .stream({
          model: this.model,
          max_tokens: 100000,
          system: this.system.map((text, i) => ({
            type: 'text' as const,
            text,
            ...(i === this.system.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
          })),
          messages: this.messages,
          output_config: { effort: EFFORT },
          ...(FALLBACK_MODELS.has(this.model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        })
        .finalMessage()
    } catch (err) {
      throw explain(err)
    }
    if (message.stop_reason === 'refusal') throw new Error(`Claude no quiso hacer este Reel (${message.stop_details?.category ?? 'sin categoría'})`)
    if (message.stop_reason === 'max_tokens') throw new Error('Claude se quedó sin espacio escribiendo la composición')
    // Se devuelve la respuesta completa (incluido el pensamiento) para que la conversación siga válida y en caché.
    this.messages.push({ role: 'assistant', content: message.content })
    const u = message.usage
    const cached = u.cache_read_input_tokens ?? 0
    const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + cached
    this.log.push({ step, input, cached, output: u.output_tokens })
    console.log(`[motion] ${step}: entrada ${input} (${cached} desde caché), salida ${u.output_tokens}`)
    return textOf(message)
  }

  /** Pide los bloques; si la respuesta no los trae completos, lo vuelve a pedir una vez. */
  private async blocks(step: string, content: Anthropic.Beta.BetaContentBlockParam[]): Promise<MotionResult> {
    const text = await this.turn(step, content)
    const parsed = parseBlocks(text)
    if (parsed) return parsed
    const again = await this.turn(`${step} (formato)`, [
      { type: 'text', text: 'Faltan etiquetas. Devuelve las cinco completas: <notas>, <css>, <markup>, <timeline> y <three> (vacía si no usas 3D).' },
    ])
    const retry = parseBlocks(again)
    if (!retry) throw new Error('Claude no devolvió la composición en el formato pedido')
    return retry
  }

  /** Primera versión: guion + cuadros del video crudo. */
  write(brief: string, frames: Array<{ t: number; label: string; data: string }>): Promise<MotionResult> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: 'text', text: `GUION DEL REEL\n\n${brief}\n\nCUADROS DEL VIDEO (sin gráficos), en orden:` }]
    for (const f of frames) {
      content.push({ type: 'text', text: `t = ${f.t.toFixed(2)} s · ${f.label}` })
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } })
    }
    content.push({ type: 'text', text: 'Diseña y escribe la capa de motion graphics de este Reel.' })
    return this.blocks('escribiendo la composición', content)
  }

  /** Corrige los errores de `hyperframes check`. */
  fix(findings: string): Promise<MotionResult> {
    return this.blocks('corrigiendo errores', [{ type: 'text', text: FIX_PROMPT(findings) }])
  }

  /** Revisión visual: capturas del render; devuelve bloques nuevos o null si está bien. */
  async review(shots: Array<{ t: number; path: string }>): Promise<MotionResult | null> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: 'text', text: REVIEW_PROMPT }]
    for (const s of shots) {
      content.push({ type: 'text', text: `t = ${s.t.toFixed(2)} s` })
      const ext = s.path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
      content.push({ type: 'image', source: { type: 'base64', media_type: ext, data: fs.readFileSync(s.path).toString('base64') } })
    }
    const text = await this.turn('revisando capturas', content)
    if (/<ok\s*\/>/.test(text) && !parseBlocks(text)) return null
    const parsed = parseBlocks(text)
    if (parsed) return parsed
    const again = await this.turn('revisión (formato)', [
      { type: 'text', text: 'Si hay cambios, devuelve las cinco etiquetas completas; si no, responde solo <ok/>.' },
    ])
    return /<ok\s*\/>/.test(again) && !parseBlocks(again) ? null : parseBlocks(again)
  }
}
