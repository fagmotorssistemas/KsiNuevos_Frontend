/**
 * Plan visual del Reel: Claude elige el estilo (gancho del segundo 0, tarjetas de datos, transiciones,
 * movimiento de cámara, paleta y filtro) y shotstack.ts lo dibuja. Cada opción se traduce a nombres
 * válidos de Shotstack (sacados del SDK oficial), así un valor raro de la IA nunca rompe el render.
 *
 * Las transiciones siguen en los mismos cortes de siempre (CLIP_BOUNDARY_TRANSITIONS): solo cambia
 * cuál se usa, así los tiempos de subtítulos no se mueven.
 */

export const HOOK_ANIMATIONS = ['impacto', 'deslizar_izquierda', 'deslizar_derecha', 'caer', 'girar', 'revelar'] as const
export const PALETTES = ['rojo_ksi', 'amarillo_negro', 'blanco_negro', 'azul_electrico', 'naranja_fuego', 'verde_lima', 'dorado'] as const
export const TRANSITION_STYLES = ['deslizar', 'barrido', 'carrusel', 'giro', 'zoom', 'fundido', 'revelar'] as const
export const CAMERA_MOTIONS = ['acercar', 'alejar', 'alternar', 'paneo', 'quieto'] as const
export const COLOR_FILTERS = ['ninguno', 'contraste', 'intenso', 'suave'] as const
export const HOOK_SFX = ['whoosh', 'pop', 'ninguno'] as const

export type HookAnimation = (typeof HOOK_ANIMATIONS)[number]
export type Palette = (typeof PALETTES)[number]
export type TransitionStyle = (typeof TRANSITION_STYLES)[number]
export type CameraMotion = (typeof CAMERA_MOTIONS)[number]
export type ColorFilter = (typeof COLOR_FILTERS)[number]
export type HookSfx = (typeof HOOK_SFX)[number]

export interface SpecCard {
  /** Corte (segment_id de la secuencia) en cuyo inicio aparece la tarjeta. */
  segment_id: string
  text: string
}

export interface VisualPlan {
  /** Nombre corto del estilo, para no repetirlo en el próximo Reel del mismo auto. */
  style_name: string
  /** Texto grande del segundo 0 (no tiene que ser lo que se dice). */
  hook_text: string
  hook_animation: HookAnimation
  hook_sfx: HookSfx
  palette: Palette
  transitions: TransitionStyle
  camera_motion: CameraMotion
  color_filter: ColorFilter
  /** Datos cortos que aparecen cuando el asesor los menciona (0–4). */
  spec_cards: SpecCard[]
  card_animation: HookAnimation
}

const MAX_HOOK_CHARS = 42
const MAX_CARD_CHARS = 22
const MAX_CARDS = 4

function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  const t = value.replace(/\s+/g, ' ').trim().toUpperCase()
  return t.length > max ? t.slice(0, max).trim() : t
}

/** Normaliza lo que venga (Claude o BD); null si no hay plan usable (Reels viejos: estilo de siempre). */
export function normalizeVisualPlan(raw: unknown): VisualPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const cards = Array.isArray(o.spec_cards)
    ? (o.spec_cards as Record<string, unknown>[])
        .map((c) => ({
          segment_id: typeof c?.segment_id === 'string' ? c.segment_id : '',
          text: cleanText(c?.text, MAX_CARD_CHARS),
        }))
        .filter((c) => c.segment_id && c.text)
        .slice(0, MAX_CARDS)
    : []
  return {
    style_name: typeof o.style_name === 'string' ? o.style_name.trim().slice(0, 60) : '',
    hook_text: cleanText(o.hook_text, MAX_HOOK_CHARS),
    hook_animation: pick(HOOK_ANIMATIONS, o.hook_animation, 'impacto'),
    hook_sfx: pick(HOOK_SFX, o.hook_sfx, 'whoosh'),
    palette: pick(PALETTES, o.palette, 'rojo_ksi'),
    transitions: pick(TRANSITION_STYLES, o.transitions, 'deslizar'),
    camera_motion: pick(CAMERA_MOTIONS, o.camera_motion, 'alternar'),
    color_filter: pick(COLOR_FILTERS, o.color_filter, 'ninguno'),
    spec_cards: cards,
    card_animation: pick(HOOK_ANIMATIONS, o.card_animation, 'deslizar_izquierda'),
  }
}

