/**
 * Editor de Reels — Claude elige y ordena los cortes del mapa de segmentos (claude-editor.ts)
 * y aquí se validan con las reglas editoriales de la casa.
 *
 * Con cuadros (segment-frames.ts) Claude ve cada toma; sin ffmpeg trabaja solo con texto.
 * El nombre del archivo y de `gemini_analysis` se conservan por los datos ya guardados.
 */

import type { Segment, SequenceItem, SequenceVisualOverlay } from './segmenter'
import type { VideoClipKind, CanonicalVehicleMeta } from './clip-config'
import { defaultClipKinds } from './clip-config'
import { requestReelEditPlan, type AiHighlightPhrase, type ReelEditorUsage } from './claude-editor'
import type { SegmentFrame } from './segment-frames'
import type { VisualPlan } from './visual-plan'
import { MOTION_PLAN_PROMPT_BLOCK, type MotionPlan } from '@/lib/reels-motion/motion-plan'

// ─── Tipos de respuesta ──────────────────────────────────────────────────────

export interface GeminiSegmentAnalysis {
  sequence: SequenceItem[]
  total_duration: number
  overall_strategy: string
  /**
   * Solo modo VO manual: cuántos ítems de `sequence` van antes del bloque VO + planos encima.
   * El valor se acota en servidor: con ≥2 segmentos suele quedar en [1, n−1] (ni abre ni cierra el Reel).
   */
  voice_over_insert_after_count?: number
  /** Frases del diálogo a destacar en subtítulos (misma llamada a Claude; el re-render las reutiliza). */
  caption_highlights?: AiHighlightPhrase[]
  /** Estilo visual del Reel (gancho, tarjetas, transiciones…) que dibuja shotstack.ts. */
  visual_plan?: VisualPlan
  /** Plan de gráficos de un Reel Motion 3D (lo dibuja reels-motion/composer.ts). */
  motion_plan?: MotionPlan
  /** Tokens y costo aproximado de la llamada a Claude. */
  editor_usage?: ReelEditorUsage
}

function inferClipCountFromSegments(allSegments: Segment[]): number {
  if (!allSegments.length) return 0
  return Math.max(...allSegments.map((s) => s.clip_index)) + 1
}

function clipKindsResolved(clipKinds: VideoClipKind[], clipCount: number): VideoClipKind[] {
  if (clipCount <= 0) return []
  if (!clipKinds.length || clipKinds.length !== clipCount) return defaultClipKinds(clipCount)
  return clipKinds
}

const MAX_CORRIDO_CHARS_PER_CLIP = 4000
const MAX_SEGMENT_LINES_PER_CLIP = 48

/**
 * Catálogo para modo voz en off manual: clips con habla para la narrativa (el bloque VO no está en el mapa).
 */
function buildClipCatalogForManualVoiceOver(
  allSegments: Segment[],
  kinds: VideoClipKind[],
  voiceOverBaseClipIndex: number
): string {
  const clipCount = inferClipCountFromSegments(allSegments)
  if (clipCount <= 0) return ''

  const lines: string[] = []
  lines.push(
    '=== CATÁLOGO (MODO VO MANUAL) ===\n' +
      'Orden de archivos: clip 0 = primer video subido, clip 1 = segundo, etc.'
  )
  lines.push(
    `El clip índice ${voiceOverBaseClipIndex} es la VO reservada: su audio completo va una sola vez en el Reel, con planos B-roll automáticos (sin habla) encima y negro donde falte material. ` +
      'Ese clip y esos B-roll NO están en el mapa de segmentos: NO debes referenciarlos.'
  )
  lines.push(
    'Tu trabajo: ordenar solo los segmentos del mapa (otros clips con habla) y decidir con voice_over_insert_after_count dónde insertar el bloque VO en la línea de tiempo. ' +
      'NUNCA incluyas la clave visual_overlay en el JSON.'
  )

  for (let c = 0; c < clipCount; c++) {
    if (c === voiceOverBaseClipIndex) continue
    const kind = kinds[c] ?? 'spoken'
    if (kind === 'visual_only') continue

    const segs = allSegments.filter((s) => s.clip_index === c && s.source_kind !== 'visual_only')
    const segsShown = segs.slice(0, MAX_SEGMENT_LINES_PER_CLIP)
    const omitted = segs.length - segsShown.length
    const byLine = segsShown
      .map((s) => `  [${s.start_s.toFixed(2)}–${s.end_s.toFixed(2)}s] ${s.text}`)
      .join('\n')
    const byLineBlock =
      byLine +
      (omitted > 0
        ? `\n  … (${omitted} fragmentos más en el mismo clip: ver MAPA DE SEGMENTOS más abajo)`
        : '')
    const corrido = segs.map((s) => s.text).join(' ')
    const corridoOut =
      corrido.length > MAX_CORRIDO_CHARS_PER_CLIP
        ? `${corrido.slice(0, MAX_CORRIDO_CHARS_PER_CLIP)}…`
        : corrido

    lines.push(
      `\n--- Clip ${c} — CON HABLA (cortes narrativos del Reel) ---\n` +
        'Fragmentos detectados (los segment_id y tiempos del mapa deben respetarse al milímetro):\n' +
        (byLineBlock || '  (sin fragmentos)') +
        '\nTexto corrido del clip (referencia rápida):\n' +
        (corridoOut.trim() ? `  ${corridoOut}` : '  (vacío)')
    )
  }

  lines.push('\n=== FIN CATÁLOGO ===')
  return lines.join('\n')
}

/**
 * Catálogo legible por clip: transcripción completa de los que tienen habla + fichas de B-roll.
 * Claude usa esto junto con los videos para decidir montaje, orden y visual_overlay sin intervención manual.
 */
function buildClipCatalogForPrompt(
  allSegments: Segment[],
  kinds: VideoClipKind[],
  manualVoiceOverBaseClipIndex?: number | null,
  manualVoiceOverFromExternalAudio?: boolean
): string {
  if (manualVoiceOverBaseClipIndex != null && Number.isInteger(manualVoiceOverBaseClipIndex)) {
    return buildClipCatalogForManualVoiceOver(allSegments, kinds, manualVoiceOverBaseClipIndex)
  }

  const clipCount = inferClipCountFromSegments(allSegments)
  if (clipCount <= 0) return ''

  const lines: string[] = []
  if (manualVoiceOverFromExternalAudio === true) {
    lines.push(
      'NOTA: La voz en off principal llega desde un archivo de audio (MP3) subido aparte; durante ese bloque el montaje usa solo vídeo de clips (sin su audio) encima. Los segment_id de clips reservados solo para ese bloque NO aparecen en el mapa siguiente.'
    )
  }
  lines.push(
    '=== CATÁLOGO DE MATERIAL (orden = índice de archivo: clip 0 = primer video subido, clip 1 = segundo, etc.) ==='
  )
  lines.push(
    'El usuario solo subió archivos; TÚ eres el editor: eliges qué segmentos van al Reel, en qué orden, y cuándo ' +
      'superponer planos (visual_overlay) cuando el audio sea voz en off o la imagen del clip de habla no aporte.'
  )
  lines.push(
    'Los roles CON HABLA vs SOLO PLANO los infirió el sistema: AssemblyAI sin palabras o con error en un archivo ⇒ ese clip se trata como B-roll; el resto como con habla.'
  )

  for (let c = 0; c < clipCount; c++) {
    const kind = kinds[c] ?? 'spoken'
    if (kind === 'visual_only') {
      const seg = allSegments.find((s) => s.clip_index === c && s.source_kind === 'visual_only')
      const dur = seg != null ? `${seg.duration_s.toFixed(2)}s` : 'duración desconocida'
      lines.push(
        `\n--- Clip ${c} — SOLO PLANO / B-roll (${dur} de material) ---\n` +
          'No hay diálogo transcrito. Observa el video: qué muestra (motor, interior, tablero, exterior, etc.). ' +
          'Úsalo como visual_overlay en los segmentos de OTRO clip cuyo AUDIO hable de eso o cuando quieras ilustrar lo narrado. ' +
          'Elige trim_start y trim_end dentro de 0 y la duración total de este clip.'
      )
      continue
    }

    const segs = allSegments.filter((s) => s.clip_index === c && s.source_kind !== 'visual_only')
    const segsShown = segs.slice(0, MAX_SEGMENT_LINES_PER_CLIP)
    const omitted = segs.length - segsShown.length
    const byLine = segsShown
      .map((s) => `  [${s.start_s.toFixed(2)}–${s.end_s.toFixed(2)}s] ${s.text}`)
      .join('\n')
    const byLineBlock =
      byLine +
      (omitted > 0
        ? `\n  … (${omitted} fragmentos más en el mismo clip: ver MAPA DE SEGMENTOS más abajo)`
        : '')
    const corrido = segs.map((s) => s.text).join(' ')
    const corridoOut =
      corrido.length > MAX_CORRIDO_CHARS_PER_CLIP
        ? `${corrido.slice(0, MAX_CORRIDO_CHARS_PER_CLIP)}…`
        : corrido

    lines.push(
      `\n--- Clip ${c} — CON HABLA (puede ser voz en off con cámara tapada, o presentador a cámara) ---\n` +
        'Fragmentos detectados (los segment_id y tiempos del mapa deben respetarse al milímetro):\n' +
        (byLineBlock || '  (sin fragmentos)') +
        '\nTexto corrido del clip (referencia rápida):\n' +
        (corridoOut.trim() ? `  ${corridoOut}` : '  (vacío)')
    )
  }

  lines.push('\n=== FIN CATÁLOGO ===')
  return lines.join('\n')
}

