/**
 * Claude como editor de Reels: UNA llamada por Reel que devuelve el montaje (cortes y orden)
 * y las frases a destacar en subtítulos. Salida estructurada (JSON schema), así no hay
 * reintentos por JSON mal formado; los errores de red/429/5xx los reintenta el SDK.
 *
 * Consumo: modelo y esfuerzo se ajustan por env (CLAUDE_REELS_MODEL, CLAUDE_REELS_EFFORT)
 * y cada llamada deja en el log los tokens y el costo aproximado.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SequenceItem } from './segmenter'
import type { SegmentFrame } from './segment-frames'
import {
  CAMERA_MOTIONS,
  COLOR_FILTERS,
  HOOK_ANIMATIONS,
  HOOK_SFX,
  PALETTES,
  TRANSITION_STYLES,
  normalizeVisualPlan,
  type VisualPlan,
} from './visual-plan'

const DEFAULT_MODEL = 'claude-opus-5-5'
const DEFAULT_EFFORT: Effort = 'medium'
const MAX_OUTPUT_TOKENS = 16_000

type Effort = 'low' | 'medium' | 'high'

/** USD por millón de tokens (entrada, salida) — solo para el log de costo. */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
}

export type AiHighlightKind = 'spec' | 'feature' | 'emotional'

export interface AiHighlightPhrase {
  phrase: string
  kind: AiHighlightKind
  priority: number
}

export interface ReelEditorUsage {
  model: string
  effort: Effort
  frames: number
  input_tokens: number
  output_tokens: number
  /** Aproximado, con precios de lista. */
  cost_usd: number | null
}

export interface ReelEditorResult {
  sequence: SequenceItem[]
  total_duration: number
  overall_strategy: string
  voice_over_insert_after_count?: number
  caption_highlights: AiHighlightPhrase[]
  visual_plan: VisualPlan | null
  usage: ReelEditorUsage
}

const OVERLAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['clip_index', 'trim_start', 'trim_end'],
  properties: {
    clip_index: { type: 'integer' },
    trim_start: { type: 'number' },
    trim_end: { type: 'number' },
  },
}

const VISUAL_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'style_name',
    'hook_text',
    'hook_animation',
    'hook_sfx',
    'palette',
    'transitions',
    'camera_motion',
    'color_filter',
    'spec_cards',
    'card_animation',
  ],
  properties: {
    style_name: { type: 'string' },
    hook_text: { type: 'string' },
    hook_animation: { type: 'string', enum: [...HOOK_ANIMATIONS] },
    hook_sfx: { type: 'string', enum: [...HOOK_SFX] },
    palette: { type: 'string', enum: [...PALETTES] },
    transitions: { type: 'string', enum: [...TRANSITION_STYLES] },
    camera_motion: { type: 'string', enum: [...CAMERA_MOTIONS] },
    color_filter: { type: 'string', enum: [...COLOR_FILTERS] },
    spec_cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['segment_id', 'text'],
        properties: { segment_id: { type: 'string' }, text: { type: 'string' } },
      },
    },
    card_animation: { type: 'string', enum: [...HOOK_ANIMATIONS] },
  },
}

const EDIT_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'sequence',
    'total_duration',
    'overall_strategy',
    'voice_over_insert_after_count',
    'caption_highlights',
    'visual_plan',
  ],
  properties: {
    sequence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'segment_id',
          'clip_index',
          'trim_start',
          'trim_end',
          'trim_duration',
          'order',
          'reason',
          'visual_overlay',
        ],
        properties: {
          segment_id: { type: 'string' },
          clip_index: { type: 'integer' },
          trim_start: { type: 'number' },
          trim_end: { type: 'number' },
          trim_duration: { type: 'number' },
          order: { type: 'integer' },
          reason: { type: 'string' },
          visual_overlay: { anyOf: [OVERLAY_SCHEMA, { type: 'null' }] },
        },
      },
    },
    total_duration: { type: 'number' },
    overall_strategy: { type: 'string' },
    voice_over_insert_after_count: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    caption_highlights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['phrase', 'kind', 'priority'],
        properties: {
          phrase: { type: 'string' },
          kind: { type: 'string', enum: ['spec', 'feature', 'emotional'] },
          priority: { type: 'integer' },
        },
      },
    },
    visual_plan: VISUAL_PLAN_SCHEMA,
  },
}

