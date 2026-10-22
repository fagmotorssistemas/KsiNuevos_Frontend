/**
 * El montaje del Reel (lo que arma timeline.ts a partir del plan de Claude): tomas, teaser, subtítulos y momentos de
 * gráficos, todo en cuadros (frames) del Reel final y en píxeles del lienzo vertical. Es lo que recibe el director de
 * motion graphics para escribir la composición HyperFrames. JSON serializable (se guarda como props.json).
 */
import type { CaptionStyle, CUT_ROLES, FocusBox, HookStyle, PLACEMENTS, RawGraphic, TRANSITIONS, TypefaceName } from './schema'

/** Palabra de AssemblyAI: tiempos en milisegundos dentro del clip. */
export type Word = { text: string; start: number; end: number }

export type ClipSource = {
  id: string
  /** Ruta dentro de /public (staticFile) o URL absoluta (p. ej. URL firmada de Supabase). */
  src: string
  width: number
  height: number
  durationSec: number
}

export type Placement = (typeof PLACEMENTS)[number]

export type ScreenFocus = { cx: number; cy: number; w: number; h: number }

export type ZoomSpec = {
  focus: ScreenFocus
  /** Posición del objeto al final, si la cámara se mueve (seguimiento lineal). */
  focusEnd?: ScreenFocus
  /** Punto de la pantalla al que se lleva el objeto cuando el zoom está completo. */
  target: { x: number; y: number }
  scale: number
}

export type TimelineZoom = ZoomSpec & {
  /** Relativo al inicio del corte. */
  fromFrame: number
  durationInFrames: number
}

export type TimelineCut = {
  clipId: string
  src: string
  srcWidth: number
  srcHeight: number
  fromFrame: number
  durationInFrames: number
  trimStartSec: number
  trimEndSec: number
  role: (typeof CUT_ROLES)[number]
  transitionIn: (typeof TRANSITIONS)[number]
  captionPlacement: Placement
  zooms: TimelineZoom[]
  /** Toma del plan a la que pertenece: al quitar silencios, una toma se parte en varios cortes. */
  take: number
  /** 0 = primer pedazo de la toma; 1, 2… = saltos por silencio quitado (se alterna el encuadre). */
  jump: number
  /** Cuadros (relativos al corte) con un golpe de cámara: palabras clave y entradas de gráficos. */
  punches: number[]
  /** Intensidad del tramo (1–3): cuánto se mueve la cámara y qué tan fuertes son los golpes. */
  energy: Energy
}

/** Plano del teaser: se ve encima de la voz del arranque, sin su propio audio (la voz del asesor sigue sonando). */
export type TimelineInsert = {
  clipId: string
  src: string
  srcWidth: number
  srcHeight: number
  fromFrame: number
  durationInFrames: number
  trimStartSec: number
}

export type Energy = 1 | 2 | 3

export type TimelineGraphic = Omit<RawGraphic, 'focus' | 'clipId' | 'atSec' | 'durationSec'> & {
  id: string
  fromFrame: number
  durationInFrames: number
  /** Para feature_callout: zoom hacia el objeto señalado (mismo que aplica el clip). */
  zoom?: ZoomSpec
  sourceFocus?: FocusBox
  /** Para feature_callout: la tarjeta va arriba o abajo (opuesta al objeto). */
  cardAtTop?: boolean
}

export type CaptionWord = { text: string; fromFrame: number; toFrame: number; emphasis: boolean }

export type CaptionLine = {
  fromFrame: number
  toFrame: number
  placement: Placement
  words: CaptionWord[]
}

/**
 * Diseño del Reel: `ksi` (general, rojo/amarillo/blanco), `offroad` (camionetas: metal oxidado en 3D, llanta 3D,
 * etiquetas tipo escáner) o `suv` (elegante: acento champán, cromo con cantos dorados y tipografías propias).
 */
export type ReelTheme = 'ksi' | 'offroad' | 'suv'

/**
 * Lenguaje visual: `cine` (por defecto: franjas negras, grano, color de cine, tipografía de comercial de
 * autos, cortes secos) o `social` (el anterior: rebotes, cajas de color, stickers que laten).
 */
export type ReelLook = 'cine' | 'social'

export type SfxKind = 'whoosh' | 'pop' | 'hit' | 'riser'
export type SfxCue = { frame: number; kind: SfxKind }

export type Brand = {
  logoSrc: string
  accent: string
  highlight: string
  whatsapp?: string
}

export type ReelProps = {
  fps: number
  width: number
  height: number
  durationInFrames: number
  cuts: TimelineCut[]
  /** Teaser encima de la voz del arranque. */
  inserts: TimelineInsert[]
  /** Cola final (último cuadro congelado) para que el CTA respire. */
  tailFrames: number
  graphics: TimelineGraphic[]
  captions: CaptionLine[]
  /** Reglas de tiempos con que se armó: `offroad` (camionetas: cierre más largo, subtítulos más cortos) o `ksi`. */
  theme: ReelTheme
  /** Golpes de sonido sugeridos por el montaje (el director de motion graphics pone los suyos). */
  sfx: SfxCue[]
  brand: Brand
  /** Música de fondo: `startSec` = desde qué segundo de la pista empieza a sonar (null = sin música). */
  music: { src: string; volume: number; startSec?: number } | null
}