function coerceSequenceItem(item: SequenceItem): SequenceItem {
  const row = item as unknown as Record<string, unknown>
  const o = row.visual_overlay ?? row.visualOverlay
  if (!o || typeof o !== 'object') return { ...item, visual_overlay: undefined }
  const ox = o as Record<string, unknown>
  const clip_index = Number(ox.clip_index ?? ox.clipIndex)
  const trim_start = Number(ox.trim_start ?? ox.trimStart)
  const trim_end = Number(ox.trim_end ?? ox.trimEnd)
  if (![clip_index, trim_start, trim_end].every((n) => Number.isFinite(n))) {
    return { ...item, visual_overlay: undefined }
  }
  return {
    ...item,
    visual_overlay: { clip_index, trim_start, trim_end },
  }
}

function maxEndSByClipIndex(allSegments: Segment[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const s of allSegments) {
    m.set(s.clip_index, Math.max(m.get(s.clip_index) ?? 0, s.end_s))
  }
  return m
}

function normalizeVisualOverlaysInSequence(
  sequence: SequenceItem[],
  kinds: VideoClipKind[],
  allSegments: Segment[],
  jobId: string
): SequenceItem[] {
  const maxEnd = maxEndSByClipIndex(allSegments)

  return sequence.map((item) => {
    const ov = item.visual_overlay
    if (!ov || kinds.length === 0) return { ...item, visual_overlay: undefined }

    const vIdx = ov.clip_index
    if (!Number.isInteger(vIdx) || vIdx < 0 || vIdx >= kinds.length || kinds[vIdx] !== 'visual_only') {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Editor] visual_overlay inválido (clip_index no es B-roll), se ignora.`
      )
      return { ...item, visual_overlay: undefined }
    }

    const seg = allSegments.find((s) => s.segment_id === item.segment_id)
    if (!seg || seg.source_kind === 'visual_only') {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Editor] visual_overlay requiere un segment_id de clip con habla; se ignora.`
      )
      return { ...item, visual_overlay: undefined }
    }

    if (item.clip_index === vIdx) {
      return { ...item, visual_overlay: undefined }
    }

    const maxS = maxEnd.get(vIdx) ?? ov.trim_end
    const target = item.trim_duration
    let ovs = Math.max(0, Math.min(ov.trim_start, maxS - 0.05))
    let ove = Math.max(ovs + 0.1, Math.min(ov.trim_end, maxS))
    let od = ove - ovs

    if (od < target) {
      ove = Math.min(maxS, ovs + target)
      ovs = Math.max(0, ove - target)
    } else if (od > target) {
      ove = ovs + target
    }

    od = ove - ovs
    if (od < Math.max(0.8, target) - 0.15) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Editor] B-roll clip ${vIdx} no cubre ${target.toFixed(2)}s; se quita overlay.`
      )
      return { ...item, visual_overlay: undefined }
    }

    const normalized: SequenceVisualOverlay = {
      clip_index: vIdx,
      trim_start: Number(ovs.toFixed(3)),
      trim_end: Number(ove.toFixed(3)),
    }
    return { ...item, visual_overlay: normalized }
  })
}

// ─── Validación de secuencia ─────────────────────────────────────────────────

const CAR_BRANDS = [
  'acura', 'alfa romeo', 'audi', 'bmw', 'bentley', 'buick', 'cadillac', 'chevrolet', 'chevy', 'chery',
  'chrysler', 'citroen', 'citroën', 'cupra', 'dodge', 'dongfeng', 'fiat', 'ford', 'genesis', 'gmc', 'great wall',
  'haval', 'honda', 'hyundai', 'infiniti', 'isuzu', 'jaguar', 'jeep', 'kia', 'lancia', 'land rover',
  'lexus', 'lincoln', 'maserati', 'mazda', 'mercedes', 'mercedes-benz', 'mercedes benz', 'mini',
  'mitsubishi', 'nissan', 'peugeot', 'polestar', 'porsche', 'ram', 'renault', 'seat', 'skoda', 'smart',
  'subaru', 'suzuki', 'tesla', 'toyota', 'volkswagen', 'volvo', 'vw', 'mg', 'byd', 'geely', 'jac',
  'figmotors', 'ksi',
]

/** Modelos / series frecuentes en inventario (ayuda a no clasificar "solo año" como presentación). */
const MODEL_LINE_REGEX =
  /\b(f[- ]?150|f[- ]?250|f[- ]?350|f[- ]?450|silverado|sierra|tahoe|yukon|explorer|escape|eco[\s-]*sport|ecosport|edge|kuga|puma|territory|maverick|bronco\s*sport|ranger|raptor|mustang|bronco|corvette|camaro|equinox|traverse|suburban|colorado|frontier|versa|sentra|altima|rogue|murano|armada|titan|pathfinder|hilux|rav4|highlander|sequoia|tundra|camry|corolla|prius|yaris|civic|accord|pilot|cr-v|hr-v|passat|jetta|tiguan|amarok|golf|polo|arteon|rdx|mdx|tlx|cx[- ]?5|cx[- ]?9|cx[- ]?30|mazda\s*3|mazda\s*6|outlander|eclipse|be\s?go|sportage|tucson|sorento|telluride|palisade|elantra|accent|creta|venue|wrangler|grand cherokee|gladiator|compass|renegade|defender|discovery|evoque|h1|h2|haval\s*h[- ]?6|dongfeng|rich[- ]?6|transit|promaster|sprinter|land\s*cruiser|landcruiser|lc\s*200|lc\s*150)\b/i

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isMistakeSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  return /me equivoque|equivoc|otra vez|de nuevo/.test(t)
}

/** Micro-clip que solo dice el año (p. ej. "2016" en un vídeo aparte de marca/modelo). */
function isStandaloneYearPresentationToken(seg: Segment): boolean {
  if (seg.word_count > 2) return false
  if (seg.duration_s > 3.5) return false
  const t = normalizeText(seg.text).trim().replace(/\s+/g, ' ')
  return /^(19|20)\d{2}$/.test(t)
}

function isPresentationSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  if (/\bcomenta\b/.test(t)) return false
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasModelLikeToken =
    MODEL_LINE_REGEX.test(t) ||
    /\b[hx]?\d{1,3}\b/.test(t) ||
    /\b(prado|picanto|hilux|rio|elantra|accent|tiida|sentra|versa|march|sunny|altima|be\s?go|sportage|tucson|creta|ecosport|edge|kuga|puma|territory)\b/.test(
      t
    )
  if (hasYear && !hasBrand && !hasModelLikeToken) {
    if (isStandaloneYearPresentationToken(seg)) return true
    return false
  }
  return hasBrand || hasYear || hasModelLikeToken
}

/** Primer corte del Reel: debe sonar marca + contexto (modelo o año), no solo "2012" ni solo "F-150" sin marca. */
function openingPresentationIsAdequate(seg: Segment | undefined): boolean {
  if (!seg) return false
  const t = normalizeText(seg.text)
  if (/\bcomenta\b/.test(t)) return false
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasModel =
    MODEL_LINE_REGEX.test(seg.text) ||
    /\b[hx]?\d{1,3}\b/.test(t) ||
    /\b(prado|picanto|hilux|rio|elantra|accent|tiida|sentra|versa|march|sunny|altima|be\s?go|sportage|tucson|creta|ecosport|edge|kuga|puma|territory)\b/.test(
      t
    )
  if (!hasBrand) return false
  return hasYear || hasModel || seg.word_count >= 5
}

function sequenceItemFromSegment(seg: Segment, order: number, reason: string): SequenceItem {
  return {
    segment_id: seg.segment_id,
    clip_index: seg.clip_index,
    trim_start: seg.start_s,
    trim_end: seg.end_s,
    trim_duration: seg.duration_s,
    order,
    reason,
  }
}

function isEndCtaSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  if (/solo aqui|ksi nuevos|casi nuevos/.test(t)) return true
  if (/te pasamos|te enviamos|te mandamos/.test(t)) return true
  if (/\bcomenta\b/.test(t)) return true
  return false
}

/** "comenta …" en redes: siempre CTA de cierre (orden dentro del outro vs info/marca). */
function isCtaCallToActionTrigger(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  return /\bcomenta\b/.test(t)
}

/** CTA de continuidad informativa ("te pasamos info", WhatsApp, DM): suele ir después del "comenta ...". */
function isCtaInfoContinuationSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  return /\b(te pasamos|te enviamos|te mandamos)\b/.test(t) || /\b(informacion|información|whatsapp|dm)\b/.test(t)
}

function introOpeningStrength(seg: Segment | undefined): number {
  if (!seg) return 0
  return openingPresentationIsAdequate(seg) ? 2 : isPresentationSegment(seg) ? 1 : 0
}

/** Tono “gancho” lifestyle / identidad (misma heurística que antes favorecía después del dato; ahora se usa en capas). */
function hasEmotionalOrLifestyleHookTone(t: string): boolean {
  return (
    /\b(identidad|estilo de vida|lifestyle|quien eres|quien eres|reflej|personalidad|conecta|eres tu|tu vida|alma|deseo|elegancia|pasión|pasion|sueño|sueno)\b/.test(
      t
    ) ||
    /\b(sentir|siente|vive|vivis)\b.*\b(volante|conduc|manej)\b/.test(t) ||
    /\b(no es solo|no es un carro|mas que un carro|más que un carro)\b/.test(t) ||
    /\b(identity|desire|statement)\b/.test(t)
  )
}

/**
 * Dentro del bloque intro: tras el gancho narrativo, prioriza hechos del auto (marca/modelo/año) sobre ruido;
 * mayor número = más al inicio del reel donde aplique el mismo “tier” de gancho vs ficha.
 */
function vehicleFactsIntroTier(seg: Segment | undefined): number {
  if (!seg) return 0
  const t = normalizeText(seg.text)
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasExplicitModel =
    MODEL_LINE_REGEX.test(t) ||
    /\b(prado|picanto|hilux|land\s*cruiser|landcruiser|camry|corolla|rav4|patrol|pathfinder|tundra|sequoia|4runner|highlander)\b/.test(
      t
    ) ||
    /\b[hx]?\d{1,3}\b/.test(t)

  if (hasEmotionalOrLifestyleHookTone(t)) {
    if (hasBrand && hasExplicitModel && hasYear) return 96
    return 18
  }

  if (isStandaloneYearPresentationToken(seg)) return 85

  if (!hasBrand && hasExplicitModel && seg.word_count <= 5) return 88

  if (hasBrand && hasExplicitModel && hasYear) return 100
  if (hasBrand && hasExplicitModel) return 95
  if (hasBrand && hasYear) return 92
  if (hasBrand && (seg.word_count >= 6 || /land\s*cruiser|landcruiser/.test(t))) return 93
  if (hasBrand) return 70
  return 50
}

function hasExplicitModelTokenInText(seg: Segment, t: string): boolean {
  return (
    MODEL_LINE_REGEX.test(seg.text) ||
    MODEL_LINE_REGEX.test(t) ||
    /\b(prado|picanto|hilux|land\s*cruiser|landcruiser|camry|corolla|rav4|patrol|pathfinder|tundra|sequoia|4runner|highlander)\b/.test(
      t
    ) ||
    /\b[hx]?\d{1,3}\b/.test(t)
  )
}

/**
 * Hechos mínimos para abrir el Reel (marca/modelo/año) frente a ganchos lifestyle que solo mencionan
 * "Toyota" con frase larga o cumplen `openingPresentationIsAdequate` por word_count sin modelo/año.
 */
function hasStructuredVehicleIntroFacts(seg: Segment | undefined): boolean {
  if (!seg) return false
  if (isStandaloneYearPresentationToken(seg)) return true
  const t = normalizeText(seg.text)
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasExplicitModel = hasExplicitModelTokenInText(seg, t)

  if (hasBrand && hasExplicitModel) return true
  if (hasBrand && hasYear) return true
  if (!hasBrand && hasExplicitModel && seg.word_count <= 5) return true
  if (hasBrand && !hasExplicitModel && !hasYear && seg.word_count <= 4) return true
  return false
}

/** Normaliza texto para comparar si dos tomas dicen lo mismo (no confundir con solo repetir nombre de auto). */
function normalizeForDedupe(text: string): string {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordCountNormalized(t: string): number {
  return t.split(/\s+/).filter(Boolean).length
}

/** Palabras vacías ES para detectar misma idea con distinta redacción ("con un diseño" vs "cuenta con un diseño"). */
const DEDUPE_STOPWORDS = new Set([
  'con', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en', 'por', 'para',
  'que', 'y', 'o', 'se', 'su', 'sus', 'le', 'les', 'lo', 'es', 'son', 'hay', 'muy', 'mas', 'más', 'no',
  'si', 'sí', 'ya', 'me', 'te', 'tu', 'tus', 'mi', 'mis', 'solo', 'también', 'esta', 'este', 'esto', 'estos',
  'estas', 'como', 'cuenta', 'cuentan', 'tiene', 'tienen', 'ser', 'era', 'fue', 'han', 'hemos', 'puede',
])

function contentTokensForDedupe(text: string): string[] {
  return normalizeForDedupe(text)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !DEDUPE_STOPWORDS.has(w))
}

function jaccardTokenSets(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  if (A.size === 0 && B.size === 0) return 1
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return dp[n]
}

function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const d = levenshtein(a, b)
  return 1 - d / Math.max(a.length, b.length)
}

/** Micro-nombre de modelo solo (p. ej. "Prado") vs frase larga "Toyota Land Cruiser…": no son el mismo utterance para dedupe. */
function isIsolatedShortVehicleModelName(text: string): boolean {
  const t = normalizeForDedupe(text)
    .trim()
    .replace(/\s+/g, ' ')
  if (wordCountNormalized(t) > 3) return false
  return /^(prado|hilux|picanto|versa|march|sunny|tiida|sentra|altima|creta|tucson|sportage|be\s*go|rio|accent|elantra|cx[- ]?5|cx[- ]?9|cx[- ]?30)$/.test(
    t
  )
}

/**
 * True si dos segmentos son la misma frase (tomas repetidas), p.ej. dos clips distintos diciendo "con amplio espacio".
 * False si solo comparten nombre de modelo (presentación vs CTA distinto).
 */
function isSameUtterance(textA: string, textB: string): boolean {
  const na = normalizeForDedupe(textA)
  const nb = normalizeForDedupe(textB)
  if (!na || !nb) return false
  if (na === nb) return true

  // Presentación "Glory 560" vs cierre "Comenta glory 560" comparten tokens de modelo pero no son la misma toma.
  const hasComentaA = /\bcomenta\b/.test(na)
  const hasComentaB = /\bcomenta\b/.test(nb)
  if (hasComentaA !== hasComentaB) return false

  const shortA = isIsolatedShortVehicleModelName(textA)
  const shortB = isIsolatedShortVehicleModelName(textB)
  if (shortA !== shortB) return false

  const ca = wordCountNormalized(na)
  const cb = wordCountNormalized(nb)
  const wcRatio = Math.min(ca, cb) / Math.max(ca, cb)
  if (wcRatio < 0.65) return false

  const sim = stringSimilarity(na, nb)
  if (sim >= 0.94) return true
  if (sim >= 0.88 && wcRatio >= 0.82) return true
  if (sim >= 0.9 && wcRatio >= 0.72 && Math.abs(ca - cb) <= 2) return true

  // Paráfrasis corta misma idea (p. ej. "con un diseño" / "cuenta con un diseño"): solapamiento léxico fuerte.
  const ta = contentTokensForDedupe(textA)
  const tb = contentTokensForDedupe(textB)
  if (ta.length >= 2 && tb.length >= 2) {
    const jac = jaccardTokenSets(ta, tb)
    if (jac >= 0.5 && wcRatio >= 0.55) return true
    if (jac >= 0.38 && wcRatio >= 0.72 && sim >= 0.55) return true
  }
  return false
}

/** Cortes seguidos donde uno contiene casi todo el texto del otro (misma toma reeditada). */
function consecutiveNearDuplicateUtterance(textA: string, textB: string): boolean {
  if (isIsolatedShortVehicleModelName(textA) || isIsolatedShortVehicleModelName(textB)) return false
  const na = normalizeForDedupe(textA)
  const nb = normalizeForDedupe(textB)
  if (na.length < 12 || nb.length < 12) return false
  const short = na.length <= nb.length ? na : nb
  const long = na.length > nb.length ? na : nb
  if (long.includes(short) && short.length >= 14) return true
  return stringSimilarity(na, nb) >= 0.88
}

/** Modos de orden fijo (operador / guion): evita dos cortes seguidos casi idénticos. */
function dedupeConsecutiveNearDuplicates(
  sequence: SequenceItem[],
  segmentLookup: Map<string, Segment>,
  jobId: string
): SequenceItem[] {
  if (sequence.length <= 1) return sequence
  const out: SequenceItem[] = [sequence[0]!]
  for (let i = 1; i < sequence.length; i++) {
    const item = sequence[i]!
    const seg = segmentLookup.get(item.segment_id)
    const prevSeg = segmentLookup.get(out[out.length - 1]!.segment_id)
    if (seg && prevSeg) {
      const preserveCtaChain =
        isEndCtaSegment(prevSeg) &&
        isEndCtaSegment(seg) &&
        ((isCtaCallToActionTrigger(prevSeg) && isCtaInfoContinuationSegment(seg)) ||
          (isCtaCallToActionTrigger(seg) && isCtaInfoContinuationSegment(prevSeg)))
      if (preserveCtaChain) {
        out.push(item)
        continue
      }
      if (isSameUtterance(prevSeg.text, seg.text) || consecutiveNearDuplicateUtterance(prevSeg.text, seg.text)) {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Editor] Dedupe consecutivo: descartando ${item.segment_id} (muy similar al corte anterior)`
        )
        continue
      }
    }
    out.push(item)
  }
  return out
}

