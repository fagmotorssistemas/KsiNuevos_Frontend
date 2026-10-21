/**
 * Cliente de Claude (Anthropic) para la Fábrica de Reels: análisis editorial, caption y frases a destacar.
 * Modelo configurable con CLAUDE_REELS_MODEL (por defecto Claude Opus 5.5).
 */

import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_REELS_MODEL = process.env.CLAUDE_REELS_MODEL?.trim() || 'claude-opus-5-5'

/** Modelos con respaldo automático del servidor si un filtro de seguridad rechaza la solicitud. */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5'])

export function getClaude(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey })
}

export function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

/** Parámetros para que el servidor reintente con otro modelo si el elegido rechaza el pedido. */
export function claudeFallbackParams(model: string) {
  return FALLBACK_MODELS.has(model)
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : {}
}

/** Texto de la respuesta (sin bloques de razonamiento). Lanza si Claude rechazó el pedido. */
export function claudeResponseText(message: Anthropic.Beta.BetaMessage): string {
  if (message.stop_reason === 'refusal') {
    const d = message.stop_details
    throw new Error(`Claude rechazó el pedido (${d?.category ?? 'sin categoría'})${d?.explanation ? `: ${d.explanation}` : ''}`)
  }
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

/** Errores de la API en palabras claras (se guardan en el job y los ve el equipo). */
export function explainClaudeError(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) return new Error('Anthropic: la clave ANTHROPIC_API_KEY no es válida')
  if (err instanceof Anthropic.PermissionDeniedError) return new Error(`Anthropic: la clave no tiene permiso (${err.message})`)
  if (err instanceof Anthropic.RateLimitError) return new Error('Anthropic: límite de uso alcanzado, intenta en unos minutos')
  if (err instanceof Anthropic.BadRequestError) return new Error(`Anthropic rechazó la solicitud: ${err.message}`)
  if (err instanceof Anthropic.APIError) return new Error(`Anthropic falló (${err.status ?? 'sin conexión'}): ${err.message}`)
  return err instanceof Error ? err : new Error(String(err))
}

/** Pedido corto de solo texto (caption, frases a destacar): poco razonamiento, respuesta rápida. */
export async function askClaudeText(prompt: string, opts: { maxTokens?: number } = {}): Promise<string> {
  const client = getClaude()
  try {
    const message = await client.beta.messages.create({
      model: CLAUDE_REELS_MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
      ...claudeFallbackParams(CLAUDE_REELS_MODEL),
    })
    return claudeResponseText(message)
  } catch (err) {
    throw explainClaudeError(err)
  }
}