interface RawEditPlan {
  sequence: (Omit<SequenceItem, 'visual_overlay'> & {
    visual_overlay: SequenceItem['visual_overlay'] | null
  })[]
  total_duration: number
  overall_strategy: string
  voice_over_insert_after_count: number | null
  caption_highlights: AiHighlightPhrase[]
  visual_plan: unknown
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error('Falta ANTHROPIC_API_KEY en las variables de entorno (Claude edita los Reels).')
  }
  client ??= new Anthropic()
  return client
}

function resolveEffort(): Effort {
  const raw = process.env.CLAUDE_REELS_EFFORT?.trim().toLowerCase()
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : DEFAULT_EFFORT
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICE_PER_MTOK[model]
  if (!price) return null
  return Number(((inputTokens * price.input + outputTokens * price.output) / 1_000_000).toFixed(4))
}

/** Cuadros etiquetados: texto con el segment_id justo antes de cada imagen. */
function frameBlocks(frames: SegmentFrame[]): Anthropic.Beta.BetaContentBlockParam[] {
  return frames.flatMap((f): Anthropic.Beta.BetaContentBlockParam[] => [
    { type: 'text', text: `Cuadro de ${f.segment_id} (clip ${f.clip_index}, segundo ${f.sec})` },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } },
  ])
}

export async function requestReelEditPlan(
  prompt: string,
  frames: SegmentFrame[],
  jobId: string
): Promise<ReelEditorResult> {
  const model = process.env.CLAUDE_REELS_MODEL?.trim() || DEFAULT_MODEL
  const effort = resolveEffort()

  // Si el modelo rechaza el pedido, la API lo reintenta en el modelo de respaldo recomendado (Haiku no lo admite).
  const fallback = /^claude-(opus|sonnet|fable)/.test(model)
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : {}

  const response = await getClient().beta.messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    ...fallback,
    output_config: {
      effort,
      format: { type: 'json_schema', schema: EDIT_PLAN_SCHEMA },
    },
    messages: [{ role: 'user', content: [...frameBlocks(frames), { type: 'text', text: prompt }] }],
  })

  const usage: ReelEditorUsage = {
    model: response.model,
    effort,
    frames: frames.length,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cost_usd: estimateCostUsd(response.model, response.usage.input_tokens, response.usage.output_tokens),
  }
  console.log(
    `[VideoV2Pipeline][${jobId}][Claude] ${usage.model} (esfuerzo ${effort}): ${usage.frames} cuadros, ` +
      `${usage.input_tokens} tokens entrada, ${usage.output_tokens} salida` +
      (usage.cost_usd != null ? ` ≈ $${usage.cost_usd}` : '')
  )

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude rechazó el pedido (${response.stop_details?.category ?? 'sin categoría'}).`)
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`La respuesta de Claude se cortó al llegar a ${MAX_OUTPUT_TOKENS} tokens.`)
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const raw = JSON.parse(text) as RawEditPlan

  return {
    sequence: raw.sequence.map(({ visual_overlay, ...item }) => ({
      ...item,
      ...(visual_overlay ? { visual_overlay } : {}),
    })),
    total_duration: raw.total_duration,
    overall_strategy: raw.overall_strategy,
    ...(raw.voice_over_insert_after_count != null
      ? { voice_over_insert_after_count: raw.voice_over_insert_after_count }
      : {}),
    caption_highlights: raw.caption_highlights.slice(0, 8),
    visual_plan: normalizeVisualPlan(raw.visual_plan),
    usage,
  }
}
