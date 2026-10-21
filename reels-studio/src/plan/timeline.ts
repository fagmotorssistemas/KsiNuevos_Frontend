/**
 * Convierte el Plan Creativo de Gemini (tiempos de fuente por clip) en la línea de tiempo
 * que dibuja Remotion (cuadros del Reel final), y arma los subtítulos a partir de las
 * palabras de AssemblyAI.
 *
 * Aquí viven las reglas que NO se le dejan a Gemini: ajustar cortes a límites de palabra,
 * evitar que dos gráficos grandes se pisen, ocultar subtítulos cuando un gráfico ya dice
 * lo mismo, y calcular dónde queda en pantalla lo que Gemini señaló en el cuadro.
 */
import { chooseZoomTarget } from '../reel/zoom'
import type { CreativePlan, FocusBox, GraphicType, RawGraphic, TranscriptFix } from './schema'
import { validateGraphic } from './schema'
import type {
  Brand,
  CaptionLine,
  CaptionWord,
  ClipSource,
  ReelProps,
  ScreenFocus,
  SfxCue,
  TimelineCut,
  TimelineGraphic,
  Word,
} from './types'

export type BuildOptions = {
  fps?: number
  width?: number
  height?: number
  brand: Brand
  music?: { src: string; volume: number }
  watermark?: string
}

export type BuildResult = { props: ReelProps; warnings: string[] }

/** Gráficos que ya muestran en grande lo que se dice: mientras están, no hay subtítulos. */
const OWNS_SCREEN: ReadonlySet<GraphicType> = new Set(['hook_text', 'title_3d', 'spec_counter', 'feature_list', 'cta_end'])

const SFX_BY_TYPE: Record<GraphicType, SfxCue['kind']> = {
  hook_text: 'hit',
  title_3d: 'hit',
  feature_callout: 'whoosh',
  spec_counter: 'riser',
  spec_chips: 'pop',
  feature_list: 'pop',
  price_tag: 'hit',
  cta_end: 'hit',
}

const MAX_TAIL_SEC = 2.5
/** Margen antes de la primera palabra y después de la última al ajustar un corte. */
const PRE_ROLL_SEC = 0.08
const POST_ROLL_SEC = 0.18

export function normalizeToken(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, '')
}

/** Aplica las correcciones de Gemini sobre las palabras de un clip, conservando los tiempos. */
export function applyTranscriptFixes(words: Word[], fixes: TranscriptFix[]): Word[] {
  let out = [...words]
  for (const fix of fixes) {
    const pattern = fix.wrong.split(/\s+/).map(normalizeToken).filter(Boolean)
    const replacement = fix.right.split(/\s+/).filter(Boolean)
    if (pattern.length === 0 || replacement.length === 0) continue
    const next: Word[] = []
    for (let i = 0; i < out.length; ) {
      const window = out.slice(i, i + pattern.length)
      const matches =
        window.length === pattern.length && window.every((w, k) => normalizeToken(w.text) === pattern[k])
      if (!matches) {
        next.push(out[i])
        i++
        continue
      }
      const start = window[0].start
      const end = window[window.length - 1].end
      // Conserva la puntuación final del último token original ("diez," → "diésel,").
      const trailing = window[window.length - 1].text.match(/[.,!?;:…]+$/)?.[0] ?? ''
      const weights = replacement.map((r) => r.length + 1)
      const total = weights.reduce((a, b) => a + b, 0)
      let acc = 0
      replacement.forEach((text, k) => {
        const s = start + ((end - start) * acc) / total
        acc += weights[k]
        const e = start + ((end - start) * acc) / total
        const isLast = k === replacement.length - 1
        next.push({ text: isLast && !/[.,!?;:…]$/.test(text) ? text + trailing : text, start: Math.round(s), end: Math.round(e) })
      })
      i += pattern.length
    }
    out = next
  }
  return out
}

/** Ajusta inicio/fin del corte para no cortar palabras a la mitad. */
function snapCutToWords(startSec: number, endSec: number, words: Word[], clipDur: number) {
  let s = startSec
  let e = Math.min(endSec, clipDur)
  for (const w of words) {
    const ws = w.start / 1000
    const we = w.end / 1000
    // Palabra partida al inicio: empezar antes de ella (si casi toda queda dentro) o después.
    if (ws < s && we > s) s = we - s > (we - ws) / 2 ? ws - PRE_ROLL_SEC : we
    // Palabra partida al final: incluirla completa si la mayor parte queda dentro.
    if (ws < e && we > e) e = e - ws > (we - ws) / 2 ? we + POST_ROLL_SEC : ws
  }
  s = Math.max(0, s)
  e = Math.min(clipDur, e)
  return { s, e }
}

