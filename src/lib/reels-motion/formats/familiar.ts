/**
 * Formato "familiar" (SUV, jeep, sedán, hatchback): luminoso y cercano. Títulos 3D color perla,
 * tarjetas de vidrio con ícono, contador que gira hasta la cifra, asientos que se llenan, ruta de
 * viaje, WhatsApp y "Seguir". Lo dibuja reels-motion/runtime/familiar.js.
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

export const FAMILIAR_ACCENTS = ['coral', 'cielo', 'menta', 'sol'] as const
export const FAMILIAR_FINISHES = ['perla', 'caramelo'] as const
export const FAMILIAR_BEAT_KINDS = [
  'titulo_3d',
  'dato',
  'contador',
  'tarjeta',
  'etiquetas',
  'asientos',
  'ruta',
  'whatsapp',
  'seguir',
  'transicion',
] as const
export const FAMILIAR_ICONS = [
  'pantalla',
  'volante',
  'motor',
  'traccion',
  'asiento',
  'maleta',
  'camara',
  'aire',
  'seguridad',
  'combustible',
  'caja',
  'llave',
  'estrella',
] as const
/** El sistema pone una transición en cada cambio de toma; Claude puede elegir cuál va en un corte. */
export const FAMILIAR_TRANSITIONS = ['zoom', 'barrido', 'circulo', 'destello', 'luz', 'brillo', 'foto'] as const

export type FamiliarAccent = (typeof FAMILIAR_ACCENTS)[number]
export type FamiliarFinish = (typeof FAMILIAR_FINISHES)[number]
export type FamiliarBeatKind = (typeof FAMILIAR_BEAT_KINDS)[number]
export type FamiliarIcon = (typeof FAMILIAR_ICONS)[number]
export type FamiliarTransition = (typeof FAMILIAR_TRANSITIONS)[number]

export const FAMILIAR_ACCENT_COLORS: Record<FamiliarAccent, string> = {
  coral: '#FF6B4A',
  cielo: '#3BA7FF',
  menta: '#2ED3A0',
  sol: '#FFB020',
}

export interface FamiliarStyle {
  name: string
  accent: FamiliarAccent
  /** Acabado de los títulos 3D: perla (blanco nacarado) o caramelo (color brillante). */
  finish: FamiliarFinish
}

export interface FamiliarHook {
  /** Palabra 3D del segundo 0 (normalmente el modelo). */
  word: string
  /** Hasta 2 chips bajo el título (marca, año). */
  chips: string[]
  /** Dato fuerte del gancho (ej. SOLO / 14.000 km); null si no hay. */
  badge_label: string | null
  badge_value: string | null
  entrance: Entrance
  face_top: number | null
  face_bottom: number | null
}

export interface FamiliarBeat {
  kind: FamiliarBeatKind
  segment_id: string
  cue_word: string | null
  offset: number
  duration: number
  slot: Slot | null
  /** Título, valor o pregunta principal. */
  text: string
  /** Línea secundaria (subtítulo de la tarjeta, unidad del contador, botón). */
  sub: string
  /** Texto chico de arriba (ej. KILOMETRAJE, SOLO). */
  label: string
  /** Nota de abajo del contador (ej. RECORRIDOS · COMO NUEVA). */
  note: string
  icon: FamiliarIcon | null
  /** Chips de "etiquetas" o paradas de la "ruta". */
  items: string[]
  count: number | null
  /** Toque animado sobre lo que señala la tarjeta (% del cuadro). */
  point_x: number | null
  point_y: number | null
  size: Size | null
  entrance: Entrance | null
  transition: FamiliarTransition | null
  /** Emoji que salta junto al gráfico (ej. 🔥, ✅, 📱); null si no va. */
  emoji: string | null
  face_top: number | null
  face_bottom: number | null
}

export interface FamiliarPlan {
  format: 'familiar'
  style: FamiliarStyle
  hook: FamiliarHook
  beats: FamiliarBeat[]
  /** Línea del cierre (ej. Agenda tu prueba de manejo con toda la familia). */
  closing_line: string
}

const strings = { type: 'array', items: { type: 'string' } }