interface ValidateGeminiSequenceOptions {
  /** Descarta cualquier ítem cuyo segmento pertenezca a estos clip_index (p. ej. clip de VO manual). */
  excludeClipIndicesFromSequence?: number[]
  /** Si true, no se normaliza visual_overlay (modo VO manual: sin B-roll decidido por Claude). */
  disableVisualOverlayNormalization?: boolean
  /** Si está definido, se valida y devuelve voice_over_insert_after_count en el resultado. */
  manualVoiceOverBaseClipIndex?: number
  /** VO desde MP3: mismas reglas de inserción que VO manual sin clip base. */
  manualVoiceOverFromExternalAudio?: boolean
  /** Hasta 3 clips en orden: se fuerzan al inicio del montaje tras el resto de validación. */
  manualIntroClipIndices?: number[]
  /** Permutación de clips: el montaje final agrupa cortes por clip en este orden (no aplica con intro fija). */
  manualClipOrderIndices?: number[]
  /** Checklist: un corte obligatorio por clip del orden; sin recorte por duración (~35 s). */
  forceAllManualOrderClips?: boolean
  /** Secuencia ya ordenada por diálogos del guión: se conserva tal cual. */
  guionDeterministicOrder?: boolean
}

function coerceVoiceOverInsertAfterCount(raw: GeminiSegmentAnalysis, sequenceLength: number): number {
  const r = raw as unknown as Record<string, unknown>
  const v = r.voice_over_insert_after_count
  let n = 0
  if (typeof v === 'number' && Number.isFinite(v)) n = Math.floor(v)
  else if (typeof v === 'string' && v.trim() !== '') {
    const p = Number(v)
    if (Number.isFinite(p)) n = Math.floor(p)
  }
  return Math.max(0, Math.min(n, sequenceLength))
}

