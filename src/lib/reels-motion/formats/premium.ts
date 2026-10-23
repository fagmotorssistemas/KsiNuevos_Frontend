/**
 * Formato "premium" (marcas de lujo o autos de precio alto): pausado y elegante. Franjas de cine,
 * imagen con contraste de cine, modelo en 3D cromo espejo, cifras en oro pulido, frases grandes en
 * serif, señales con línea dorada, dial fino y un cierre "Colección Premium".
 * Lo dibuja reels-motion/runtime/premium.js.
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
} from '../plan-utils'

export const PREMIUM_ACCENTS = ['oro', 'champan', 'plata'] as const
export const PREMIUM_FINISHES = ['espejo', 'oro_pulido'] as const
export const PREMIUM_BEAT_KINDS = ['titulo_3d', 'ficha', 'senal', 'frase', 'dupla', 'dial', 'cita', 'agenda', 'transicion'] as const
/** El sistema pone una transición en cada cambio de toma; Claude puede elegir cuál va en un corte. */
export const PREMIUM_TRANSITIONS = ['barrido', 'negro', 'pelicula', 'desenfoque', 'zoom_suave'] as const

export type PremiumAccent = (typeof PREMIUM_ACCENTS)[number]
export type PremiumFinish = (typeof PREMIUM_FINISHES)[number]
export type PremiumBeatKind = (typeof PREMIUM_BEAT_KINDS)[number]
export type PremiumTransition = (typeof PREMIUM_TRANSITIONS)[number]

/** [acento, claro, oscuro] de cada metal. */
export const PREMIUM_ACCENT_COLORS: Record<PremiumAccent, [string, string, string]> = {
  oro: ['#C9A86A', '#F1DDAF', '#8E7140'],
  champan: ['#D9C29A', '#F7EAD0', '#9C8459'],
  plata: ['#B9C0CA', '#F0F3F7', '#7D8693'],
}

export interface PremiumStyle {
  name: string
  accent: PremiumAccent
  /** Acabado del modelo 3D del gancho (las cifras pueden llevar otro). */
  finish: PremiumFinish
}

export interface PremiumHook {
  /** Marca, en letras espaciadas sobre el modelo (ej. MERCEDES-BENZ); null si no aplica. */
  kicker: string | null
  /** Modelo en 3D (ej. C300). */
  word: string
  /** Frase corta bajo el modelo (ej. No es para todos.); null si no hay. */
  tagline: string | null
  entrance: Entrance
  face_top: number | null
  face_bottom: number | null
}

export interface PremiumBeat {
  kind: PremiumBeatKind
  segment_id: string
  cue_word: string | null
  offset: number
  duration: number
  slot: Slot | null
  /** Texto principal (cifra 3D, modelo de la ficha, frase, primera palabra de la dupla…). */
  text: string
  /** Segunda línea en dorado (frase, cita) o texto de abajo (cifra 3D, año de la ficha). */
  sub: string
  /** Texto chico en letras espaciadas (ej. MOTOR, LOS DETALLES, TRANSMISIÓN). */
  label: string
  /** Punto que señala la "senal" (% del cuadro). */
  point_x: number | null
  point_y: number | null
  size: Size | null
  /** Acabado de la cifra 3D (null = el del estilo). */
  finish: PremiumFinish | null
  transition: PremiumTransition | null
  face_top: number | null
  face_bottom: number | null
}

export interface PremiumPlan {
  format: 'premium'
  style: PremiumStyle
  hook: PremiumHook
  beats: PremiumBeat[]
  /** Línea del cierre (ej. Agenda una visita privada). */
  closing_line: string
}

export const PREMIUM_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['style', 'hook', 'beats', 'closing_line'],
  properties: {
    style: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'accent', 'finish'],
      properties: {
        name: { type: 'string' },
        accent: { type: 'string', enum: [...PREMIUM_ACCENTS] },
        finish: { type: 'string', enum: [...PREMIUM_FINISHES] },
      },
    },
    hook: {
      type: 'object',
      additionalProperties: false,
      required: ['kicker', 'word', 'tagline', 'entrance', 'face_top', 'face_bottom'],
      properties: {
        kicker: nullable({ type: 'string' }),
        word: { type: 'string' },
        tagline: nullable({ type: 'string' }),
        entrance: { type: 'string', enum: [...ENTRANCES] },
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
          'slot',
          'text',
          'sub',
          'label',
          'point_x',
          'point_y',
          'size',
          'finish',
          'transition',
          'face_top',
          'face_bottom',
        ],
        properties: {
          kind: { type: 'string', enum: [...PREMIUM_BEAT_KINDS] },
          segment_id: { type: 'string' },
          cue_word: nullable({ type: 'string' }),
          offset: { type: 'number' },
          duration: { type: 'number' },
          slot: nullable({ type: 'string', enum: [...SLOTS] }),
          text: { type: 'string' },
          sub: { type: 'string' },
          label: { type: 'string' },
          point_x: nullable({ type: 'number' }),
          point_y: nullable({ type: 'number' }),
          size: nullable({ type: 'string', enum: [...SIZES] }),
          finish: nullable({ type: 'string', enum: [...PREMIUM_FINISHES] }),
          transition: nullable({ type: 'string', enum: [...PREMIUM_TRANSITIONS] }),
          face_top: nullable({ type: 'number' }),
          face_bottom: nullable({ type: 'number' }),
        },
      },
    },
    closing_line: { type: 'string' },
  },
}

