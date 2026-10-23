/**
 * Plan de movimiento ("Motion 3D"): Claude decide, en la misma llamada del montaje, qué gráficos van
 * encima de cada corte y el estilo del Reel. composer.ts lo convierte en tiempos absolutos y el
 * runtime lo dibuja.
 *
 * Hay un formato por tipo de vehículo, cada uno con su propio vocabulario de gráficos:
 * - camioneta (este archivo): títulos 3D de metal, placas, K-SI SCAN, ocupantes, barro.
 * - familiar (formats/familiar.ts): SUV y autos de familia; tarjetas de vidrio, contador, asientos, ruta.
 * - premium (formats/premium.ts): marcas de lujo; cromo espejo, oro, franjas de cine, frases en serif.
 *
 * Todo lo que llega de la IA se normaliza aquí: un valor raro nunca rompe el render.
 */

import {
  ENTRANCES,
  FACE_PROMPT_RULE,
  MAX_BEATS,
  SIZES,
  SLOTS,
  cleanText,
  cueWord,
  faceBand,
  nullable,
  num,
  pct,
  pick,
  pickOrNull,
  type Entrance,
  type Size,
  type Slot,
} from './plan-utils'
import {
  FAMILIAR_PLAN_SCHEMA,
  FAMILIAR_PROMPT_BLOCK,
  defaultFamiliarPlan,
  describeFamiliarPlan,
  normalizeFamiliarPlan,
  type FamiliarPlan,
} from './formats/familiar'
import {
  PREMIUM_PLAN_SCHEMA,
  PREMIUM_PROMPT_BLOCK,
  defaultPremiumPlan,
  describePremiumPlan,
  normalizePremiumPlan,
  type PremiumPlan,
} from './formats/premium'

export { ENTRANCES, SIZES, SLOTS, type Entrance, type Size, type Slot }

export const MOTION_FORMATS = ['camioneta', 'familiar', 'premium'] as const
export type MotionFormat = (typeof MOTION_FORMATS)[number]

export const MATERIALS = ['oxido', 'cromo', 'carbon', 'oro', 'rojo'] as const
export const ACCENTS = ['naranja', 'amarillo', 'rojo', 'verde_lima', 'azul', 'blanco'] as const
export const TITLE_FONTS = ['russo', 'blackops', 'anton'] as const
export const CAPTION_FONTS = ['anton', 'russo', 'montserrat'] as const
export const CUT_MOTIONS = ['golpe', 'empuje', 'mixto'] as const
export const HOOK_TEXTURES = ['barro', 'polvo', 'piedras'] as const
export const BEAT_KINDS = ['titulo_3d', 'placa', 'scan', 'ocupantes', 'comentario', 'transicion'] as const
export const TRANSITIONS = ['barro', 'destello', 'golpe'] as const

export type Material = (typeof MATERIALS)[number]
export type Accent = (typeof ACCENTS)[number]
export type TitleFont = (typeof TITLE_FONTS)[number]
export type CaptionFont = (typeof CAPTION_FONTS)[number]
export type CutMotion = (typeof CUT_MOTIONS)[number]
export type HookTexture = (typeof HOOK_TEXTURES)[number]
export type BeatKind = (typeof BEAT_KINDS)[number]
export type Transition = (typeof TRANSITIONS)[number]

export const ACCENT_COLORS: Record<Accent, string> = {
  naranja: '#E8701A',
  amarillo: '#FFC23A',
  rojo: '#E0242F',
  verde_lima: '#9BE22D',
  azul: '#2E8BFF',
  blanco: '#F2F2F2',
}

export interface MotionStyle {
  /** Nombre corto del estilo, para no repetirlo en el próximo Reel del mismo auto. */
  name: string
  material: Material
  accent: Accent
  title_font: TitleFont
  caption_font: CaptionFont
  cut_motion: CutMotion
}

export interface MotionHook {
  /** Palabra 3D del segundo 0 (ej. OFF-ROAD, IMPONENTE). */
  word: string
  /** Texto chico encima (ej. MODO) o null. */
  label: string | null
  texture: HookTexture
  entrance: Entrance
  /** De dónde salen tierra y piedras, en % del cuadro (0–100); null = abajo al centro. */
  origin_x: number | null
  origin_y: number | null
  /** Cabeza de la persona en el primer corte (% del alto), para no taparla; null = no hay nadie. */
  face_top: number | null
  face_bottom: number | null
}

