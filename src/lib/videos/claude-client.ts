/**
 * Cliente de Claude compartido por los Reels (montaje y texto de las publicaciones).
 * Modelo por env CLAUDE_REELS_MODEL (por defecto claude-opus-5-5).
 */

import Anthropic from '@anthropic-ai/sdk'

export const DEFAULT_REELS_MODEL = 'claude-opus-5-5'

export function resolveReelsModel(): string {
  return process.env.CLAUDE_REELS_MODEL?.trim() || DEFAULT_REELS_MODEL
}

let client: Anthropic | null = null

/** `purpose` va en el error si falta la clave (ej. "Claude edita los Reels"). */
export function getClaudeClient(purpose: string): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error(`Falta ANTHROPIC_API_KEY en las variables de entorno (${purpose}).`)
  }
  client ??= new Anthropic()
  return client
}

/** Si el modelo rechaza el pedido, la API lo reintenta en el modelo de respaldo recomendado (Haiku no lo admite). */
export function serverSideFallback(model: string) {
  return /^claude-(opus|sonnet|fable)/.test(model)
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : {}
}