export const FAMILIAR_PLAN_SCHEMA = {
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
        accent: { type: 'string', enum: [...FAMILIAR_ACCENTS] },
        finish: { type: 'string', enum: [...FAMILIAR_FINISHES] },
      },
    },
    hook: {
      type: 'object',
      additionalProperties: false,
      required: ['word', 'chips', 'badge_label', 'badge_value', 'entrance', 'face_top', 'face_bottom'],
      properties: {
        word: { type: 'string' },
        chips: strings,
        badge_label: nullable({ type: 'string' }),
        badge_value: nullable({ type: 'string' }),
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
          'note',
          'icon',
          'items',
          'count',
          'point_x',
          'point_y',
          'size',
          'entrance',
          'transition',
          'emoji',
          'face_top',
          'face_bottom',
        ],
        properties: {
          kind: { type: 'string', enum: [...FAMILIAR_BEAT_KINDS] },
          segment_id: { type: 'string' },
          cue_word: nullable({ type: 'string' }),
          offset: { type: 'number' },
          duration: { type: 'number' },
          slot: nullable({ type: 'string', enum: [...SLOTS] }),
          text: { type: 'string' },
          sub: { type: 'string' },
          label: { type: 'string' },
          note: { type: 'string' },
          icon: nullable({ type: 'string', enum: [...FAMILIAR_ICONS] }),
          items: strings,
          count: nullable({ type: 'integer' }),
          point_x: nullable({ type: 'number' }),
          point_y: nullable({ type: 'number' }),
          size: nullable({ type: 'string', enum: [...SIZES] }),
          entrance: nullable({ type: 'string', enum: [...ENTRANCES] }),
          transition: nullable({ type: 'string', enum: [...FAMILIAR_TRANSITIONS] }),
          emoji: nullable({ type: 'string' }),
          face_top: nullable({ type: 'number' }),
          face_bottom: nullable({ type: 'number' }),
        },
      },
    },
    closing_line: { type: 'string' },
  },
}

export const FAMILIAR_PROMPT_BLOCK = `MOTION 3D — FORMATO FAMILIAR ("motion_plan"): este Reel es de un SUV o auto de familia y lleva gráficos animados encima de los cortes, luminosos y cercanos (no el estilo rudo de camioneta):
- Estilo: títulos 3D redondeados color perla (o caramelo) que rebotan, flotan y salen volando, tarjetas de vidrio blanco con ícono que se dibuja y texto que se escribe solo, chips, un contador que gira hasta la cifra, asientos que se llenan con la familia, una ruta de viaje que se dibuja, emojis que saltan y un cierre con tarjeta K-SI NUEVOS y botón de WhatsApp. Cada gráfico entra con sonido (pop, clic, tic, tecleo, golpe).
- El sistema anima solo: subtítulos palabra por palabra (las palabras clave saltan más grandes y las cifras cuentan), una transición en cada cambio de toma, zoom de golpe en las palabras clave, las tomas sin habla laten con la música y una barra de progreso arriba. Tú decides los gráficos.
- Lo más importante va desde el segundo 0: el gancho junta el modelo en 3D + chips (marca, año) + el dato que más vende (ej. SOLO / 14.000 km, ÚNICO DUEÑO, 7 PUESTOS).
- Guía de bloques (adáptala a lo que se dice; omite lo que no aplica):
  · 0–3 s gancho (lo arma "hook").
  · kilometraje o año: "contador" con la cifra exacta que se dice.
  · equipamiento (tracción, pantalla, mandos, cámara, aire, seguridad): una "tarjeta" por cosa, con ícono; si señala un botón o una pantalla que se ve, pon point_x/point_y y sale un toque animado ahí.
  · tomas sin habla del exterior: "etiquetas" en cascada (ej. SUV FAMILIAR / AÑO 2026 / 14.000 KM) y una transición "luz".
  · espacio para la familia: "titulo_3d" corto (ej. ¡CABEN TODOS!) + "asientos" con el número de puestos.
  · viajes o paseos (solo si se habla de eso): "ruta" con 2 o 3 paradas reales cerca de Cuenca (ej. CUENCA, EL CAJAS, LA COSTA).
  · llamado: "whatsapp" con la pregunta del asesor; "seguir" cuando pide que los sigan.
  · El sistema agrega solo el cierre (2,4 s); "closing_line" es la frase del cierre (ej. Agenda tu prueba de manejo con toda la familia).
- "style": accent (coral, cielo, menta o sol), finish (perla o caramelo) y un "name" corto.
- "hook": "word" = modelo o palabra 3D del segundo 0 (máx. 14 letras); "chips" = 0 a 2 textos cortos (ej. CHEVROLET, 2026); badge_label/badge_value = el dato fuerte (ej. "SOLO" y "14.000 km") o null; "entrance"; face_top/face_bottom del primer corte.
- "beats": los gráficos, en orden de tiempo. Cada uno va sobre un corte de tu "sequence" o una toma sin habla del orden de clips (segment_id) y entra cuando el asesor dice "cue_word" (palabra literal de ese corte); si no aplica, null y usa "offset" (segundos desde el inicio del corte). "duration" 1–3 s. "slot" = zona preferida (arriba, centro, abajo).
  · titulo_3d: "text" corto (1–3 palabras o una cifra), "size", "entrance".
  · dato: "label" chico (ej. SOLO, ÚNICO) + "text" = el valor (ej. 14.000 km).
  · contador: "text" = cifra (ej. 14.000), "sub" = unidad (ej. KM), "label" = qué es (ej. KILOMETRAJE), "note" = línea de abajo (ej. RECORRIDOS · COMO NUEVA) o "".
  · tarjeta: "icon", "text" = título corto (ej. Tracción 4x2), "sub" = beneficio en pocas palabras (ej. Cómoda y económica en ciudad), point_x/point_y opcionales.
  · etiquetas: "items" = 1 a 3 chips cortos.
  · asientos: "count" = puestos, "text" = ej. 5 PUESTOS.
  · ruta: "text" = título (ej. LISTA PARA EL VIAJE), "sub" = frase corta, "items" = 2 o 3 paradas.
  · whatsapp: "text" = pregunta (ej. ¿Quieres conocerla?), "sub" = botón (ej. ESCRÍBENOS AL WHATSAPP).
  · seguir: "text" = frase corta (ej. Síguenos para ver más autos).
  · transicion: elige el tipo de transición para entrar a ese corte: zoom (golpe de zoom), barrido (la toma entra deslizándose), circulo (se abre en círculo), destello (flash), luz (barrido de luz cálida), brillo (destello suave) o foto (flash con sonido de cámara, ideal para tomas del exterior). Los cortes que no elijas igual llevan una.
  · "emoji": en cualquier gráfico puedes poner un emoji que salta a su lado (ej. 🔥 en un dato fuerte, 📱 en la pantalla, 💪 en la tracción, 🙌 en los asientos, 💬 en el WhatsApp) o null; úsalo en la mitad de los gráficos, no en todos.
  · Campos que no aplican: null, [] o "".
- Ritmo: un gráfico nuevo cada 1,5–2 s, que nunca haya más de 3 s sin algo nuevo; los subtítulos van abajo en una píldora blanca y nada los tapa. Solo datos que de verdad se dicen o se ven; nada inventado.
${FACE_PROMPT_RULE}
- Varía acento, acabado, entradas y el orden de las piezas respecto a los reels anteriores de este auto.
`