export interface MotionBeat {
  kind: BeatKind
  /** Corte de "sequence" sobre el que aparece. */
  segment_id: string
  /** Palabra dicha en ese corte que marca la entrada (más preciso que offset). */
  cue_word: string | null
  /** Segundos desde el inicio del corte (si no hay cue_word o no se encuentra). */
  offset: number
  duration: number
  text: string
  size: Size | null
  slot: Slot | null
  entrance: Entrance | null
  debris: boolean
  count: number | null
  /** Punto que señala el K-SI SCAN, en % del cuadro (0–100). */
  point_x: number | null
  point_y: number | null
  /** K-SI SCAN sobre una pantalla: marco con línea de escaneo en vez de anillo. */
  screen: boolean
  transition: Transition | null
  /** Cabeza de la persona en ese corte (% del alto), para no taparla; null = no hay nadie. */
  face_top: number | null
  face_bottom: number | null
}

/** Plan del formato camioneta (el primero que tuvo el motor). */
export interface CamionetaPlan {
  format: 'camioneta'
  style: MotionStyle
  hook: MotionHook
  beats: MotionBeat[]
  closing_cta: string
}

export type MotionPlan = CamionetaPlan | FamiliarPlan | PremiumPlan

const CAMIONETA_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['style', 'hook', 'beats', 'closing_cta'],
  properties: {
    style: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'material', 'accent', 'title_font', 'caption_font', 'cut_motion'],
      properties: {
        name: { type: 'string' },
        material: { type: 'string', enum: [...MATERIALS] },
        accent: { type: 'string', enum: [...ACCENTS] },
        title_font: { type: 'string', enum: [...TITLE_FONTS] },
        caption_font: { type: 'string', enum: [...CAPTION_FONTS] },
        cut_motion: { type: 'string', enum: [...CUT_MOTIONS] },
      },
    },
    hook: {
      type: 'object',
      additionalProperties: false,
      required: ['word', 'label', 'texture', 'entrance', 'origin_x', 'origin_y', 'face_top', 'face_bottom'],
      properties: {
        word: { type: 'string' },
        label: nullable({ type: 'string' }),
        texture: { type: 'string', enum: [...HOOK_TEXTURES] },
        entrance: { type: 'string', enum: [...ENTRANCES] },
        origin_x: nullable({ type: 'number' }),
        origin_y: nullable({ type: 'number' }),
        face_top: nullable({ type: 'number' }),
        face_bottom: nullable({ type: 'number' }),
      },
    },
    beats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'kind',
          'segment_id',
          'cue_word',
          'offset',
          'duration',
          'text',
          'size',
          'slot',
          'entrance',
          'debris',
          'count',
          'point_x',
          'point_y',
          'screen',
          'transition',
          'face_top',
          'face_bottom',
        ],
        properties: {
          kind: { type: 'string', enum: [...BEAT_KINDS] },
          segment_id: { type: 'string' },
          cue_word: nullable({ type: 'string' }),
          offset: { type: 'number' },
          duration: { type: 'number' },
          text: { type: 'string' },
          size: nullable({ type: 'string', enum: [...SIZES] }),
          slot: nullable({ type: 'string', enum: [...SLOTS] }),
          entrance: nullable({ type: 'string', enum: [...ENTRANCES] }),
          debris: { type: 'boolean' },
          count: nullable({ type: 'integer' }),
          point_x: nullable({ type: 'number' }),
          point_y: nullable({ type: 'number' }),
          screen: { type: 'boolean' },
          transition: nullable({ type: 'string', enum: [...TRANSITIONS] }),
          face_top: nullable({ type: 'number' }),
          face_bottom: nullable({ type: 'number' }),
        },
      },
    },
    closing_cta: { type: 'string' },
  },
}