export const PREMIUM_PROMPT_BLOCK = `MOTION 3D — FORMATO PREMIUM ("motion_plan"): este Reel es de un auto de lujo y lleva gráficos animados encima de los cortes, con un estilo pausado y elegante (nada de barro ni colores fuertes):
- Estilo: franjas de cine arriba y abajo, imagen con contraste de cine, el modelo en 3D de cromo espejo con un brillo que lo recorre, cifras en oro pulido, frases grandes en serif blanca que aparecen letra por letra de desenfocadas a nítidas con la segunda línea en dorado brillante, señales con un punto y una línea dorada, un dial fino, fundidos a negro entre tomas y un cierre "Colección Premium". Sonidos suaves: golpe grave, brillo, tic de reloj, subida antes del llamado.
- El sistema anima solo: subtítulos que aparecen palabra por palabra, una transición en cada cambio de toma, un acercamiento suave en las palabras clave y una línea dorada de progreso arriba. Tú decides los gráficos.
- Lo más importante va desde el segundo 0: marca en letras espaciadas + modelo en 3D + una frase corta que enganche (ej. No es para todos.).
- Guía de bloques (adáptala a lo que se dice; omite lo que no aplica):
  · 0–3 s gancho (lo arma "hook").
  · presentación: "ficha" con tipo y versión, modelo y año, con un marco dorado que se dibuja.
  · detalles que se ven (salidas de aire, pantalla, aros, faros, costuras): 1 o 2 "senal" con el punto exacto sobre lo que se ve.
  · frase de impacto del asesor: "frase" (ej. "Se siente" / "diferente."); dos cualidades: "dupla" (ej. "Formal" & "Deportivo"). Mientras están en pantalla no salen subtítulos, así que usa las palabras que dice.
  · motor: "titulo_3d" con la cifra (ej. 2.0), label MOTOR y sub TURBO, en oro_pulido.
  · transmisión u otro dato de manejo: "dial" (text Auto, label TRANSMISIÓN).
  · cierre emocional: "cita" (ej. "Complementa" / "tu estilo.").
  · llamado: "agenda" (label SOLO EN K-SI NUEVOS, text AGENDA TU PRUEBA).
  · El sistema agrega solo el cierre (2,4 s con COLECCIÓN Premium · K-SI NUEVOS); "closing_line" es la frase del cierre (ej. Agenda una visita privada).
- "style": accent (oro, champan o plata), finish del modelo (espejo u oro_pulido) y un "name" corto.
- "hook": "kicker" = marca (ej. MERCEDES-BENZ) o null; "word" = modelo en 3D (máx. 12 letras, ej. C300); "tagline" = frase corta o null; "entrance" (fondo = llega desde lejos, es la más elegante); face_top/face_bottom del primer corte.
- "beats": los gráficos, en orden de tiempo. Cada uno va sobre un corte de tu "sequence" o una toma sin habla del orden de clips (segment_id) y entra cuando el asesor dice "cue_word" (palabra literal de ese corte); si no aplica, null y usa "offset" (segundos desde el inicio del corte). "duration" 1,5–3 s. "slot" = zona preferida (arriba, centro, abajo).
  · titulo_3d: "text" = cifra o palabra corta, "label" arriba y "sub" abajo (o ""), "size", "finish" (o null = el del estilo).
  · ficha: "label" (ej. SEDÁN · AMG LINE), "text" = modelo (ej. C 300), "sub" = año.
  · senal: "label" (ej. LOS DETALLES), "text" (ej. Salidas tipo turbina), point_x/point_y = dónde está en la toma (% del cuadro).
  · frase: "text" = primera línea, "sub" = remate en dorado.
  · dupla: "text" y "sub" = las dos cualidades.
  · dial: "text" corto (ej. Auto, 9G), "label" (ej. TRANSMISIÓN).
  · cita: "text" y "sub" (remate en dorado).
  · agenda: "label" y "text".
  · transicion: elige el tipo de transición para entrar a ese corte: barrido (haz de luz), negro (fundido a negro más largo), pelicula (destello cálido de película), desenfoque (la toma entra desenfocada y se aclara) o zoom_suave. Los cortes que no elijas igual llevan una.
  · Campos que no aplican: null o "".
- Ritmo: elegante pero sin pausas muertas, un gráfico cada 2 s (nunca más de 3 s sin algo nuevo) y uno a la vez (salvo dos señales seguidas). Los subtítulos van abajo en serif. Solo datos que de verdad se dicen o se ven; nada inventado.
${FACE_PROMPT_RULE}
- Varía acento, acabado, frases y el orden de las piezas respecto a los reels anteriores de este auto.
`

