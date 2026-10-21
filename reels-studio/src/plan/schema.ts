/**
 * Plan Creativo: el contrato entre Gemini (director de marketing) y el render.
 *
 * Gemini NO dibuja nada: decide qué clips usar, en qué orden, qué gráfico va en cada
 * momento, con qué texto y dónde está en la imagen lo que se menciona. El render
 * (Remotion) convierte esas decisiones en animaciones 3D.
 *
 * Todos los tiempos de Gemini son "tiempo de fuente" (segundos dentro de cada clip),
 * porque así es como ve la transcripción de AssemblyAI. `timeline.ts` los pasa al
 * tiempo final del Reel.
 */
import { z } from 'zod'

export const GRAPHIC_TYPES = [
  'hook_text',
  'title_3d',
  'feature_callout',
  'spec_counter',
  'spec_chips',
  'feature_list',
  'price_tag',
  'cta_end',
  'sticker',
] as const
export type GraphicType = (typeof GRAPHIC_TYPES)[number]

export const ICONS = [
  'volante',
  'motor',
  'pantalla',
  'camara',
  'asiento',
  'rin',
  'velocimetro',
  'transmision',
  'traccion',
  'combustible',
  'aire',
  'seguridad',
  'maletero',
  'luces',
  'familia',
  'check',
  'estrella',
  'comentar',
  'guardar',
  'compartir',
  'fuego',
  'rayo',
  'persona',
] as const
export type IconName = (typeof ICONS)[number]

export const TRANSITIONS = ['corte', 'flash', 'zoom', 'whip', 'glitch'] as const
/**
 * Estilos de subtítulo (tipografía + animación), todos con los colores de la marca. Gemini elige
 * uno por Reel según el vehículo y el tono; ver CAPTION_STYLE_GUIDE en director-prompt.ts.
 */
export const CAPTION_STYLES = ['impacto', 'velocidad', 'elegante', 'robusto', 'caja', 'palabra'] as const
export type CaptionStyle = (typeof CAPTION_STYLES)[number]
export const CUT_ROLES = ['gancho', 'presentacion', 'caracteristica', 'dato', 'confianza', 'cierre', 'broll'] as const
export const PLACEMENTS = ['arriba', 'centro', 'abajo'] as const

/** Caja normalizada (0–1) sobre el cuadro ORIGINAL del clip: x,y = esquina superior izquierda. */
export const focusBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.02).max(1),
  h: z.number().min(0.02).max(1),
})
export type FocusBox = z.infer<typeof focusBoxSchema>

export const cutSchema = z.object({
  clipId: z.string(),
  startSec: z.number().min(0),
  endSec: z.number().positive(),
  role: z.enum(CUT_ROLES),
  transitionIn: z.enum(TRANSITIONS),
  captionPlacement: z.enum(PLACEMENTS),
  reason: z.string(),
})
export type Cut = z.infer<typeof cutSchema>

/**
 * Gráfico tal como lo devuelve Gemini: objeto plano con campos opcionales según el tipo
 * (los esquemas de respuesta de Gemini funcionan mejor sin uniones discriminadas).
 * `validateGraphic` revisa que cada tipo traiga lo que necesita.
 */
export const rawGraphicSchema = z.object({
  type: z.enum(GRAPHIC_TYPES),
  clipId: z.string(),
  atSec: z.number().min(0),
  durationSec: z.number().min(0.6).max(8),
  /** Texto principal: modelo, nombre de la característica, frase gancho, CTA... */
  text: z.string(),
  /** Texto secundario: marca, detalle de la característica, "te enviamos la info". */
  subtext: z.string().optional(),
  /** Para title_3d: año o versión que va en el bloque rojo. */
  badge: z.string().optional(),
  icon: z.enum(ICONS).optional(),
  /** Para spec_counter: valor numérico, prefijo/sufijo y unidad. */
  value: z.number().optional(),
  unit: z.string().optional(),
  prefix: z.string().optional(),
  /** Para spec_chips / feature_list: elementos cortos (2–5). */
  items: z.array(z.string()).optional(),
  /** Para feature_callout: dónde está la característica en el cuadro (para zoom + señalador). */
  focus: focusBoxSchema.optional(),
  /** Si la cámara se mueve: dónde está el objeto al TERMINAR el gráfico (el zoom lo sigue). */
  focusEnd: focusBoxSchema.optional(),
  placement: z.enum(PLACEMENTS).optional(),
  reason: z.string(),
})
export type RawGraphic = z.infer<typeof rawGraphicSchema>

export const transcriptFixSchema = z.object({
  clipId: z.string(),
  /** Palabras tal como vinieron de la transcripción (una o varias seguidas). */
  wrong: z.string(),
  right: z.string(),
})
export type TranscriptFix = z.infer<typeof transcriptFixSchema>

export const creativePlanSchema = z.object({
  strategy: z.string(),
  hookIdea: z.string(),
  cuts: z.array(cutSchema).min(1),
  graphics: z.array(rawGraphicSchema),
  transcriptFixes: z.array(transcriptFixSchema),
  /** Palabras que se resaltan en los subtítulos (beneficios, cifras, marca). */
  emphasisWords: z.array(z.string()),
  /** Leyenda corta para la publicación (no se renderiza). */
  caption: z.string(),
  /** Opcional para leer planes viejos; a Gemini se le exige (gemini-director.ts). */
  captionStyle: z.enum(CAPTION_STYLES).optional(),
})
export type CreativePlan = z.infer<typeof creativePlanSchema>

/** Lo que cada tipo de gráfico necesita para poder dibujarse. */
export function validateGraphic(g: RawGraphic): string | null {
  switch (g.type) {
    case 'feature_callout':
      return g.icon ? null : 'feature_callout necesita icon'
    case 'spec_counter':
      return typeof g.value === 'number' && Number.isFinite(g.value) ? null : 'spec_counter necesita value numérico'
    case 'spec_chips':
    case 'feature_list':
      return g.items && g.items.length >= 2 ? null : `${g.type} necesita al menos 2 items`
    case 'sticker':
      return g.text.trim() && g.icon ? null : 'sticker necesita text e icon'
    default:
      return g.text.trim() ? null : `${g.type} necesita text`
  }
}