const CAMIONETA_PROMPT_BLOCK = `MOTION 3D ("motion_plan") — este Reel lleva gráficos animados encima de los cortes, al estilo de un editor profesional de camionetas:
- Estilo de la referencia: títulos en 3D de metal extruido (óxido con cantos de color, cromo, carbón, oro o rojo), subtítulos condensados en mayúsculas con la palabra activa en color, placas oscuras con franja de peligro, etiquetas "// 01 K-SI SCAN" que señalan partes del auto, barro y piedras que saltan, y un cierre con la placa K-SI NUEVOS.
- Formato camioneta (guía, no plantilla rígida; si el auto no es camioneta, adáptalo y omite lo que no aplica, como el balde):
  · 0–5 s gancho: textura (barro, polvo o piedras) + una palabra 3D fuerte desde el segundo 0, mientras el asesor hace la pregunta.
  · 5–8 s presentación: marca, modelo, versión y año como títulos 3D que caen por partes.
  · 8–14 s capó: cilindrada y combustible como cifra 3D gigante + palabra 3D + una placa con el beneficio.
  · 14–22 s interior: 3 o 4 K-SI SCAN numerados sobre lo que se ve (volante, tablero, pantalla, palanca); cifra 3D si dice velocidades.
  · 22–27 s cabina y balde: ocupantes (cifra 3D + íconos) y placas escalonadas (EQUIPOS, HERRAMIENTAS, CARGA); una transición de barro entre bloques.
  · 27–29 s respaldo: "RESPALDADA POR [MARCA]" o el diferencial (garantía, km, único dueño) con palabra 3D y piedras.
  · 29–32 s llamado: título 3D "COMENTA" + caja de comentario que se escribe sola con el texto exacto que pide el asesor.
  · El sistema agrega solo el cierre (2,4 s con K-SI NUEVOS · CUENCA · ECUADOR); "closing_cta" es la línea de abajo (ej. COMENTA "RANGER + MUNDIAL").
- "style": material, accent (color de acento), title_font, caption_font, cut_motion (golpe = cada corte entra con un golpe de zoom, empuje = acercamiento lento, mixto) y un "name" corto.
- "hook": "word" = palabra 3D del segundo 0 (1 palabra o 2 cortas, ej. OFF-ROAD, IMPONENTE, BESTIA); "label" = texto chico encima (ej. MODO) o null; "texture"; "entrance"; origin_x/origin_y = de dónde salen la tierra y las piedras en el primer cuadro (% del ancho y alto, ej. la llanta), o null; face_top/face_bottom = la cabeza de la persona en el primer corte.
- "beats": los gráficos, en orden de tiempo. Cada uno va sobre un corte de tu "sequence" o una toma sin habla del orden de clips (segment_id) y entra cuando el asesor dice "cue_word" (una palabra literal de ese corte, ej. "diésel"); si no aplica, null y usa "offset" (segundos desde el inicio del corte). "duration" 0,8–3 s.
  · titulo_3d: "text" corto (1 palabra, o cifra como 2.0 / 2024 / 5), "size" (gigante para cifras, grande o mediano), "slot" (arriba, centro, abajo), "entrance" (caer = cae con rebote, fondo = llega desde lejos, letras = letra por letra, golpe = impacto con temblor), "debris" true si estalla tierra al entrar.
  · placa: "text" de 1 a 3 palabras (ej. TRABAJO EXIGENTE, CARGA), "slot".
  · scan: "text" = lo que señala (ej. MANDOS AL VOLANTE), point_x/point_y = dónde está en la toma (% del cuadro, míralo en el cuadro del corte), "screen" true si es una pantalla.
  · ocupantes: "count" = número de ocupantes, "text" = OCUPANTES u otra palabra corta, "slot".
  · comentario: "text" = lo que el cliente debe comentar (ej. RANGER + MUNDIAL).
  · transicion: "transition" (barro = salpicón que tapa la toma, destello, golpe = sacudida) al inicio del corte; úsala 1 a 3 veces, en cambios de bloque.
  · Campos que no aplican: null, false o "".
- Ritmo: un gráfico nuevo cada 1–3 s, nunca dos en el mismo slot a la vez, y nada tapa los subtítulos (van abajo, fijos). Solo datos que de verdad se dicen o se ven.
${FACE_PROMPT_RULE}
- Varía material, acento, entradas, transiciones, palabra del gancho y orden de las piezas respecto a los reels anteriores de este auto.
`

const MAX_WORD = 14
const MAX_TEXT = 26