const MAX_WORD = 14

function items(value: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => cleanText(v, maxLen))
    .filter(Boolean)
    .slice(0, max)
}

/** Un emoji (o una secuencia corta); cualquier otra cosa se descarta. */
function cleanEmoji(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t && t.length <= 12 && /\p{Extended_Pictographic}/u.test(t) && !/[\p{L}\p{N}]/u.test(t) ? t : null
}

/** Cifra del contador: solo dígitos y separadores (14.000, 2.026). */
function counterValue(value: unknown): string {
  const t = typeof value === 'string' ? value.replace(/[^0-9.,]/g, '') : typeof value === 'number' ? String(value) : ''
  return /\d/.test(t) ? t.slice(0, 9) : ''
}

function normalizeBeat(raw: unknown): FamiliarBeat | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const kind = pickOrNull(FAMILIAR_BEAT_KINDS, b.kind)
  const segmentId = typeof b.segment_id === 'string' ? b.segment_id.trim() : ''
  if (!kind || !segmentId) return null
  const count = typeof b.count === 'number' && Number.isFinite(b.count) ? Math.round(b.count) : null
  const beat: FamiliarBeat = {
    kind,
    segment_id: segmentId,
    cue_word: cueWord(b.cue_word),
    offset: num(b.offset, 0, 0, 30),
    duration: num(b.duration, 2, 0.8, 4),
    slot: pickOrNull(SLOTS, b.slot),
    text: '',
    sub: '',
    label: '',
    note: '',
    icon: pickOrNull(FAMILIAR_ICONS, b.icon),
    items: [],
    count: null,
    point_x: pct(b.point_x),
    point_y: pct(b.point_y),
    size: pickOrNull(SIZES, b.size),
    entrance: pickOrNull(ENTRANCES, b.entrance),
    transition: pickOrNull(FAMILIAR_TRANSITIONS, b.transition),
    emoji: cleanEmoji(b.emoji),
    ...faceBand(b.face_top, b.face_bottom),
  }
  switch (kind) {
    case 'titulo_3d':
      beat.text = cleanText(b.text, 16)
      return beat.text ? beat : null
    case 'dato':
      beat.label = cleanText(b.label, 16)
      beat.text = cleanText(b.text, 14, false)
      return beat.text ? beat : null
    case 'contador':
      beat.text = counterValue(b.text)
      beat.sub = cleanText(b.sub, 6)
      beat.label = cleanText(b.label, 18)
      beat.note = cleanText(b.note, 28)
      return beat.text ? beat : null
    case 'tarjeta':
      beat.icon ??= 'estrella'
      beat.text = cleanText(b.text, 24, false)
      beat.sub = cleanText(b.sub, 40, false)
      return beat.text ? beat : null
    case 'etiquetas':
      beat.items = items(b.items, 3, 16)
      return beat.items.length > 0 ? beat : null
    case 'asientos':
      if (count == null || count < 2 || count > 9) return null
      beat.count = count
      beat.text = cleanText(b.text, 16) || `${count} PUESTOS`
      return beat
    case 'ruta':
      beat.items = items(b.items, 3, 14)
      beat.text = cleanText(b.text, 24) || 'LISTA PARA EL VIAJE'
      beat.sub = cleanText(b.sub, 36, false)
      return beat.items.length >= 2 ? beat : null
    case 'whatsapp':
      beat.text = cleanText(b.text, 28, false) || '¿Quieres conocerlo?'
      beat.sub = cleanText(b.sub, 26) || 'ESCRÍBENOS AL WHATSAPP'
      beat.duration = Math.max(beat.duration, 2)
      return beat
    case 'seguir':
      beat.text = cleanText(b.text, 30, false) || 'Síguenos para ver más autos'
      beat.duration = Math.max(beat.duration, 2)
      return beat
    case 'transicion':
      return beat.transition ? beat : null
  }
}