// ─── Traducción a Shotstack ───────────────────────────────────────────────────

export interface PaletteColors {
  background: string
  text: string
  /** Destello entre cortes: centro → borde. */
  flash: [string, string, string]
}

export const PALETTE_COLORS: Record<Palette, PaletteColors> = {
  rojo_ksi: { background: '#CC0000', text: '#FFFFFF', flash: ['#FFE94A', '#FF8C00', '#FF4500'] },
  amarillo_negro: { background: '#FFD400', text: '#111111', flash: ['#FFF7B0', '#FFD400', '#FF9F00'] },
  blanco_negro: { background: '#FFFFFF', text: '#111111', flash: ['#FFFFFF', '#E6E6E6', '#9A9A9A'] },
  azul_electrico: { background: '#0057FF', text: '#FFFFFF', flash: ['#BFE3FF', '#3DA5FF', '#0057FF'] },
  naranja_fuego: { background: '#FF5A00', text: '#FFFFFF', flash: ['#FFE0A3', '#FF9A3D', '#FF5A00'] },
  verde_lima: { background: '#B6FF00', text: '#111111', flash: ['#F1FFC2', '#B6FF00', '#5FD000'] },
  dorado: { background: '#C9A227', text: '#111111', flash: ['#FFF4CC', '#E8C766', '#C9A227'] },
}

/** Transición de entrada (Shotstack) del texto gancho y de las tarjetas. */
export const ENTRANCE_TRANSITION: Record<HookAnimation, string | null> = {
  impacto: null, // se anima con escala (rebote), no con transición
  deslizar_izquierda: 'carouselLeftFast',
  deslizar_derecha: 'carouselRightFast',
  caer: 'carouselDownFast',
  girar: 'shuffleTopRightFast',
  revelar: 'revealFast',
}

/** Salidas en los cortes con transición (mismo orden que CLIP_BOUNDARY_TRANSITIONS) + entrada del 6.º clip. */
export const CUT_TRANSITIONS: Record<TransitionStyle, { outs: [string, string, string]; clip6In: string }> = {
  deslizar: { outs: ['slideUpFast', 'slideLeftFast', 'slideRightFast'], clip6In: 'slideLeft' },
  barrido: { outs: ['wipeRightFast', 'wipeLeftFast', 'wipeRightFast'], clip6In: 'wipeLeft' },
  carrusel: { outs: ['carouselUpFast', 'carouselLeftFast', 'carouselRightFast'], clip6In: 'carouselLeft' },
  giro: { outs: ['shuffleTopRightFast', 'shuffleBottomLeftFast', 'shuffleRightTopFast'], clip6In: 'shuffleTopLeft' },
  zoom: { outs: ['zoom', 'zoom', 'zoom'], clip6In: 'zoom' },
  fundido: { outs: ['fadeFast', 'fadeFast', 'fadeFast'], clip6In: 'fade' },
  revelar: { outs: ['revealFast', 'revealFast', 'revealFast'], clip6In: 'reveal' },
}

/** Efecto del primer instante del Reel y de cada corte siguiente (índice ≥ 1). */
export function cameraEffects(motion: CameraMotion): { intro: string | null; forCut: (i: number) => string | null } {
  switch (motion) {
    case 'acercar':
      return { intro: 'zoomInFast', forCut: () => 'zoomIn' }
    case 'alejar':
      return { intro: 'zoomOutFast', forCut: () => 'zoomOut' }
    case 'alternar':
      return { intro: 'zoomOutFast', forCut: (i) => (i % 2 === 0 ? 'zoomOut' : 'zoomIn') }
    case 'paneo':
      return { intro: 'zoomOutFast', forCut: (i) => (i % 2 === 0 ? 'slideRightSlow' : 'slideLeftSlow') }
    case 'quieto':
      return { intro: null, forCut: () => null }
  }
}

export const SHOTSTACK_FILTER: Record<ColorFilter, string | null> = {
  ninguno: null,
  contraste: 'contrast',
  intenso: 'boost',
  suave: 'muted',
}