function normalizeBeat(raw: unknown): MotionBeat | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const kind = pickOrNull(BEAT_KINDS, b.kind)
  const segmentId = typeof b.segment_id === 'string' ? b.segment_id.trim() : ''
  if (!kind || !segmentId) return null
  const text = cleanText(b.text, kind === 'titulo_3d' ? MAX_WORD : MAX_TEXT)
  const transition = pickOrNull(TRANSITIONS, b.transition)
  if (kind === 'transicion' && !transition) return null
  if (['titulo_3d', 'placa', 'scan', 'comentario'].includes(kind) && !text) return null
  const count = typeof b.count === 'number' && Number.isFinite(b.count) ? Math.round(b.count) : null
  if (kind === 'ocupantes' && (count == null || count < 1 || count > 9)) return null
  return {
    kind,
    segment_id: segmentId,
    cue_word: cueWord(b.cue_word),
    offset: num(b.offset, 0, 0, 30),
    duration: num(b.duration, 1.6, 0.6, 4),
    text,
    size: pickOrNull(SIZES, b.size),
    slot: pickOrNull(SLOTS, b.slot),
    entrance: pickOrNull(ENTRANCES, b.entrance),
    debris: b.debris === true,
    count,
    point_x: pct(b.point_x),
    point_y: pct(b.point_y),
    screen: b.screen === true,
    transition,
    ...faceBand(b.face_top, b.face_bottom),
  }
}

function normalizeCamionetaPlan(p: Record<string, unknown>): CamionetaPlan | null {
  const s = (p.style ?? {}) as Record<string, unknown>
  const h = (p.hook ?? {}) as Record<string, unknown>
  const word = cleanText(h.word, MAX_WORD)
  if (!word) return null
  const beats = Array.isArray(p.beats)
    ? p.beats.map(normalizeBeat).filter((b): b is MotionBeat => b != null).slice(0, MAX_BEATS)
    : []
  return {
    format: 'camioneta',
    style: {
      name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 40) : 'Motion 3D',
      material: pick(MATERIALS, s.material, 'oxido'),
      accent: pick(ACCENTS, s.accent, 'naranja'),
      title_font: pick(TITLE_FONTS, s.title_font, 'russo'),
      caption_font: pick(CAPTION_FONTS, s.caption_font, 'anton'),
      cut_motion: pick(CUT_MOTIONS, s.cut_motion, 'golpe'),
    },
    hook: {
      word,
      label: cleanText(h.label, MAX_WORD) || null,
      texture: pick(HOOK_TEXTURES, h.texture, 'barro'),
      entrance: pick(ENTRANCES, h.entrance, 'fondo'),
      origin_x: pct(h.origin_x),
      origin_y: pct(h.origin_y),
      ...faceBand(h.face_top, h.face_bottom),
    },
    beats,
    closing_cta: cleanText(p.closing_cta, 40),
  }
}

function describeCamionetaPlan(plan: CamionetaPlan): string {
  const s = plan.style
  const kinds = plan.beats.map((b) => (b.kind === 'transicion' ? `transición ${b.transition}` : b.kind))
  const transitions = [...new Set(kinds.filter((k) => k.startsWith('transición')))].join(', ') || 'sin transiciones'
  const titles = plan.beats.filter((b) => b.kind === 'titulo_3d').map((b) => `${b.text} (${b.entrance ?? 'caer'})`)
  return (
    `Motion 3D «${s.name}»: material ${s.material}, acento ${s.accent}, títulos ${s.title_font}, ` +
    `cortes ${s.cut_motion}, gancho «${plan.hook.word}» con ${plan.hook.texture} (${plan.hook.entrance}), ` +
    `${transitions}; títulos 3D: ${titles.join(', ') || 'ninguno'}`
  )
}

// ─── Formatos ─────────────────────────────────────────────────────────────────

export const MOTION_FORMAT_LABELS: Record<MotionFormat, string> = {
  camioneta: 'Camioneta',
  familiar: 'Familiar (SUV)',
  premium: 'Premium',
}

/** Esquema de "motion_plan" para la salida estructurada de Claude. */
export function motionPlanSchema(format: MotionFormat) {
  if (format === 'familiar') return FAMILIAR_PLAN_SCHEMA
  if (format === 'premium') return PREMIUM_PLAN_SCHEMA
  return CAMIONETA_PLAN_SCHEMA
}