/**
 * Dentro de un clip con varios segmentos hablados: elige el toma que mejor sirva como intro (marca/modelo/año),
 * no siempre el primero en el tiempo (p. ej. "Prado" puede ir después de un gancho en el mismo archivo).
 */
function pickBestSegmentForManualIntroClip(candidates: Segment[]): Segment | undefined {
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]
  const lookupSelf = new Map(candidates.map((s) => [s.segment_id, s] as const))
  const scored = candidates.map((s) => ({
    seg: s,
    struct: hasStructuredVehicleIntroFacts(s) ? 1 : 0,
    tier: vehicleFactsIntroTier(s),
    strength: introOpeningStrength(s),
  }))
  scored.sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength
    if (b.struct !== a.struct) return b.struct - a.struct
    if (b.tier !== a.tier) return b.tier - a.tier
    return a.seg.start_s - b.seg.start_s
  })
  return scored[0]!.seg
}

/** Intro de emergencia: un segmento hablado por cada clip indicado, en el MISMO orden que eligió el usuario. */
function pinManualIntroClipIndicesToStart(
  sequence: SequenceItem[],
  allSegments: Segment[],
  segmentLookup: Map<string, Segment>,
  clipIndicesInOrder: number[],
  excluded: number[],
  jobId: string
): { sequence: SequenceItem[]; pinnedCount: number } {
  const excludedSet = new Set(excluded)
  const picked: SequenceItem[] = []
  const introClipSet = new Set(clipIndicesInOrder)

  for (const clipIdx of clipIndicesInOrder) {
    if (excludedSet.has(clipIdx)) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Editor] Intro manual: se omite clip ${clipIdx} (reservado / excluido del montaje).`
      )
      continue
    }
    const candidates = allSegments
      .filter(
        (s) =>
          s.clip_index === clipIdx && s.source_kind !== 'visual_only' && !isMistakeSegment(s)
      )
      .sort((a, b) => a.start_s - b.start_s || a.segment_id.localeCompare(b.segment_id))
    const seg = pickBestSegmentForManualIntroClip(candidates)
    if (!seg) {
      const visualFallback = allSegments
        .filter((s) => s.clip_index === clipIdx && !isMistakeSegment(s))
        .sort((a, b) => a.start_s - b.start_s || b.duration_s - a.duration_s)[0]
      if (visualFallback) {
        picked.push(sequenceItemFromSegment(visualFallback, 0, `intro fija manual (clip ${clipIdx}, fallback visual)`))
        continue
      }
      console.warn(
        `[VideoV2Pipeline][${jobId}][Editor] Intro manual: clip ${clipIdx} sin habla en el mapa — se omite.`
      )
      continue
    }
    picked.push(sequenceItemFromSegment(seg, 0, `intro fija manual (clip ${clipIdx})`))
  }

  if (picked.length === 0) return { sequence, pinnedCount: 0 }

  const pickedIds = new Set(picked.map((p) => p.segment_id))
  const tail = sequence.filter((item) => {
    if (pickedIds.has(item.segment_id)) return false
    const seg = segmentLookup.get(item.segment_id)
    if (seg && introClipSet.has(seg.clip_index)) return false
    return true
  })

  console.log(
    `[VideoV2Pipeline][${jobId}][Editor] Intro fija manual: ${picked.length} corte(s) al inicio (orden de slots respetado): ` +
      picked.map((p) => p.segment_id).join(' → ')
  )
  return { sequence: [...picked, ...tail], pinnedCount: picked.length }
}

function buildManualClipOrderPromptBlock(order: number[]): string {
  if (!order.length) return ''
  return `=== ORDEN DE CLIPS (OPERADOR — FIJO) ===
El operador definió este orden de aparición en el Reel (índice de archivo subido): ${order.join(' → ')}.
OBLIGATORIO: incluye al menos un segment_id del mapa por cada clip de esa lista que tenga habla en el mapa.
El sistema reagrupará tu "sequence" final para que todo lo elegido del clip ${order[0]} vaya primero, luego el clip ${order[1] ?? '—'}, etc., sin mezclar bloques de distintos clips entre sí.
Dentro de cada clip puedes usar varios cortes y el orden interno que mejor cuente la historia; elimina zonas muertas y errores ("me equivoqué") como siempre.
No priorices el orden global de los segment_id en el JSON frente a buenos cortes por clip: la macro-estructura por clip ya está fijada arriba.
=== FIN ORDEN DE CLIPS ===

`
}

/**
 * Reagrupa la secuencia: todos los ítems de cada clip_index consecutivos según `manualOrder`.
 * Si un clip no tenía ítems, inserta un corte mínimo desde el mapa.
 */
function reorderSequenceByManualClipOrder(
  sequence: SequenceItem[],
  manualOrder: number[],
  allSegments: Segment[],
  excluded: number[],
  segmentLookup: Map<string, Segment>,
  jobId: string
): SequenceItem[] {
  const excludedSet = new Set(excluded)
  const byClip = new Map<number, SequenceItem[]>()
  for (const idx of manualOrder) {
    if (!excludedSet.has(idx)) byClip.set(idx, [])
  }
  for (const item of sequence) {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) continue
    if (excludedSet.has(seg.clip_index)) continue
    if (!byClip.has(seg.clip_index)) {
      byClip.set(seg.clip_index, [])
    }
    byClip.get(seg.clip_index)!.push(item)
  }

  const out: SequenceItem[] = []
  for (const idx of manualOrder) {
    if (excludedSet.has(idx)) continue
    let bucket = byClip.get(idx) ?? []
    if (bucket.length === 0) {
      const candidates = allSegments
        .filter(
          (s) =>
            s.clip_index === idx &&
            s.source_kind !== 'visual_only' &&
            !isMistakeSegment(s)
        )
        .sort((a, b) => a.start_s - b.start_s || a.segment_id.localeCompare(b.segment_id))
      const seg = pickBestSegmentForManualIntroClip(candidates) ?? candidates[0]
      if (seg) {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Editor] Orden manual: clip ${idx} sin cortes en la propuesta — se inserta un corte por defecto.`
        )
        bucket = [sequenceItemFromSegment(seg, 0, `orden manual: clip ${idx} (mínimo requerido)`)]
      } else {
        const visualFallback = allSegments
          .filter((s) => s.clip_index === idx && !isMistakeSegment(s))
          .sort((a, b) => a.start_s - b.start_s || a.segment_id.localeCompare(b.segment_id))[0]
        if (visualFallback) {
          console.warn(
            `[VideoV2Pipeline][${jobId}][Editor] Orden manual: clip ${idx} solo con plano — fallback visual.`
          )
          bucket = [
            sequenceItemFromSegment(visualFallback, 0, `orden manual: clip ${idx} (plano, fallback)`),
          ]
        }
      }
    }
    out.push(...bucket)
  }

  const usedIds = new Set(out.map((x) => x.segment_id))
  for (const item of sequence) {
    if (!usedIds.has(item.segment_id)) {
      const seg = segmentLookup.get(item.segment_id)
      if (seg && excludedSet.has(seg.clip_index)) continue
      out.push(item)
    }
  }
  return out
}