export function normalizeFamiliarPlan(p: Record<string, unknown>): FamiliarPlan | null {
  const s = (p.style ?? {}) as Record<string, unknown>
  const h = (p.hook ?? {}) as Record<string, unknown>
  const word = cleanText(h.word, MAX_WORD)
  if (!word) return null
  const badgeValue = cleanText(h.badge_value, 14, false)
  return {
    format: 'familiar',
    style: {
      name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 40) : 'Familiar',
      accent: pick(FAMILIAR_ACCENTS, s.accent, 'coral'),
      finish: pick(FAMILIAR_FINISHES, s.finish, 'perla'),
    },
    hook: {
      word,
      chips: items(h.chips, 2, 14),
      badge_label: badgeValue ? cleanText(h.badge_label, 12) || null : null,
      badge_value: badgeValue || null,
      entrance: pick(ENTRANCES, h.entrance, 'caer'),
      ...faceBand(h.face_top, h.face_bottom),
    },
    beats: Array.isArray(p.beats)
      ? p.beats.map(normalizeBeat).filter((b): b is FamiliarBeat => b != null).slice(0, MAX_BEATS)
      : [],
    closing_line: cleanText(p.closing_line, 60, false),
  }
}

export function defaultFamiliarPlan(vehicle?: { brand?: string | null; model?: string | null; year?: string | number | null } | null): FamiliarPlan {
  return {
    format: 'familiar',
    style: { name: 'Base', accent: 'coral', finish: 'perla' },
    hook: {
      word: cleanText(vehicle?.model, MAX_WORD) || 'FAMILIAR',
      chips: [cleanText(vehicle?.brand, 14), cleanText(vehicle?.year != null ? String(vehicle.year) : '', 6)].filter(Boolean),
      badge_label: null,
      badge_value: null,
      entrance: 'caer',
      face_top: null,
      face_bottom: null,
    },
    beats: [],
    closing_line: '',
  }
}

export function describeFamiliarPlan(plan: FamiliarPlan): string {
  const s = plan.style
  const kinds = [...new Set(plan.beats.map((b) => (b.kind === 'transicion' ? `transición ${b.transition}` : b.kind)))]
  return (
    `Motion 3D familiar «${s.name}»: acento ${s.accent}, títulos ${s.finish}, gancho «${plan.hook.word}» ` +
    `(${plan.hook.entrance}${plan.hook.badge_value ? `, dato ${plan.hook.badge_value}` : ''}); piezas: ${kinds.join(', ') || 'ninguna'}`
  )
}