/** Instrucciones del formato para el prompt del editor. */
export function motionPlanPromptBlock(format: MotionFormat): string {
  if (format === 'familiar') return FAMILIAR_PROMPT_BLOCK
  if (format === 'premium') return PREMIUM_PROMPT_BLOCK
  return CAMIONETA_PROMPT_BLOCK
}

/**
 * Normaliza lo que venga (Claude o BD); null si no hay plan usable.
 * `format` = el formato que se pidió; si falta se usa el guardado en el plan (los planes viejos son camioneta).
 */
export function normalizeMotionPlan(raw: unknown, format?: MotionFormat): MotionPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const f = format ?? pick(MOTION_FORMATS, p.format, 'camioneta')
  if (f === 'familiar') return normalizeFamiliarPlan(p)
  if (f === 'premium') return normalizePremiumPlan(p)
  return normalizeCamionetaPlan(p)
}

export interface MotionVehicle {
  brand?: string | null
  model?: string | null
  year?: string | number | null
}

/** Plan mínimo cuando el montaje no pasó por Claude (guion o checklist): gancho y cierre. */
export function defaultMotionPlan(format: MotionFormat, vehicle?: MotionVehicle | null): MotionPlan {
  if (format === 'familiar') return defaultFamiliarPlan(vehicle)
  if (format === 'premium') return defaultPremiumPlan(vehicle)
  return {
    format: 'camioneta',
    style: { name: 'Base', material: 'oxido', accent: 'naranja', title_font: 'russo', caption_font: 'anton', cut_motion: 'golpe' },
    hook: {
      word: cleanText(vehicle?.model, MAX_WORD) || 'IMPONENTE',
      label: null,
      texture: 'barro',
      entrance: 'fondo',
      origin_x: null,
      origin_y: null,
      face_top: null,
      face_bottom: null,
    },
    beats: [],
    closing_cta: '',
  }
}

/** Una línea para el resumen de reels anteriores (previous-reels.ts). */
export function describeMotionPlan(plan: MotionPlan): string {
  if (plan.format === 'familiar') return describeFamiliarPlan(plan)
  if (plan.format === 'premium') return describePremiumPlan(plan)
  return describeCamionetaPlan(plan)
}

// ─── Formato según el vehículo ───────────────────────────────────────────────

const fold = (s: string | null | undefined) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/** Marcas que van con el formato premium (incluye cómo se escriben en el inventario, ej. MERCEDEZ BENZ). */
const PREMIUM_BRANDS = /\b(mercedes|mercedez|benz|bmw|audi|lexus|porsche|volvo|land ?rover|range ?rover|jaguar|infiniti|acura|cadillac|genesis|maserati|lincoln|alfa ?romeo|bentley|tesla)\b/
/** Desde este precio (USD) el auto se presenta como premium aunque la marca no lo sea. */
const PREMIUM_PRICE = 45000
const PICKUP_MODELS = /\b(hilux|ranger|d-?max|l200|frontier|navara|np300|bt-?50|amarok|tacoma|tundra|colorado|s10|silverado|wingle|poer|tunland|t60|t6|t8|f-?150|ram|maverick|alaskan|gladiator|raptor|cabina|pick ?up|camioneta)\b/

export interface MotionFormatVehicle extends MotionVehicle {
  /** type_body del inventario (jeep, suv, doble cabina, sedan…). */
  typeBody?: string | null
  price?: number | null
}

/**
 * Formato por defecto del vehículo: camionetas (cabina simple/doble) → camioneta; marcas de lujo o
 * precio alto → premium; SUV, jeep, sedán, hatchback y demás → familiar.
 * Sin ningún dato del vehículo se queda en camioneta, como antes de que hubiera formatos.
 */
export function resolveMotionFormat(v: MotionFormatVehicle | null | undefined): MotionFormat {
  const body = fold(v?.typeBody)
  const brand = fold(v?.brand)
  const model = fold(v?.model)
  if (/cabina|camioneta|pick ?up/.test(body)) return 'camioneta'
  if (PREMIUM_BRANDS.test(brand) || (v?.price != null && v.price >= PREMIUM_PRICE)) return 'premium'
  if (body) return 'familiar'
  if (PICKUP_MODELS.test(model)) return 'camioneta'
  return brand || model ? 'familiar' : 'camioneta'
}
