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
import type { CaptionStyle, CreativePlan, Cut, FocusBox, GraphicType, RawGraphic, TranscriptFix } from './schema'
import { validateGraphic } from './schema'
import type {
  Brand,
  CaptionLine,
  CaptionWord,
  ClipSource,
  ReelProps,
  ReelTheme,
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
  music?: { src: string; volume: number; startSec?: number }
  watermark?: string
  /** Diseño del Reel; `offroad` para camionetas (lo decide run.ts según el tipo de vehículo). */
  theme?: ReelTheme
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
  sticker: 'pop',
}
/** Camionetas: sonidos graves y secos (golpes y barridos); nada de "pop" de caricatura. */
const SFX_OFFROAD: Record<GraphicType, SfxCue['kind']> = {
  hook_text: 'hit',
  title_3d: 'hit',
  feature_callout: 'whoosh',
  spec_counter: 'hit',
  spec_chips: 'whoosh',
  feature_list: 'whoosh',
  price_tag: 'hit',
  cta_end: 'hit',
  sticker: 'whoosh',
}

/** Palabras que solas no dicen nada: una línea que solo tiene estas no se muestra. */
const FILLER = new Set(['a', 'y', 'o', 'e', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'en', 'con', 'por', 'para', 'que', 'su', 'es', 'lo', 'al'])

