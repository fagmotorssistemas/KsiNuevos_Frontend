/**
 * Plan Creativo: el contrato entre Claude (director de marketing) y el render.
 *
 * Claude NO dibuja nada: decide qué clips usar, en qué orden, qué gráfico va en cada
 * momento, con qué texto y dónde está en la imagen lo que se menciona. El render
 * (Remotion) convierte esas decisiones en animaciones 3D.
 *
 * Todos los tiempos del plan son "tiempo de fuente" (segundos dentro de cada clip),
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
  'brillo',
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

/**
 * Entrada de cada toma. En modo cine: `disolver` fundido suave con la toma anterior, `whip` barrido con desenfoque,
 * `zoom` acercamiento de impacto, `flash` destello de luz cálida y `barrido` franja de color de marca que descubre la
 * toma nueva. `glitch` solo en look social.
 */
export const TRANSITIONS = ['corte', 'disolver', 'flash', 'zoom', 'whip', 'barrido', 'glitch'] as const
/**
 * Juego tipográfico de los títulos (gancho, presentación 3D, cifras, cierre). El director lo cambia de un Reel a otro
 * para que no se vean todos iguales (ver TYPEFACES en theme.ts).
 */
export const TYPEFACE_NAMES = ['clasica', 'potente', 'tecnica', 'deportiva', 'moderna', 'geometrica', 'lujo', 'editorial', 'premium', 'refinada'] as const
export type TypefaceName = (typeof TYPEFACE_NAMES)[number]
/** Las elegantes son exclusivas de los SUV, y los SUV solo usan estas (no comparten letra con camionetas ni el resto). */
export const SUV_TYPEFACES = ['lujo', 'editorial', 'premium', 'refinada'] as const satisfies readonly TypefaceName[]
const SUV_SET: ReadonlySet<TypefaceName> = new Set(SUV_TYPEFACES)

/**
 * Tipografía final del Reel: la que eligió el director si corresponde a su categoría; si no, la primera de su grupo
 * que no se haya usado en los Reels recientes.
 */
export function typefaceFor(isSuv: boolean, chosen: TypefaceName | undefined, recent: readonly string[] = []): TypefaceName | undefined {
  if (chosen && SUV_SET.has(chosen) === isSuv) return chosen
  if (!isSuv) return chosen ? 'clasica' : undefined
  return SUV_TYPEFACES.find((t) => !recent.includes(t)) ?? SUV_TYPEFACES[0]
}
/** Cómo entra el texto del gancho (lo elige el director según el vehículo y el tono). */
export const HOOK_STYLES = ['enfoque', 'golpe', 'revelado', 'cruce'] as const
export type HookStyle = (typeof HOOK_STYLES)[number]
/** spec_counter: número grande que cuenta, o medidor con aguja (potencia, torque, velocidad, cilindrada). */
export const COUNTER_VARIANTS = ['numero', 'medidor'] as const
/**
 * Estilos de subtítulo (tipografía + animación), todos con los colores de la marca. El director elige
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
  /** Intensidad del tramo: 1 calmado, 2 normal, 3 de impacto (golpes de cámara y movimiento más rápido). */
  energy: z.number().int().min(1).max(3).optional(),
  reason: z.string(),
})
export type Cut = z.infer<typeof cutSchema>

/** Plano del teaser de apertura: un instante muy visual de un clip que se adelanta al segundo 0. */
export const teaserBeatSchema = z.object({
  clipId: z.string(),
  atSec: z.number().min(0),
})
export type TeaserBeat = z.infer<typeof teaserBeatSchema>

/**
 * Gráfico tal como lo devuelve el director: objeto plano con campos opcionales según el tipo
 * (los esquemas de salida estructurada funcionan mejor sin uniones discriminadas).
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
  /** Para spec_counter: "medidor" dibuja una aguja que sube hasta el valor. */
  variant: z.enum(COUNTER_VARIANTS).optional(),
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

/** Tipo real del vehículo y su gama (ver pipeline/vehicle-catalog.ts). */
export const VEHICLE_TYPES = ['camioneta', 'suv', 'sedan', 'hatchback', 'deportivo', 'van'] as const
export const VEHICLE_TIERS = ['normal', 'premium', 'super_premium'] as const
/** Qué vehículo es de verdad, según lo que Claude ve en los clips, oye al asesor y sabe del modelo. */
export const vehicleIdSchema = z.object({
  marca: z.string(),
  /** Nombre comercial, sin los códigos del inventario ("Hilux SR", "Trailblazer Premier"). */
  modelo: z.string(),
  tipo: z.enum(VEHICLE_TYPES),
  gama: z.enum(VEHICLE_TIERS),
  blindado: z.boolean(),
  hibrido: z.boolean(),
  /** Si lo que se ve no cuadra con los datos del inventario, en una frase. */
  observacion: z.string().optional(),
})
export type VehicleId = z.infer<typeof vehicleIdSchema>

export const creativePlanSchema = z.object({
  /** Identificación del vehículo (planes viejos no la traen). */
  vehiculo: vehicleIdSchema.optional(),
  strategy: z.string(),
  hookIdea: z.string(),
  cuts: z.array(cutSchema).min(1),
  graphics: z.array(rawGraphicSchema),
  transcriptFixes: z.array(transcriptFixSchema),
  /** Palabras que se resaltan en los subtítulos (beneficios, cifras, marca). */
  emphasisWords: z.array(z.string()),
  /** Leyenda corta para la publicación (no se renderiza). */
  caption: z.string(),
  /** Opcional para leer planes viejos; al director se le exige (pipeline/director-plan.ts). */
  captionStyle: z.enum(CAPTION_STYLES).optional(),
  /** 2–3 planos que se ven encima de la voz del primer corte, en el arranque (vacío = sin teaser). */
  teaser: z.array(teaserBeatSchema).optional(),
  hookStyle: z.enum(HOOK_STYLES).optional(),
  typeface: z.enum(TYPEFACE_NAMES).optional(),
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
      // Encuesta (2 opciones en "items") o cápsula con ícono.
      return g.text.trim() && (g.icon || (g.items?.length ?? 0) >= 2) ? null : 'sticker necesita text e icon (o 2 opciones)'
    case 'brillo':
      return null
    default:
      return g.text.trim() ? null : `${g.type} necesita text`
  }
}