/** Caja normalizada del cuadro fuente → píxeles en el lienzo (video en modo "cover"). */
export function focusToScreen(box: FocusBox, srcW: number, srcH: number, outW: number, outH: number): ScreenFocus {
  const scale = Math.max(outW / srcW, outH / srcH)
  const dispW = srcW * scale
  const dispH = srcH * scale
  const offX = (outW - dispW) / 2
  const offY = (outH - dispH) / 2
  const cx = offX + (box.x + box.w / 2) * dispW
  const cy = offY + (box.y + box.h / 2) * dispH
  return {
    cx: Math.min(outW * 0.92, Math.max(outW * 0.08, cx)),
    cy: Math.min(outH * 0.92, Math.max(outH * 0.08, cy)),
    w: box.w * dispW,
    h: box.h * dispH,
  }
}

/** Palabra con el último cuadro de su toma: una línea nunca cruza a la toma siguiente. */
type PendingWord = CaptionWord & { cutEnd: number }

function groupCaptionLines(words: PendingWord[], placementAt: (frame: number) => CaptionLine['placement'], fps: number) {
  const lines: Array<CaptionLine & { cutEnd: number }> = []
  let cur: PendingWord[] = []
  const flush = () => {
    if (cur.length === 0) return
    const fromFrame = cur[0].fromFrame
    lines.push({
      fromFrame,
      toFrame: cur[cur.length - 1].toFrame,
      placement: placementAt(fromFrame),
      words: cur.map(({ cutEnd: _cutEnd, ...w }) => w),
      cutEnd: cur[0].cutEnd,
    })
    cur = []
  }
  for (const w of words) {
    const prev = cur[cur.length - 1]
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length
    const gap = prev ? (w.fromFrame - prev.toFrame) / fps : 0
    if (
      prev &&
      (cur.length >= 3 || chars > 20 || gap > 0.35 || /[.,!?;:…]$/.test(prev.text) || w.fromFrame < prev.fromFrame || w.cutEnd !== prev.cutEnd)
    ) {
      flush()
    }
    cur.push(w)
  }
  flush()
  // Que cada línea dure hasta que empiece la siguiente (sin parpadeos), con tope y sin salir de su toma.
  return lines.map(({ cutEnd, ...line }, i) => {
    const next = lines[i + 1]
    const maxEnd = Math.min(cutEnd, line.toFrame + Math.round(fps * 0.4))
    return { ...line, toFrame: next ? Math.min(next.fromFrame, maxEnd) : maxEnd }
  })
}