function normalizeBeat(raw: unknown): PremiumBeat | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const kind = pickOrNull(PREMIUM_BEAT_KINDS, b.kind)
  const segmentId = typeof b.segment_id === 'string' ? b.segment_id.trim() : ''
  if (!kind || !segmentId) return null
  const beat: PremiumBeat = {
    kind,
    segment_id: segmentId,
    cue_word: cueWord(b.cue_word),
    offset: num(b.offset, 0, 0, 30),
    duration: num(b.duration, 2.2, 1, 4),
    slot: pickOrNull(SLOTS, b.slot),
    text: '',
    sub: '',
    label: '',
    point_x: pct(b.point_x),
    point_y: pct(b.point_y),
    size: pickOrNull(SIZES, b.size),
    finish: pickOrNull(PREMIUM_FINISHES, b.finish),
    transition: pickOrNull(PREMIUM_TRANSITIONS, b.transition),
    ...faceBand(b.face_top, b.face_bottom),
  }
  switch (kind) {
    case 'titulo_3d':
      beat.text = cleanText(b.text, 12)
      beat.label = cleanText(b.label, 16)
      beat.sub = cleanText(b.sub, 16)
      return beat.text ? beat : null
    case 'ficha':
      beat.label = cleanText(b.label, 28)
      beat.text = cleanText(b.text, 14, false)
      beat.sub = cleanText(b.sub, 10)
      return beat.text ? beat : null
    case 'senal':
      beat.label = cleanText(b.label, 18)
      beat.text = cleanText(b.text, 26, false)
      return beat.text && beat.point_x != null && beat.point_y != null ? beat : null
    case 'frase':
    case 'cita':
      beat.text = cleanText(b.text, 20, false)
      beat.sub = cleanText(b.sub, 18, false)
      return beat.text ? beat : null
    case 'dupla':
      beat.text = cleanText(b.text, 14, false)
      beat.sub = cleanText(b.sub, 14, false)
      return beat.text && beat.sub ? beat : null
    case 'dial':
      beat.text = cleanText(b.text, 6, false)
      beat.label = cleanText(b.label, 14)
      return beat.text ? beat : null
    case 'agenda':
      beat.label = cleanText(b.label, 26) || 'SOLO EN K-SI NUEVOS'
      beat.text = cleanText(b.text, 22) || 'AGENDA TU PRUEBA'
      return beat
    case 'transicion':
      return beat.transition ? beat : null
  }
}

export function normalizePremiumPlan(p: Record<string, unknown>): PremiumPlan | null {
  const s = (p.style ?? {}) as Record<string, unknown>
  const h = (p.hook ?? {}) as Record<string, unknown>
  const word = cleanText(h.word, 12)
  if (!word) return null
  return {
    format: 'premium',
    style: {
      name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 40) : 'Premium',
      accent: pick(PREMIUM_ACCENTS, s.accent, 'oro'),
      finish: pick(PREMIUM_FINISHES, s.finish, 'espejo'),
    },
    hook: {
      kicker: cleanText(h.kicker, 22) || null,
      word,
      tagline: cleanText(h.tagline, 28, false) || null,
      entrance: pick(ENTRANCES, h.entrance, 'fondo'),
      ...faceBand(h.face_top, h.face_bottom),
    },
    beats: Array.isArray(p.beats)
      ? p.beats.map(normalizeBeat).filter((b): b is PremiumBeat => b != null).slice(0, MAX_BEATS)
      : [],
    closing_line: cleanText(p.closing_line, 40, false),
  }
}

export function defaultPremiumPlan(vehicle?: { brand?: string | null; model?: string | null } | null): PremiumPlan {
  return {
    format: 'premium',
    style: { name: 'Base', accent: 'oro', finish: 'espejo' },
    hook: {
      kicker: cleanText(vehicle?.brand, 22) || null,
      word: cleanText(vehicle?.model, 12) || 'PREMIUM',
      tagline: null,
      entrance: 'fondo',
      face_top: null,
      face_bottom: null,
    },
    beats: [],
    closing_line: '',
  }
}

export function describePremiumPlan(plan: PremiumPlan): string {
  const s = plan.style
  const kinds = [...new Set(plan.beats.map((b) => (b.kind === 'transicion' ? `transición ${b.transition}` : b.kind)))]
  const phrases = plan.beats.filter((b) => ['frase', 'dupla', 'cita'].includes(b.kind)).map((b) => `${b.text} ${b.sub}`.trim())
  return (
    `Motion 3D premium «${s.name}»: ${s.accent}, modelo en ${s.finish}, gancho «${plan.hook.word}»` +
    `${plan.hook.tagline ? ` + «${plan.hook.tagline}»` : ''}; piezas: ${kinds.join(', ') || 'ninguna'}` +
    `${phrases.length ? `; frases: ${phrases.join(' / ')}` : ''}`
  )
}