function validateSequence(
  raw: GeminiSegmentAnalysis,
  allSegments: Segment[],
  jobId: string,
  clipKinds: VideoClipKind[] = [],
  opts?: ValidateGeminiSequenceOptions
): GeminiSegmentAnalysis {
  const segmentLookup = new Map<string, Segment>()
  for (const s of allSegments) {
    segmentLookup.set(s.segment_id, s)
  }

  const clipCount = inferClipCountFromSegments(allSegments)
  const kinds = clipKindsResolved(clipKinds, clipCount)
  const excluded = opts?.excludeClipIndicesFromSequence ?? []
  /** Cortes fijados por “Intro manual” que deben quedar al frente sin re-ordenarse entre sí. */
  let pinnedIntroCount = 0

  // 1) Coerción JSON + limpiar duplicados y segmentos basura ("me equivoqué")
  const usedIds = new Set<string>()
  let sequence = raw.sequence
    .map((item) => coerceSequenceItem(item))
    .filter((item) => {
      if (usedIds.has(item.segment_id)) return false
      usedIds.add(item.segment_id)
      return true
    })
    .filter((item) => {
      const seg = segmentLookup.get(item.segment_id)
      if (!seg) {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Editor] segment_id desconocido "${item.segment_id}", se descarta.`
        )
        return false
      }
      if (excluded.includes(seg.clip_index)) {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Editor] Se descarta ${item.segment_id} (clip ${seg.clip_index} excluido del montaje Claude).`
        )
        return false
      }
      return true
    })
    .filter((item) => {
      const seg = segmentLookup.get(item.segment_id)
      if (seg?.source_kind === 'visual_only') {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Editor] Se descarta ${item.segment_id} como corte principal (clip B-roll sin habla).`
        )
        return false
      }
      return true
    })

  // 2) Forzar cortes exactos al segmento para no romper palabras
  const clipMaxEndByIndex = new Map<number, number>()
  for (const s of allSegments) {
    clipMaxEndByIndex.set(s.clip_index, Math.max(clipMaxEndByIndex.get(s.clip_index) ?? 0, s.end_s))
  }
  sequence = sequence.map((item) => {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) return item
    const clipMaxEnd = clipMaxEndByIndex.get(seg.clip_index) ?? seg.end_s
    const TRIM_START_PAD_SEC = 0.05
    const TRIM_END_PAD_SEC = 0.14
    const safeStart = Math.max(0, seg.start_s - TRIM_START_PAD_SEC)
    const safeEnd = Math.min(clipMaxEnd, seg.end_s + TRIM_END_PAD_SEC)
    return {
      ...item,
      trim_start: Number(safeStart.toFixed(3)),
      trim_end: Number(Math.max(safeStart + 0.12, safeEnd).toFixed(3)),
      trim_duration: Number((Math.max(safeStart + 0.12, safeEnd) - safeStart).toFixed(3)),
    }
  })

  // 2b) Ajustar / validar superposición B-roll + voz en off
  if (opts?.disableVisualOverlayNormalization) {
    sequence = sequence.map((item) => ({ ...item, visual_overlay: undefined }))
  } else {
    sequence = normalizeVisualOverlaysInSequence(sequence, kinds, allSegments, jobId)
  }

  const manualOrderMode =
    Array.isArray(opts?.manualClipOrderIndices) && opts.manualClipOrderIndices.length > 0
  const manualOrder = manualOrderMode ? opts.manualClipOrderIndices : null

  if (manualOrderMode && manualOrder) {
    if (opts?.forceAllManualOrderClips) {
      console.log(
        `[VideoV2Pipeline][${jobId}][Checklist] Orden manual con todos los clips obligatorios: ${manualOrder.join(' → ')} ` +
          '(sin recorte por duración ~35s)'
      )
      sequence = dedupeConsecutiveNearDuplicates(sequence, segmentLookup, jobId)
    } else {
      console.log(
        `[VideoV2Pipeline][${jobId}][Editor] Orden manual de clips: ${manualOrder.join(' → ')} ` +
          '(macro-orden fijo; sin dedupe global ni reorden editorial automático entre clips)'
      )
      sequence = reorderSequenceByManualClipOrder(
        sequence,
        manualOrder,
        allSegments,
        excluded,
        segmentLookup,
        jobId
      )
      sequence = dedupeConsecutiveNearDuplicates(sequence, segmentLookup, jobId)
    }
  } else if (opts?.guionDeterministicOrder) {
    console.log(
      `[VideoV2Pipeline][${jobId}][Editor] Orden GUION determinista: se conserva la secuencia ` +
        `(sin reordenar)`
    )
    sequence = dedupeConsecutiveNearDuplicates(sequence, segmentLookup, jobId)
  }
  // Modo automático: se respeta el orden que eligió Claude.

  let totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))

  // 6) Tope solo para reels MUY largos (>92s). Sin soft-cap ~33s: el montaje
  //    dura lo que dura el habla/segmentos elegidos (no se corta habla al final).
  const REEL_TRIM_TRIGGER_SEC = 92
  const REEL_TRIM_TARGET_SEC = 88
  const REEL_LAST_SEGMENT_MIN_SEC = 0.22

  if (!opts?.forceAllManualOrderClips) {
    if (totalDuration > REEL_TRIM_TRIGGER_SEC && sequence.length > 0) {
      for (let i = sequence.length - 1; i >= 0 && totalDuration > REEL_TRIM_TARGET_SEC; i--) {
        const seg = segmentLookup.get(sequence[i].segment_id)
        if (seg && !isEndCtaSegment(seg) && !isPresentationSegment(seg)) {
          totalDuration -= sequence[i].trim_duration
          sequence.splice(i, 1)
        }
      }
      totalDuration = Number(totalDuration.toFixed(3))

      if (totalDuration > REEL_TRIM_TRIGGER_SEC && sequence.length > 0) {
        const last = sequence[sequence.length - 1]
        const excess = totalDuration - REEL_TRIM_TARGET_SEC
        last.trim_duration = Number(Math.max(REEL_LAST_SEGMENT_MIN_SEC, last.trim_duration - excess).toFixed(3))
        last.trim_end = Number((last.trim_start + last.trim_duration).toFixed(3))
        if (last.visual_overlay) {
          last.visual_overlay = {
            ...last.visual_overlay,
            trim_end: Number((last.visual_overlay.trim_start + last.trim_duration).toFixed(3)),
          }
        }
        totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
      }
      console.log(
        `[VideoV2Pipeline][${jobId}][Editor] Reel muy largo: recortado a ${totalDuration.toFixed(1)}s (tope seguridad ${REEL_TRIM_TARGET_SEC}s)`
      )
    }
  } else {
    console.log(
      `[VideoV2Pipeline][${jobId}][Checklist] Duración total ${totalDuration.toFixed(1)}s — sin recorte automático`
    )
  }

  if (!manualOrderMode && opts?.manualIntroClipIndices && opts.manualIntroClipIndices.length > 0) {
    const pinResult = pinManualIntroClipIndicesToStart(
      sequence,
      allSegments,
      segmentLookup,
      opts.manualIntroClipIndices,
      excluded,
      jobId
    )
    sequence = pinResult.sequence
    pinnedIntroCount = pinResult.pinnedCount
    totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
  }

  sequence.forEach((item, i) => { item.order = i + 1 })

  let voiceOverInsertAfter: number | undefined
  if (opts?.manualVoiceOverBaseClipIndex != null || opts?.manualVoiceOverFromExternalAudio === true) {
    const lenBeforePin = Math.max(0, sequence.length - pinnedIntroCount)
    const rawInsert = coerceVoiceOverInsertAfterCount(raw, lenBeforePin)
    voiceOverInsertAfter = Math.min(rawInsert + pinnedIntroCount, sequence.length)
  }

  return {
    sequence,
    total_duration: totalDuration,
    overall_strategy: raw.overall_strategy,
    ...(typeof voiceOverInsertAfter === 'number' ? { voice_over_insert_after_count: voiceOverInsertAfter } : {}),
  }
}

// ─── Prompt ──────────────────────────────────────────────────────────────────
// Claude decide la estructura del Reel (qué usar, orden, duración, apertura y cierre).
// Aquí solo va el material, el contexto del negocio y las reglas técnicas del montaje.

const BROLL_PROMPT_BLOCK = `PLANOS SIN HABLA (visual_overlay):
- Los clips SOLO PLANO no tienen audio útil: nunca van como corte propio en "sequence".
- Puedes ponerlos encima de un corte con habla: "visual_overlay": { "clip_index": N, "trim_start": X, "trim_end": Y }, con X/Y en segundos dentro de ese clip y la misma duración que el corte. Si no aporta, usa null.
`

const VISUAL_PLAN_BLOCK = `DIRECCIÓN VISUAL ("visual_plan") — tú decides el estilo de este Reel:
- El segundo 0 tiene que detener el scroll. "hook_text" es un texto grande en pantalla desde el inicio (2 a 6 palabras, máx. 42 caracteres): pregunta, dato fuerte o promesa; no tiene que ser lo que dice el asesor. Elige cómo entra ("hook_animation": impacto = rebote grande, deslizar_izquierda/deslizar_derecha = entra de lado, caer = baja desde arriba, girar = entra girando, revelar = se descubre de izquierda a derecha) y su sonido ("hook_sfx").
- "spec_cards": hasta 4 datos cortos (1 a 3 palabras, ej. "2.8 DIÉSEL", "7 PASAJEROS") que aparecen al inicio del corte de tu "sequence" (segment_id) donde el asesor lo dice. Solo datos que de verdad se mencionan. "card_animation" usa las mismas entradas que el gancho.
- "transitions": cómo se pasa de una toma a otra (deslizar, barrido, carrusel = empuja la toma, giro, zoom, fundido, revelar).
- "camera_motion": movimiento sobre cada toma (acercar, alejar, alternar, paneo = desliza la cámara, quieto).
- "palette": color de los textos en pantalla. "color_filter": tono de la imagen (ninguno, contraste, intenso = más saturado, suave = menos saturado).
- "style_name": un nombre corto para este estilo.
Combínalos para que este Reel tenga personalidad propia.
`

function voiceOverBlock(voClipIndex: number | null): string {
  const source =
    voClipIndex != null ? `El audio completo del clip ${voClipIndex}` : 'Un audio de voz en off subido aparte (MP3)'
  return `BLOQUE DE VOZ EN OFF (no va en "sequence"):
- ${source} suena una sola vez, con planos sin habla encima. "sequence" solo lleva cortes con habla de los demás clips y sin visual_overlay.
- "voice_over_insert_after_count" = cuántos cortes de "sequence" van antes de ese bloque (0 = abre el Reel; igual al total de cortes = lo cierra). Tú decides dónde rinde más.
`
}

function buildScriptGuidanceBlock(
  scriptGuidanceText?: string | null,
  scriptDialogueLines?: string[] | null
): string {
  const raw = scriptGuidanceText?.trim()
  const dialogues = scriptDialogueLines?.filter((s) => s && s.trim()) ?? []
  if (!raw && dialogues.length === 0) return ''

  const capped =
    raw && raw.length > 24000 ? `${raw.slice(0, 24000)}\n[… texto truncado para el modelo]` : raw ?? ''

  const dialogueBlock =
    dialogues.length > 0
      ? `=== DIÁLOGOS DEL GUION (entre comillas, EN ORDEN — prioridad para alinear transcripción) ===
${dialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n')}
Usa esta lista para reconocer errores típicos de ASR (ej. año mal cortado) y para elegir segment_id que correspondan a cada línea.
=== FIN DIÁLOGOS ===

`
      : ''

  const rawBlock =
    capped.length > 0
      ? `Texto completo extraído del PDF (contexto adicional):
${capped}
`
      : ''

  return `=== GUION DE REFERENCIA (ORDEN EDITORIAL OBLIGATORIO) ===
IMPORTANTE: Los clips subidos contienen el audio/diálogo del guion — los vendedores grabaron los clips siguiendo este guion.
Tu tarea es MAPEAR cada sección del guion a los segment_id correspondientes del mapa y respetar el ORDEN del guion.

REGLAS SOBRE EL GUION:
1. SIGUE EL ORDEN del guion: la secuencia debe reflejar el flujo del guion (intro → desarrollo → cierre).
2. MAPEA cada bloque de texto del guion al segment_id cuya transcripción más se parezca a esa parte (puedes tolerar pequeñas diferencias de ASR si el contexto coincide).
3. Si un segmento del mapa corresponde a una sección del guion, inclúyelo en ESA posición dentro de "sequence".
4. Si hay segmentos que no están en el guion (improvisaciones, errores), puedes descartarlos o incluirlos si aportan valor.
5. Si el guion tiene una sección que no encontraste en el mapa, no la inventes — simplemente omítela.
6. El guion es la ESTRUCTURA; el mapa de segmentos son los BLOQUES disponibles. Tú eres el editor que los une.

${dialogueBlock}${rawBlock}
=== FIN GUION ===`
}

function buildCanonicalVehicleBlock(vehicle?: CanonicalVehicleMeta | null): string {
  if (!vehicle) return ''
  const brand = vehicle.brand?.trim() ?? ''
  const model = vehicle.model?.trim() ?? ''
  const year = vehicle.year?.trim() ?? ''
  if (!brand && !model && !year) return ''
  return `=== VEHÍCULO CANÓNICO (inventario / referencia — usar para contexto, NO inventar otro auto) ===
Marca: ${brand || '(no indicada)'}
Modelo: ${model || '(no indicado)'}
Año: ${year || '(no indicado)'}
Si la transcripción (ASR) parece un error cercano a estos datos (p. ej. año troceado), es este vehículo.
=== FIN VEHÍCULO ===

`
}

function buildAssemblyTranscriptBlock(dump: string | null | undefined): string {
  const t = dump?.trim()
  if (!t) return ''
  const capped = t.length > 12000 ? `${t.slice(0, 12000)}\n[… transcripción truncada]` : t
  return `=== TRANSCRIPCIÓN CRUDA POR CLIP (AssemblyAI → texto del mapa) ===
Úsala para ver qué dijo realmente cada clip y para alinear con el guion. Los timestamps finos están en el MAPA DE SEGMENTOS debajo.
${capped}
=== FIN TRANSCRIPCIÓN CRUDA ===

`
}

function buildOutputBlock(manual: boolean): string {
  return `FORMATO DE LA RESPUESTA (JSON):
- "sequence": los cortes en el orden del Reel. En cada uno: segment_id, clip_index, trim_start, trim_end, trim_duration, order, reason (por qué va ese corte; si lleva visual_overlay, qué se ve) y visual_overlay (objeto o null).
- "total_duration": suma de trim_duration. "overall_strategy": una frase sobre la estrategia editorial.
- "voice_over_insert_after_count": ${manual ? 'obligatorio (ver bloque de voz en off)' : 'null (no hay bloque de voz en off)'}.
- "caption_highlights": entre 3 y 8 frases del DIÁLOGO de los cortes elegidos que merecen destacarse en pantalla; priority 1 = más importante.
  · "phrase" debe aparecer (o casi) en la transcripción: ej. "amplia cabina", "pantalla multimedia", "resistencia".
  · kind "spec": motor, cilindrada, 4x4, diésel, turbo. "feature": cabina, pantalla, equipamiento, diseño. "emotional": confianza, resistencia, durabilidad, desempeño.
  · Sin "comenta", sin marca del concesionario ni CTAs, sin repetir la misma idea.`
}

function buildEditorPrompt(opts: {
  formattedSegmentMap: string
  frameCount: number
  clipKinds: VideoClipKind[]
  clipCatalog: string
  manualVoiceOverBaseClipIndex: number | null
  manualVoiceOverFromExternalAudio: boolean
  scriptGuidanceText: string | null
  scriptDialogueLines: string[] | null
  assemblyTranscriptDump: string | null
  canonicalVehicle: CanonicalVehicleMeta | null
  manualClipOrderIndices: number[] | null
  previousReelsBlock: string | null
  motion: boolean
}): string {
  const manual = opts.manualVoiceOverBaseClipIndex != null || opts.manualVoiceOverFromExternalAudio
  const brollBlock = !manual && opts.clipKinds.some((k) => k === 'visual_only') ? BROLL_PROMPT_BLOCK : ''
  const voBlock = manual ? voiceOverBlock(opts.manualVoiceOverBaseClipIndex) : ''
  const framesNote =
    opts.frameCount > 0
      ? `Arriba tienes ${opts.frameCount} cuadros de las tomas, cada uno etiquetado con su segment_id.`
      : 'No tienes imágenes de las tomas: decide con el texto.'
  const scriptBlock = buildScriptGuidanceBlock(opts.scriptGuidanceText, opts.scriptDialogueLines)
  const manualOrderBlock =
    (opts.manualClipOrderIndices?.length ?? 0) > 0 ? buildManualClipOrderPromptBlock(opts.manualClipOrderIndices!) : ''

  return `Eres el editor de video de K-SI, concesionario de autos seminuevos en Cuenca (Ecuador). Un asesor grabó estos clips para vender el vehículo. Arma con ellos el Reel vertical para Instagram y TikTok que mejor venda este auto: tú decides qué partes usar, en qué orden, cuánto dura y cómo abre y cierra.

${framesNote}

${opts.clipCatalog}
${buildCanonicalVehicleBlock(opts.canonicalVehicle)}${opts.previousReelsBlock ?? ''}${buildAssemblyTranscriptBlock(opts.assemblyTranscriptDump)}${scriptBlock ? `${scriptBlock}\n\n` : ''}${manualOrderBlock}MAPA DE SEGMENTOS (los únicos cortes posibles):

${opts.formattedSegmentMap}

REGLAS TÉCNICAS:
- Usa solo segment_id del mapa, cada uno una vez, con trim_start = start_s y trim_end = end_s (el sistema ajusta los bordes para no cortar palabras).
${brollBlock}${voBlock}
${opts.motion ? MOTION_PLAN_PROMPT_BLOCK : VISUAL_PLAN_BLOCK}
${buildOutputBlock(manual)}`
}

// ─── Función principal: analyzeSegments ──────────────────────────────────────

export interface AnalyzeSegmentsOptions {
  /** Clip de voz en off reservado (audio completo + B-roll); excluido del mapa/prompt y de la secuencia validada. */
  manualVoiceOverBaseClipIndex?: number
  /** VO desde MP3: excluye estos clip_index de "sequence" (p. ej. solo planos encima del audio). */
  excludeClipIndicesFromSequence?: number[]
  /** Audio de VO en archivo externo (no clip). */
  manualVoiceOverFromExternalAudio?: boolean
  /** Texto extraído de un PDF de guion; referencia editorial no estricta. */
  scriptGuidanceText?: string
  /** Diálogos entre comillas extraídos del guion (orden de grabación). */
  scriptDialogueLines?: string[]
  /** Resumen AssemblyAI por clip (texto del mapa) para alinear con guion. */
  assemblyTranscriptDump?: string
  /** Marca / modelo / año canónicos (inventario o manual). */
  canonicalVehicle?: CanonicalVehicleMeta
  /** Emergencia: orden fijo de clips al inicio del montaje (validado en servidor). */
  manualIntroClipIndices?: number[]
  /** Orden macro de clips en el Reel (permutación de índices narrativos). */
  manualClipOrderIndices?: number[]
  /** Resumen de reels anteriores del mismo vehículo (previous-reels.ts) para que Claude no los repita. */
  previousReelsBlock?: string
  /** Reel Motion 3D: Claude devuelve el plan de gráficos (motion_plan) en vez del plan visual de Shotstack. */
  motion?: boolean
}

/**
 * Pide a Claude el montaje (una sola llamada) y lo valida con las reglas editoriales.
 *
 * @param formattedSegmentMap  Mapa de segmentos formateado en texto
 * @param allSegments          Array de todos los segmentos para validación
 * @param jobId                ID del job para logging
 * @param frames               Cuadros etiquetados por segment_id (vacío = solo texto)
 */
export async function analyzeSegments(
  formattedSegmentMap: string,
  allSegments: Segment[],
  jobId: string,
  frames: SegmentFrame[] = [],
  clipKinds: VideoClipKind[] = [],
  options?: AnalyzeSegmentsOptions
): Promise<GeminiSegmentAnalysis> {
  const mode = frames.length > 0 ? `visual (${frames.length} cuadros)+texto` : 'solo texto'
  const clipCount = inferClipCountFromSegments(allSegments)
  const kindsForPrompt = clipKindsResolved(clipKinds, clipCount)
  const manualVo = options?.manualVoiceOverBaseClipIndex
  const externalVo = options?.manualVoiceOverFromExternalAudio === true
  const scriptGuidance = options?.scriptGuidanceText?.trim() || null
  const clipCatalog = buildClipCatalogForPrompt(
    allSegments,
    kindsForPrompt,
    manualVo ?? null,
    externalVo
  )
  const validateOpts: ValidateGeminiSequenceOptions | undefined = (() => {
    const o: ValidateGeminiSequenceOptions = {}
    if (manualVo != null) {
      o.excludeClipIndicesFromSequence = [manualVo]
      o.disableVisualOverlayNormalization = true
      o.manualVoiceOverBaseClipIndex = manualVo
    } else if (externalVo) {
      o.excludeClipIndicesFromSequence = options?.excludeClipIndicesFromSequence ?? []
      o.disableVisualOverlayNormalization = true
      o.manualVoiceOverFromExternalAudio = true
    }
    if (options?.manualClipOrderIndices && options.manualClipOrderIndices.length > 0) {
      o.manualClipOrderIndices = options.manualClipOrderIndices
    } else if (options?.manualIntroClipIndices && options.manualIntroClipIndices.length > 0) {
      o.manualIntroClipIndices = options.manualIntroClipIndices
    }
    return Object.keys(o).length > 0 ? o : undefined
  })()
  console.log(`[VideoV2Pipeline][${jobId}][Claude] Analizando ${allSegments.length} segmentos (modo: ${mode})`)

  const prompt = buildEditorPrompt({
    formattedSegmentMap,
    frameCount: frames.length,
    clipKinds: kindsForPrompt,
    clipCatalog,
    manualVoiceOverBaseClipIndex: manualVo ?? null,
    manualVoiceOverFromExternalAudio: externalVo,
    scriptGuidanceText: scriptGuidance,
    scriptDialogueLines: options?.scriptDialogueLines ?? null,
    assemblyTranscriptDump: options?.assemblyTranscriptDump ?? null,
    canonicalVehicle: options?.canonicalVehicle ?? null,
    manualClipOrderIndices: options?.manualClipOrderIndices ?? null,
    previousReelsBlock: options?.previousReelsBlock ?? null,
    motion: options?.motion === true,
  })

  const plan = await requestReelEditPlan(prompt, frames, jobId, { motion: options?.motion === true })
  const validated = validateSequence(
    {
      sequence: plan.sequence,
      total_duration: plan.total_duration,
      overall_strategy: plan.overall_strategy,
      voice_over_insert_after_count: plan.voice_over_insert_after_count,
    },
    allSegments,
    jobId,
    clipKinds,
    validateOpts
  )

  const voIns = validated.voice_over_insert_after_count
  const voInsNote = typeof voIns === 'number' ? `, voice_over_insert_after_count=${voIns}` : ''
  console.log(
    `[VideoV2Pipeline][${jobId}][Claude] Secuencia validada: ${validated.sequence.length} segmentos, ${validated.total_duration.toFixed(1)}s total${voInsNote}`
  )

  return {
    ...validated,
    caption_highlights: plan.caption_highlights,
    ...(plan.visual_plan ? { visual_plan: plan.visual_plan } : {}),
    ...(plan.motion_plan ? { motion_plan: plan.motion_plan } : {}),
    editor_usage: plan.usage,
  }
}

/**
 * Montaje determinista: un corte por cada clip en `manualOrder`, sin llamar a Claude ni recortar ~35 s.
 */
export function buildForcedManualOrderClipAnalysis(
  allSegments: Segment[],
  manualOrder: number[],
  excluded: number[],
  jobId: string,
  clipKinds: VideoClipKind[] = [],
  extraOpts?: Omit<ValidateGeminiSequenceOptions, 'manualClipOrderIndices' | 'forceAllManualOrderClips'>
): GeminiSegmentAnalysis {
  const excludedSet = new Set(excluded)
  const sequence: SequenceItem[] = []

  for (const clipIdx of manualOrder) {
    if (excludedSet.has(clipIdx)) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Checklist] Se omite clip ${clipIdx} (reservado / excluido del montaje).`
      )
      continue
    }
    const candidates = allSegments
      .filter(
        (s) =>
          s.clip_index === clipIdx && s.source_kind !== 'visual_only' && !isMistakeSegment(s)
      )
      .sort((a, b) => a.start_s - b.start_s || a.segment_id.localeCompare(b.segment_id))
    const seg = pickBestSegmentForManualIntroClip(candidates) ?? candidates[0]
    if (seg) {
      sequence.push(sequenceItemFromSegment(seg, 0, `checklist: clip ${clipIdx} obligatorio`))
      continue
    }
    const visualFallback = allSegments
      .filter((s) => s.clip_index === clipIdx && !isMistakeSegment(s))
      .sort((a, b) => a.start_s - b.start_s || b.duration_s - a.duration_s)[0]
    if (visualFallback) {
      sequence.push(
        sequenceItemFromSegment(visualFallback, 0, `checklist: clip ${clipIdx} obligatorio (plano)`)
      )
      continue
    }
    console.warn(`[VideoV2Pipeline][${jobId}][Checklist] clip ${clipIdx} sin segmento usable — se omite.`)
  }

  if (sequence.length === 0) {
    throw new Error(
      `[VideoV2Pipeline][${jobId}][Checklist] No se pudo armar secuencia: ningún clip del orden tiene segmento usable.`
    )
  }

  console.log(
    `[VideoV2Pipeline][${jobId}][Checklist] Montaje obligatorio: ${sequence.length} clip(s) — ` +
      sequence.map((s) => `clip${s.clip_index}`).join(' → ')
  )

  return validateSequence(
    {
      sequence,
      total_duration: Number(sequence.reduce((sum, it) => sum + it.trim_duration, 0).toFixed(3)),
      overall_strategy:
        'Checklist: todos los clips del orden manual (sin recorte automático por duración ~35s)',
    },
    allSegments,
    jobId,
    clipKinds,
    {
      ...extraOpts,
      manualClipOrderIndices: manualOrder,
      forceAllManualOrderClips: true,
      guionDeterministicOrder: true,
    }
  )
}

/**
 * Valida una secuencia ya armada por diálogos del guión (sin llamar a Claude ni reordenar editorialmente).
 */
export function buildValidatedAnalysisFromGuionSequence(
  sequence: SequenceItem[],
  allSegments: Segment[],
  jobId: string,
  clipKinds: VideoClipKind[] = [],
  opts?: ValidateGeminiSequenceOptions
): GeminiSegmentAnalysis {
  const total = Number(sequence.reduce((sum, it) => sum + it.trim_duration, 0).toFixed(3))
  const raw: GeminiSegmentAnalysis = {
    sequence,
    total_duration: total,
    overall_strategy: 'Montaje por orden de diálogos del guión (tabla guion_escenas)',
  }
  return validateSequence(raw, allSegments, jobId, clipKinds, {
    ...opts,
    guionDeterministicOrder: true,
  })
}