export function buildReelProps(
  plan: CreativePlan,
  clips: ClipSource[],
  transcripts: Record<string, Word[]>,
  opts: BuildOptions
): BuildResult {
  const fps = opts.fps ?? 30
  const width = opts.width ?? 1080
  const height = opts.height ?? 1920
  const warnings: string[] = []
  const clipById = new Map(clips.map((c) => [c.id, c]))

  const fixesByClip = new Map<string, TranscriptFix[]>()
  for (const f of plan.transcriptFixes) fixesByClip.set(f.clipId, [...(fixesByClip.get(f.clipId) ?? []), f])
  const fixedWords = new Map<string, Word[]>()
  for (const c of clips) fixedWords.set(c.id, applyTranscriptFixes(transcripts[c.id] ?? [], fixesByClip.get(c.id) ?? []))

  // 1) Cortes → línea de tiempo.
  const cuts: TimelineCut[] = []
  let cursor = 0
  for (const cut of plan.cuts) {
    const clip = clipById.get(cut.clipId)
    if (!clip) {
      warnings.push(`Corte ignorado: clip desconocido ${cut.clipId}`)
      continue
    }
    const { s, e } = snapCutToWords(cut.startSec, cut.endSec, fixedWords.get(clip.id) ?? [], clip.durationSec)
    const durationInFrames = Math.round((e - s) * fps)
    if (durationInFrames < Math.round(fps * 0.5)) {
      warnings.push(`Corte ignorado por corto (<0.5s): ${cut.clipId} ${s.toFixed(2)}–${e.toFixed(2)}`)
      continue
    }
    cuts.push({
      clipId: clip.id,
      src: clip.src,
      srcWidth: clip.width,
      srcHeight: clip.height,
      fromFrame: cursor,
      durationInFrames,
      trimStartSec: s,
      trimEndSec: e,
      role: cut.role,
      transitionIn: cuts.length === 0 ? 'zoom' : cut.transitionIn,
      captionPlacement: cut.captionPlacement,
      zooms: [],
    })
    cursor += durationInFrames
  }
  if (cuts.length === 0) throw new Error('El plan no dejó ningún corte utilizable')
  const cutsEnd = cursor

  const sourceToFrame = (clipId: string, sec: number): { frame: number; cut: TimelineCut } | null => {
    const tolerance = 0.35
    for (const c of cuts) {
      if (c.clipId !== clipId) continue
      if (sec >= c.trimStartSec - tolerance && sec <= c.trimEndSec + tolerance) {
        const clamped = Math.min(Math.max(sec, c.trimStartSec), c.trimEndSec)
        return { frame: c.fromFrame + Math.round((clamped - c.trimStartSec) * fps), cut: c }
      }
    }
    return null
  }

  // 2) Gráficos → línea de tiempo, en un solo carril (nunca dos gráficos grandes a la vez).
  const placed: Array<{ g: RawGraphic; fromFrame: number; cut: TimelineCut }> = []
  plan.graphics.forEach((g) => {
    const problem = validateGraphic(g)
    if (problem) return warnings.push(`Gráfico ignorado (${problem}): "${g.text}"`)
    const at = sourceToFrame(g.clipId, g.atSec)
    if (!at) return warnings.push(`Gráfico ignorado: ${g.type} "${g.text}" cae fuera de los cortes elegidos`)
    placed.push({ g, fromFrame: at.frame, cut: at.cut })
  })
  placed.sort((a, b) => a.fromFrame - b.fromFrame)

  const minFrames = Math.round(fps * 0.8)
  let tailFrames = 0
  const graphics: TimelineGraphic[] = []
  let laneFree = 0
  for (const [i, { g, fromFrame: rawFrom, cut }] of placed.entries()) {
    let fromFrame = Math.max(rawFrom, laneFree)
    let durationInFrames = Math.round(g.durationSec * fps)
    if (g.type === 'cta_end') {
      // El CTA siempre cierra el Reel; si hace falta, se congela el último cuadro un momento.
      tailFrames = Math.min(Math.round(MAX_TAIL_SEC * fps), Math.max(0, fromFrame + durationInFrames - cutsEnd))
    }
    const reelEnd = cutsEnd + tailFrames
    const nextStart = placed[i + 1]?.fromFrame
    if (nextStart !== undefined && g.type !== 'cta_end' && fromFrame + durationInFrames > nextStart) {
      // Recorta para dejar entrar al siguiente, pero sin bajar del mínimo legible.
      durationInFrames = Math.max(minFrames, nextStart - fromFrame)
    }
    durationInFrames = Math.min(durationInFrames, reelEnd - fromFrame)
    if (durationInFrames < minFrames) {
      warnings.push(`Gráfico descartado por falta de espacio: ${g.type} "${g.text}"`)
      continue
    }
    laneFree = fromFrame + durationInFrames + 2

    const { focus, focusEnd, clipId: _clipId, atSec: _atSec, durationSec: _durationSec, ...rest } = g
    const tg: TimelineGraphic = { ...rest, id: `g${graphics.length + 1}-${g.type}`, fromFrame, durationInFrames }
    if (g.type === 'feature_callout') {
      // El señalador pertenece a su toma: no sigue sobre el clip siguiente.
      const cutEnd = cut.fromFrame + cut.durationInFrames
      if (fromFrame + durationInFrames > cutEnd) {
        durationInFrames = cutEnd - fromFrame
        if (durationInFrames < minFrames) {
          warnings.push(`Señalador descartado: "${g.text}" empieza muy al final de su toma`)
          laneFree = fromFrame
          continue
        }
        tg.durationInFrames = durationInFrames
        laneFree = fromFrame + durationInFrames + 2
      }
      const screenFocus = focus ? focusToScreen(focus, cut.srcWidth, cut.srcHeight, width, height) : undefined
      tg.cardAtTop = g.placement ? g.placement === 'arriba' : screenFocus ? screenFocus.cy > height * 0.5 : true
      if (screenFocus && focus) {
        const screenFocusEnd = focusEnd ? focusToScreen(focusEnd, cut.srcWidth, cut.srcHeight, width, height) : undefined
        const scale = Math.min(2.2, Math.max(1.3, 0.5 / Math.max(focus.w, focus.h)))
        const target = chooseZoomTarget(screenFocus, screenFocusEnd, scale, tg.cardAtTop, width, height)
        const zoom = { focus: screenFocus, focusEnd: screenFocusEnd, scale, target }
        tg.zoom = zoom
        tg.sourceFocus = focus
        cut.zooms.push({ ...zoom, fromFrame: fromFrame - cut.fromFrame, durationInFrames })
      }
    }
    if (g.type === 'cta_end') fromFrame = Math.min(fromFrame, reelEnd - durationInFrames)
    tg.fromFrame = fromFrame
    graphics.push(tg)
  }

  const durationInFrames = cutsEnd + tailFrames

  // 3) Subtítulos desde las palabras (corregidas) que caen dentro de cada corte.
  const emphasis = new Set(plan.emphasisWords.flatMap((w) => w.split(/\s+/)).map(normalizeToken).filter(Boolean))
  const blocked = graphics.filter((g) => OWNS_SCREEN.has(g.type)).map((g) => [g.fromFrame, g.fromFrame + g.durationInFrames])
  const isBlocked = (f: number) => blocked.some(([a, b]) => f >= a - 2 && f < b)
  const capWords: PendingWord[] = []
  for (const c of cuts) {
    for (const w of fixedWords.get(c.clipId) ?? []) {
      const ws = w.start / 1000
      const we = w.end / 1000
      if (we <= c.trimStartSec + 0.05 || ws >= c.trimEndSec - 0.05) continue
      const fromFrame = c.fromFrame + Math.max(0, Math.round((ws - c.trimStartSec) * fps))
      const toFrame = Math.min(c.fromFrame + c.durationInFrames, c.fromFrame + Math.round((we - c.trimStartSec) * fps))
      if (isBlocked(fromFrame)) continue
      const n = normalizeToken(w.text)
      capWords.push({
        text: w.text,
        fromFrame,
        toFrame: Math.max(toFrame, fromFrame + 3),
        emphasis: emphasis.has(n) || /\d/.test(n),
        cutEnd: c.fromFrame + c.durationInFrames,
      })
    }
  }
  const placementAt = (frame: number) => {
    const cut = cuts.find((c) => frame >= c.fromFrame && frame < c.fromFrame + c.durationInFrames) ?? cuts[cuts.length - 1]
    // Si hay un señalador abajo, los subtítulos suben (y viceversa).
    const callout = graphics.find(
      (g) => g.type === 'feature_callout' && frame >= g.fromFrame && frame < g.fromFrame + g.durationInFrames
    )
    // Durante un señalador, los subtítulos van al lado contrario de la tarjeta.
    if (callout) return callout.cardAtTop ? 'abajo' : 'arriba'
    return cut.captionPlacement
  }
  const captions = groupCaptionLines(capWords, placementAt, fps)

  // 4) Efectos de sonido: entrada de cada gráfico y transiciones marcadas.
  const sfx: SfxCue[] = []
  const pushSfx = (frame: number, kind: SfxCue['kind']) => {
    if (sfx.some((s) => Math.abs(s.frame - frame) < 8)) return
    sfx.push({ frame, kind })
  }
  for (const g of graphics) pushSfx(g.fromFrame, SFX_BY_TYPE[g.type])
  for (const c of cuts) if (c.transitionIn === 'flash' || c.transitionIn === 'whip') pushSfx(c.fromFrame, 'whoosh')
  sfx.sort((a, b) => a.frame - b.frame)

  return {
    props: {
      fps,
      width,
      height,
      durationInFrames,
      cuts,
      tailFrames,
      graphics,
      captions,
      sfx,
      brand: opts.brand,
      music: opts.music,
      watermark: opts.watermark,
    },
    warnings,
  }
}
