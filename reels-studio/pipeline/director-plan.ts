/**
 * Base del director (Claude): el esquema del plan que se le pide, la
 * revisión de clips y tiempos, y la segunda pasada que ubica con precisión lo que se señala.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import {
  CAPTION_STYLES,
  creativePlanSchema,
  cutSchema,
  HOOK_STYLES,
  rawGraphicSchema,
  teaserBeatSchema,
  TYPEFACE_NAMES,
  type CreativePlan,
  type FocusBox,
} from '../src/plan/schema'
import type { TranscribedWord } from './assemblyai'

/** Caja en formato de detección: [ymin, xmin, ymax, xmax] en 0–1000. */
export const box2d = z.array(z.number().min(0).max(1000)).length(4)

const directorGraphicSchema = rawGraphicSchema.omit({ focus: true, focusEnd: true }).extend({
  focus_box: box2d.optional(),
  focus_box_end: box2d.optional(),
})
/** Lo que en planes viejos era opcional, al director se le exige: así siempre decide el ritmo y la apertura. */
export const directorPlanSchema = creativePlanSchema.extend({
  cuts: z.array(cutSchema.extend({ energy: z.number().int().min(1).max(3) })).min(1),
  graphics: z.array(directorGraphicSchema),
  captionStyle: z.enum(CAPTION_STYLES),
  teaser: z.array(teaserBeatSchema),
  hookStyle: z.enum(HOOK_STYLES),
  typeface: z.enum(TYPEFACE_NAMES),
})
export type DirectorPlan = z.infer<typeof directorPlanSchema>

export type DirectorClip = {
  id: string
  file: string
  durationSec: number
  width: number
  height: number
  words: TranscribedWord[]
}

export function boxToFocus(b: number[]): FocusBox {
  const [ymin, xmin, ymax, xmax] = b.map((n) => Math.min(1000, Math.max(0, n)) / 1000)
  return { x: xmin, y: ymin, w: Math.max(0.02, xmax - xmin), h: Math.max(0.02, ymax - ymin) }
}

export function toCreativePlan(p: DirectorPlan): CreativePlan {
  return {
    ...p,
    graphics: p.graphics.map(({ focus_box, focus_box_end, ...g }) => ({
      ...g,
      focus: focus_box ? boxToFocus(focus_box) : undefined,
      focusEnd: focus_box_end ? boxToFocus(focus_box_end) : undefined,
    })),
  }
}

/** Revisa lo que el esquema no puede: clips y tiempos que existan de verdad. */
export function semanticProblems(plan: DirectorPlan, clips: DirectorClip[]): string[] {
  const byId = new Map(clips.map((c) => [c.id, c]))
  const problems: string[] = []
  plan.cuts.forEach((c, i) => {
    const clip = byId.get(c.clipId)
    if (!clip) return problems.push(`cuts[${i}]: clipId "${c.clipId}" no existe`)
    if (c.endSec <= c.startSec) problems.push(`cuts[${i}]: endSec debe ser mayor que startSec`)
    if (c.endSec > clip.durationSec + 0.3) problems.push(`cuts[${i}]: endSec ${c.endSec} supera la duración de ${c.clipId} (${clip.durationSec.toFixed(2)} s)`)
  })
  plan.graphics.forEach((g, i) => {
    const inCut = plan.cuts.some((c) => c.clipId === g.clipId && g.atSec >= c.startSec - 0.3 && g.atSec <= c.endSec)
    if (!inCut) problems.push(`graphics[${i}] (${g.type}): atSec ${g.atSec} de ${g.clipId} no cae dentro de ningún corte elegido`)
  })
  if (plan.teaser.length > 3) problems.push(`teaser: usa 1–3 planos o ninguno (hay ${plan.teaser.length})`)
  plan.teaser.forEach((b, i) => {
    const clip = byId.get(b.clipId)
    if (!clip) return problems.push(`teaser[${i}]: clipId "${b.clipId}" no existe`)
    if (b.atSec > clip.durationSec - 0.65) problems.push(`teaser[${i}]: atSec ${b.atSec} está al final de ${b.clipId} (dura ${clip.durationSec.toFixed(2)} s)`)
  })
  const cta = plan.graphics.filter((g) => g.type === 'cta_end')
  if (cta.length !== 1) problems.push(`debe haber exactamente un cta_end (hay ${cta.length})`)
  else if (cta[0].clipId !== plan.cuts[plan.cuts.length - 1]?.clipId) problems.push('cta_end debe ir sobre el último corte')
  return problems
}

/** Valida la respuesta del director: esquema y luego clips/tiempos. */
export function checkPlan(json: unknown, clips: DirectorClip[]): { plan: DirectorPlan | null; problems: string[] } {
  const result = directorPlanSchema.safeParse(json)
  if (!result.success) return { plan: null, problems: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  return { plan: result.data, problems: semanticProblems(result.data, clips) }
}

export function extractFrame(file: string, sec: number): string {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reel-frame-')), 'f.jpg')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', sec.toFixed(3), '-i', file, '-frames:v', '1', '-q:v', '3', out])
  return out
}

export const detectionSchema = z.object({ found: z.boolean(), box_2d: box2d })

export function locatePrompt(what: string): string {
  return `Ubica en esta imagen: ${what}. Devuelve box_2d [ymin, xmin, ymax, xmax] normalizado 0–1000 ajustado al objeto. Si no se ve con claridad, found=false.`
}

/** Busca en un cuadro (JPEG en base64) el objeto descrito; null si no se ve. */
export type Locator = (jpegBase64: string, what: string) => Promise<FocusBox | null>

/**
 * Segunda pasada: para cada característica señalada, pide la caja exacta del objeto en el primer y
 * el último cuadro del gráfico. Si no se encuentra, el gráfico queda sin zoom.
 */
export async function refineFocusBoxesWith(params: { plan: CreativePlan; clips: DirectorClip[]; locate: Locator; tag: string }): Promise<CreativePlan> {
  const byId = new Map(params.clips.map((c) => [c.id, c]))
  const at = (file: string, sec: number, what: string) => params.locate(fs.readFileSync(extractFrame(file, sec)).toString('base64'), what)

  const graphics = await Promise.all(
    params.plan.graphics.map(async (g) => {
      if (g.type !== 'feature_callout') return g
      const clip = byId.get(g.clipId)
      if (!clip) return g
      const what = `"${g.text}"${g.subtext ? ` (${g.subtext})` : ''} del vehículo`
      const endSec = Math.min(clip.durationSec - 0.05, g.atSec + g.durationSec)
      const [start, end] = await Promise.all([at(clip.file, g.atSec, what), at(clip.file, endSec, what)])
      if (!start) {
        console.warn(`[${params.tag}] no se ve con claridad "${g.text}" en ${g.clipId}@${g.atSec}s: va sin zoom`)
        return { ...g, focus: undefined, focusEnd: undefined }
      }
      const moved = end && (Math.abs(end.x - start.x) > 0.03 || Math.abs(end.y - start.y) > 0.03)
      return { ...g, focus: start, focusEnd: moved ? end : undefined }
    })
  )
  return { ...params.plan, graphics }
}