const MAX_TAIL_SEC = 3.5
/** Margen antes de la primera palabra y después de la última al ajustar un corte. */
const PRE_ROLL_SEC = 0.08
const POST_ROLL_SEC = 0.18
/** Fin de frase: puntuación de AssemblyAI o una pausa así de larga entre palabras. */
const SENTENCE_END = /[.!?…]["»”']?$/
const SENTENCE_PAUSE_SEC = 0.6
/** Cuánto se puede alargar un corte para completar la frase (inicio o fin). */
const MAX_SENTENCE_EXTEND_SEC = 5

/**
 * Tiempo mínimo en pantalla por tipo (segundos): lo justo para leerlo con calma. El ritmo lo da que
 * haya más gráficos y menos espera entre ellos, no que duren poco. Las listas crecen con sus elementos.
 */
function minDurationSec(g: Pick<RawGraphic, 'type' | 'items'>): number {
  const items = g.items?.length ?? 0
  switch (g.type) {
    case 'hook_text':
      return 2.2
    case 'title_3d':
      return 2.6
    case 'feature_callout':
      return 2.4
    case 'spec_counter':
    case 'price_tag':
      return 2.6
    case 'spec_chips':
      return Math.max(2.4, 1 + items * 0.6)
    case 'feature_list':
      return Math.max(2.6, 0.8 + items * 0.9)
    case 'cta_end':
      return 3.2
    case 'sticker':
      return 1.8
  }
}
/** Respiro entre un gráfico y el siguiente. */
const GRAPHIC_GAP_SEC = 0.25
const STICKER_MAX_SEC = 2.6
/** Cuánto se puede adelantar o atrasar un sticker para encontrar un hueco sin gráficos. */
const STICKER_MAX_EARLY_SEC = 1.5
const STICKER_MAX_SHIFT_SEC = 3

/** Silencios dentro de una toma con voz más largos que esto se quitan (corte seco, "jump cut"). */
const JUMP_GAP_SEC = 0.4
/** Aire que se deja a cada lado de las palabras al quitar un silencio. */
const JUMP_KEEP_SEC = 0.07
/** Un pedazo nunca queda más corto que esto: si no, el silencio se deja (evita parpadeos). */
const MIN_PIECE_SEC = 0.6
/** Silencio máximo antes de la primera palabra y después de la última de una toma con voz. */
const MAX_EDGE_SILENCE_SEC = 1
/** Golpes de cámara: separación mínima entre dos (cuadros). */
const PUNCH_MIN_GAP_FRAMES = 12

/** Camionetas: el cierre son dos partes (caja de comentario que se escribe + firma con huella de llanta). */
const OFFROAD_CTA_SEC = 5

/** Palabras por línea según el estilo: `palabra` muestra una sola, grande. */
const CAPTION_LAYOUT: Record<CaptionStyle, { maxWords: number; maxChars: number }> = {
  impacto: { maxWords: 3, maxChars: 20 },
  velocidad: { maxWords: 3, maxChars: 18 },
  elegante: { maxWords: 3, maxChars: 22 },
  robusto: { maxWords: 2, maxChars: 16 },
  caja: { maxWords: 3, maxChars: 20 },
  palabra: { maxWords: 1, maxChars: 14 },
}

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

/**
 * Ajusta el corte para que la voz entre y salga con frases completas: si Gemini corta a mitad de una
 * frase, el corte se alarga hasta su inicio/fin (puntuación o pausa) hasta MAX_SENTENCE_EXTEND_SEC; si la
 * frase sigue más allá, retrocede al último final de frase dentro del corte. Los silencios que Gemini dejó a
 * propósito (planos sin voz al inicio o al final) se respetan.
 */
function snapCutToSentences(startSec: number, endSec: number, words: Word[], clipDur: number) {
  const sec = (ms: number) => ms / 1000
  const n = words.length
  // Una palabra cuenta como dentro del corte si al menos la mitad de ella lo está.
  const inside = (w: Word) =>
    Math.min(sec(w.end), endSec) - Math.max(sec(w.start), startSec) >= (sec(w.end) - sec(w.start)) / 2
  const first = words.findIndex(inside)
  let last = -1
  for (let i = n - 1; i >= 0; i--) {
    if (inside(words[i])) {
      last = i
      break
    }
  }
  if (first === -1 || last < first) return { s: Math.max(0, startSec), e: Math.min(clipDur, endSec) }

  const endsSentence = (i: number) =>
    i === n - 1 || SENTENCE_END.test(words[i].text) || sec(words[i + 1].start) - sec(words[i].end) >= SENTENCE_PAUSE_SEC
  const startsSentence = (i: number) => i === 0 || endsSentence(i - 1)

  let a = first
  while (a > 0 && !startsSentence(a) && startSec - sec(words[a - 1].start) <= MAX_SENTENCE_EXTEND_SEC) a--
  if (!startsSentence(a)) {
    // La frase empieza demasiado antes: arrancar en la siguiente frase dentro del corte.
    let k = first
    while (k < last && !startsSentence(k)) k++
    a = startsSentence(k) ? k : first
  }

  let b = last
  while (b < n - 1 && !endsSentence(b) && sec(words[b + 1].end) - endSec <= MAX_SENTENCE_EXTEND_SEC) b++
  if (!endsSentence(b)) {
    // La frase sigue demasiado después: terminar en el último final de frase dentro del corte.
    let k = last
    while (k > a && !endsSentence(k)) k--
    b = endsSentence(k) ? k : last
  }

  // Silencio a propósito antes de la primera palabra / después de la última: se conserva.
  let s = a === first ? Math.min(startSec, sec(words[a].start) - PRE_ROLL_SEC) : sec(words[a].start) - PRE_ROLL_SEC
  let e = b === last ? Math.max(endSec, sec(words[b].end) + POST_ROLL_SEC) : sec(words[b].end) + POST_ROLL_SEC
  // Los márgenes nunca se meten en la palabra de al lado (que es de otra frase).
  if (a > 0) s = Math.max(s, Math.min(sec(words[a].start), sec(words[a - 1].end) + 0.02))
  if (b < n - 1) e = Math.min(e, Math.max(sec(words[b].end), sec(words[b + 1].start) - 0.02))
  return { s: Math.max(0, s), e: Math.min(clipDur, e) }
}

/**
 * Parte una toma en pedazos sin los silencios largos entre palabras: la frase sigue completa, solo se
 * le quita el aire. Los planos sin voz (b-roll) quedan tal cual; los bordes mudos se acortan.
 */
function removeSilences(s: number, e: number, words: Word[]): Array<[number, number]> {
  const inside = words.filter((w) => w.end / 1000 > s + 0.05 && w.start / 1000 < e - 0.05)
  if (inside.length === 0) return [[s, e]]
  const start = Math.max(s, inside[0].start / 1000 - MAX_EDGE_SILENCE_SEC)
  const end = Math.min(e, inside[inside.length - 1].end / 1000 + MAX_EDGE_SILENCE_SEC)
  const pieces: Array<[number, number]> = []
  let pieceStart = start
  for (let i = 1; i < inside.length; i++) {
    const gapStart = inside[i - 1].end / 1000
    const gapEnd = inside[i].start / 1000
    if (gapEnd - gapStart <= JUMP_GAP_SEC) continue
    const pieceEnd = gapStart + JUMP_KEEP_SEC
    // Sin pedazos diminutos: ni el que se cierra ni lo que queda de la toma.
    if (pieceEnd - pieceStart < MIN_PIECE_SEC || end - (gapEnd - JUMP_KEEP_SEC) < MIN_PIECE_SEC) continue
    pieces.push([pieceStart, pieceEnd])
    pieceStart = gapEnd - JUMP_KEEP_SEC
  }
  pieces.push([pieceStart, end])
  return pieces
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

function groupCaptionLines(
  words: PendingWord[],
  placementFor: (fromFrame: number, toFrame: number) => CaptionLine['placement'],
  fps: number,
  layout: { maxWords: number; maxChars: number }
) {
  const lines: Array<CaptionLine & { cutEnd: number }> = []
  let cur: PendingWord[] = []
  const flush = () => {
    if (cur.length === 0) return
    const fromFrame = cur[0].fromFrame
    lines.push({
      fromFrame,
      toFrame: cur[cur.length - 1].toFrame,
      placement: 'abajo',
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
      (cur.length >= layout.maxWords || chars > layout.maxChars || gap > 0.35 || /[.,!?;:…]$/.test(prev.text) || w.fromFrame < prev.fromFrame || w.cutEnd !== prev.cutEnd)
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
    const toFrame = next ? Math.min(next.fromFrame, maxEnd) : maxEnd
    return { ...line, toFrame, placement: placementFor(line.fromFrame, toFrame) }
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
  const theme: ReelTheme = opts.theme ?? 'ksi'
  const minDur = (g: Pick<RawGraphic, 'type' | 'items'>): number =>
    theme === 'offroad' && g.type === 'cta_end' ? OFFROAD_CTA_SEC : minDurationSec(g)
  const warnings: string[] = []
  const clipById = new Map(clips.map((c) => [c.id, c]))

  const fixesByClip = new Map<string, TranscriptFix[]>()
  for (const f of plan.transcriptFixes) fixesByClip.set(f.clipId, [...(fixesByClip.get(f.clipId) ?? []), f])
  const fixedWords = new Map<string, Word[]>()
  for (const c of clips) fixedWords.set(c.id, applyTranscriptFixes(transcripts[c.id] ?? [], fixesByClip.get(c.id) ?? []))

  // 1) Cortes del plan → tomas (frases completas, sin repetir audio) → pedazos sin silencios largos.
  const takes: Array<{ clip: ClipSource; s: number; e: number; cut: Cut }> = []
  for (const cut of plan.cuts) {
    const clip = clipById.get(cut.clipId)
    if (!clip) {
      warnings.push(`Corte ignorado: clip desconocido ${cut.clipId}`)
      continue
    }
    let { s, e } = snapCutToSentences(cut.startSec, cut.endSec, fixedWords.get(clip.id) ?? [], clip.durationSec)
    // Al completar frases, dos cortes seguidos del mismo clip pueden tocarse: se unen en uno.
    const prev = takes[takes.length - 1]
    if (prev && prev.clip.id === clip.id && s <= prev.e + 0.3 && e > prev.s) {
      prev.e = Math.max(prev.e, e)
      continue
    }
    // Sin repetir audio: si ya se usó ese tramo del clip en otro corte, se empieza después.
    for (const used of takes) {
      if (used.clip.id === clip.id && s < used.e && e > used.s) s = Math.max(s, used.e)
    }
    if (e - s < 0.5) {
      warnings.push(`Corte ignorado por corto o repetido: ${cut.clipId} ${s.toFixed(2)}–${e.toFixed(2)}`)
      continue
    }
    takes.push({ clip, s, e, cut })
  }

  const cuts: TimelineCut[] = []
  let cursor = 0
  takes.forEach(({ clip, s, e, cut }, take) => {
    removeSilences(s, e, fixedWords.get(clip.id) ?? []).forEach(([ps, pe], jump) => {
      const durationInFrames = Math.round((pe - ps) * fps)
      cuts.push({
        clipId: clip.id,
        src: clip.src,
        srcWidth: clip.width,
        srcHeight: clip.height,
        fromFrame: cursor,
        durationInFrames,
        trimStartSec: ps,
        trimEndSec: pe,
        role: cut.role,
        // El Reel abre con golpe; los saltos dentro de una toma son cortes secos.
        transitionIn: cuts.length === 0 ? 'zoom' : jump > 0 ? 'corte' : cut.transitionIn,
        captionPlacement: cut.captionPlacement,
        zooms: [],
        take,
        jump,
        punches: [],
      })
      cursor += durationInFrames
    })
  })
  if (cuts.length === 0) throw new Error('El plan no dejó ningún corte utilizable')
  const cutsEnd = cursor
  const takeEnd = (take: number) =>
    Math.max(...cuts.filter((c) => c.take === take).map((c) => c.fromFrame + c.durationInFrames))

  const sourceToFrame = (clipId: string, sec: number): { frame: number; cut: TimelineCut } | null => {
    const tolerance = 0.35
    for (const c of cuts) {
      if (c.clipId !== clipId) continue
      if (sec >= c.trimStartSec - tolerance && sec <= c.trimEndSec + tolerance) {
        const clamped = Math.min(Math.max(sec, c.trimStartSec), c.trimEndSec)
        return { frame: c.fromFrame + Math.round((clamped - c.trimStartSec) * fps), cut: c }
      }
    }
    // Cayó en un silencio que se quitó: va al inicio del pedazo siguiente de la misma toma.
    const next = cuts.find(
      (c, i) => c.clipId === clipId && c.jump > 0 && cuts[i - 1]?.take === c.take && sec > cuts[i - 1].trimEndSec && sec < c.trimStartSec
    )
    return next ? { frame: next.fromFrame, cut: next } : null
  }

  // 2) Gráficos → línea de tiempo. Carril principal: nunca dos gráficos grandes a la vez.
  //    Los stickers de interacción van en su propio carril, encima.
  const placed: Array<{ g: RawGraphic; fromFrame: number; cut: TimelineCut }> = []
  plan.graphics.forEach((g) => {
    const problem = validateGraphic(g)
    if (problem) return warnings.push(`Gráfico ignorado (${problem}): "${g.text}"`)
    const at = sourceToFrame(g.clipId, g.atSec)
    if (!at) return warnings.push(`Gráfico ignorado: ${g.type} "${g.text}" cae fuera de los cortes elegidos`)
    placed.push({ g, fromFrame: at.frame, cut: at.cut })
  })
  placed.sort((a, b) => a.fromFrame - b.fromFrame)
  // Animación desde el cuadro 0: el primer gancho abre el Reel aunque Gemini lo haya puesto un poco después.
  const firstHook = placed.find((p) => p.g.type === 'hook_text')
  if (firstHook && firstHook.fromFrame < fps * 4) {
    firstHook.fromFrame = 0
    firstHook.cut = cuts[0]
    placed.sort((a, b) => a.fromFrame - b.fromFrame)
  }
  const mainLane = placed.filter((p) => p.g.type !== 'sticker')
  const stickerLane = placed.filter((p) => p.g.type === 'sticker')

  const minFrames = Math.round(fps * 0.8)
  let tailFrames = 0
  const graphics: TimelineGraphic[] = []
  let laneFree = 0
  for (const [i, { g, fromFrame: rawFrom, cut }] of mainLane.entries()) {
    let fromFrame = Math.max(rawFrom, laneFree)
    let durationInFrames = Math.round(Math.max(g.durationSec, minDur(g)) * fps)
    if (g.type === 'cta_end') {
      // El CTA siempre cierra el Reel; si hace falta, se congela el último cuadro un momento.
      tailFrames = Math.min(Math.round(MAX_TAIL_SEC * fps), Math.max(0, fromFrame + durationInFrames - cutsEnd))
    }
    const reelEnd = cutsEnd + tailFrames
    const nextStart = mainLane[i + 1]?.fromFrame
    if (nextStart !== undefined && g.type !== 'cta_end' && fromFrame + durationInFrames > nextStart) {
      // Recorta para dejar entrar al siguiente, pero sin bajar de ~85% de su tiempo mínimo
      // (si no alcanza, el siguiente se corre un poco).
      durationInFrames = Math.max(Math.round(minDur(g) * fps * 0.85), nextStart - fromFrame)
    }
    durationInFrames = Math.min(durationInFrames, reelEnd - fromFrame)
    if (durationInFrames < minFrames) {
      warnings.push(`Gráfico descartado por falta de espacio: ${g.type} "${g.text}"`)
      continue
    }
    laneFree = fromFrame + durationInFrames + Math.round(GRAPHIC_GAP_SEC * fps)

    const { focus, focusEnd, clipId: _clipId, atSec: _atSec, durationSec: _durationSec, ...rest } = g
    const tg: TimelineGraphic = { ...rest, id: `g${graphics.length + 1}-${g.type}`, fromFrame, durationInFrames }
    if (g.type === 'feature_callout') {
      // El señalador pertenece a su toma (aunque se le hayan quitado silencios): no sigue sobre la siguiente.
      const end = takeEnd(cut.take)
      if (fromFrame + durationInFrames > end) {
        durationInFrames = end - fromFrame
        if (durationInFrames < minFrames) {
          warnings.push(`Señalador descartado: "${g.text}" empieza muy al final de su toma`)
          laneFree = fromFrame
          continue
        }
        tg.durationInFrames = durationInFrames
        laneFree = fromFrame + durationInFrames + Math.round(GRAPHIC_GAP_SEC * fps)
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
        // El zoom sigue a través de los saltos de la toma (cada pedazo lo ve desde su propio inicio).
        for (const c of cuts) {
          if (c.take !== cut.take || c.fromFrame >= fromFrame + durationInFrames || c.fromFrame + c.durationInFrames <= fromFrame) continue
          c.zooms.push({ ...zoom, fromFrame: fromFrame - c.fromFrame, durationInFrames })
        }
      }
    }
    if (g.type === 'cta_end') fromFrame = Math.min(fromFrame, reelEnd - durationInFrames)
    tg.fromFrame = fromFrame
    graphics.push(tg)
  }

  // Stickers: van en los huecos entre gráficos (no los tapan). Se busca el primer hueco desde un poco
  // antes del momento que eligió Gemini, sin alejarse mucho de él.
  const reelEnd = cutsEnd + tailFrames
  let stickerFree = 0
  for (const { g, fromFrame: rawFrom } of stickerLane) {
    let fromFrame = Math.max(rawFrom - Math.round(STICKER_MAX_EARLY_SEC * fps), stickerFree, 0)
    const durationInFrames = Math.round(Math.min(STICKER_MAX_SEC, Math.max(g.durationSec, minDur(g))) * fps)
    const gap = Math.round(GRAPHIC_GAP_SEC * fps)
    for (let moved = true; moved; ) {
      moved = false
      for (const other of graphics) {
        if (fromFrame < other.fromFrame + other.durationInFrames + gap && fromFrame + durationInFrames + gap > other.fromFrame) {
          fromFrame = other.fromFrame + other.durationInFrames + gap
          moved = true
        }
      }
    }
    if (fromFrame + durationInFrames > reelEnd || fromFrame - rawFrom > STICKER_MAX_SHIFT_SEC * fps) {
      warnings.push(`Sticker descartado: no hay hueco libre cerca de su momento ("${g.text}")`)
      continue
    }
    const { focus: _f, focusEnd: _fe, clipId: _c, atSec: _a, durationSec: _d, ...rest } = g
    graphics.push({ ...rest, id: `s${graphics.length + 1}-sticker`, fromFrame, durationInFrames })
    stickerFree = fromFrame + durationInFrames + Math.round(fps * 1.5)
  }
  graphics.sort((a, b) => a.fromFrame - b.fromFrame)

  const durationInFrames = cutsEnd + tailFrames

  // 3) Subtítulos desde las palabras (corregidas) que caen dentro de cada corte.
  const captionStyle: CaptionStyle = plan.captionStyle ?? 'impacto'
  const emphasis = new Set(plan.emphasisWords.flatMap((w) => w.split(/\s+/)).map(normalizeToken).filter(Boolean))
  const blocked = graphics.filter((g) => OWNS_SCREEN.has(g.type)).map((g) => [g.fromFrame, g.fromFrame + g.durationInFrames])
  const isBlocked = (f: number) => blocked.some(([a, b]) => f >= a - 2 && f < b)
  // Palabras que ya están escritas en un gráfico en pantalla: no se repiten en el subtítulo.
  const onScreen = graphics.map((g) => ({
    from: g.fromFrame,
    to: g.fromFrame + g.durationInFrames,
    tokens: new Set(
      [g.text, g.subtext, g.badge, g.unit, ...(g.items ?? []), g.value !== undefined ? String(g.value) : '']
        .join(' ')
        .split(/\s+/)
        .map(normalizeToken)
        .filter((t) => t && !FILLER.has(t))
    ),
  }))
  const alreadyShown = (f: number, token: string) => onScreen.some((g) => f >= g.from && f < g.to && g.tokens.has(token))
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
      if (n && alreadyShown(fromFrame, n)) continue
      capWords.push({
        text: w.text,
        fromFrame,
        toFrame: Math.max(toFrame, fromFrame + 3),
        emphasis: emphasis.has(n) || /\d/.test(n),
        cutEnd: c.fromFrame + c.durationInFrames,
      })
    }
  }
  const placementFor = (from: number, to: number) => {
    const cut = cuts.find((c) => from >= c.fromFrame && from < c.fromFrame + c.durationInFrames) ?? cuts[cuts.length - 1]
    // Si la línea coincide en algún momento con un señalador, va al lado contrario de la tarjeta.
    const callout = graphics.find(
      (g) => g.type === 'feature_callout' && from < g.fromFrame + g.durationInFrames && to > g.fromFrame
    )
    if (callout) return callout.cardAtTop ? 'abajo' : 'arriba'
    return cut.captionPlacement
  }
  const layout = theme === 'offroad' ? { maxWords: 3, maxChars: 18 } : CAPTION_LAYOUT[captionStyle]
  const captions = groupCaptionLines(capWords, placementFor, fps, layout).filter((line) =>
    line.words.some((w) => !FILLER.has(normalizeToken(w.text)))
  )

  // 4) Golpes de cámara: en cada palabra clave que se ve y en la entrada de cada gráfico
  //    (salvo donde ya hay un zoom a una característica, que manda).
  const zoomedAt = (f: number) =>
    cuts.some((c) => c.zooms.some((z) => f >= c.fromFrame + z.fromFrame && f < c.fromFrame + z.fromFrame + z.durationInFrames))
  const punchFrames = [
    ...captions.flatMap((l) => l.words.filter((w) => w.emphasis).map((w) => w.fromFrame)),
    ...graphics.filter((g) => g.type !== 'feature_callout').map((g) => g.fromFrame),
  ].sort((a, b) => a - b)
  let lastPunch = -Infinity
  for (const f of theme === 'offroad' ? [] : punchFrames) {
    if (f - lastPunch < PUNCH_MIN_GAP_FRAMES || zoomedAt(f)) continue
    const c = cuts.find((x) => f >= x.fromFrame && f < x.fromFrame + x.durationInFrames)
    if (!c) continue
    c.punches.push(f - c.fromFrame)
    lastPunch = f
  }

  // 5) Efectos de sonido: entrada de cada gráfico y transiciones marcadas.
  const sfx: SfxCue[] = []
  const pushSfx = (frame: number, kind: SfxCue['kind']) => {
    if (sfx.some((s) => Math.abs(s.frame - frame) < 8)) return
    sfx.push({ frame, kind })
  }
  for (const g of graphics) pushSfx(g.fromFrame, (theme === 'offroad' ? SFX_OFFROAD : SFX_BY_TYPE)[g.type])
  // Camionetas: cortes secos, sin barrido sonoro en cada cambio de toma.
  if (theme !== 'offroad') for (const c of cuts) if (c.transitionIn === 'flash' || c.transitionIn === 'whip') pushSfx(c.fromFrame, 'whoosh')
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
      captionStyle,
      theme,
      sfx,
      brand: opts.brand,
      music: opts.music ?? null,
      watermark: opts.watermark ?? '',
      // render.ts decide el lector real (y reintenta con el otro); esto es lo que usa el Studio.
      videoEngine: 'media',
    },
    warnings,
  }
}
