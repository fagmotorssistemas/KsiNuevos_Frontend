/**
 * Módulo Gemini V2 — Análisis multimodal (video + mapa de segmentos) para la Fábrica de Reels.
 *
 * Cuando useVisualAnalysis=true, Gemini recibe tanto los videos reales
 * (subidos al File API de Google) como el mapa de segmentos en texto.
 * Cuando useVisualAnalysis=false (fallback), solo recibe el texto.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Segment, SequenceItem, SequenceVisualOverlay } from './segmenter'
import type { GoogleFileRef } from './google-file-api'
import type { VideoClipKind } from './clip-config'
import { defaultClipKinds } from './clip-config'

const MODEL_VISUAL = 'gemini-2.5-pro'
const MODEL_TEXT = 'gemini-2.5-pro'
const GEMINI_TIMEOUT_MS = 180_000
const MAX_RETRIES = 2

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

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
}

// ─── Extracción JSON ─────────────────────────────────────────────────────────

function extractJsonObject(text: string): string {
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No se encontró JSON válido en la respuesta: ${stripped.slice(0, 300)}`)
  }

  return stripped.slice(start, end + 1)
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
 * Gemini usa esto junto con los videos para decidir montaje, orden y visual_overlay sin intervención manual.
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
        `[VideoV2Pipeline][${jobId}][Gemini] visual_overlay inválido (clip_index no es B-roll), se ignora.`
      )
      return { ...item, visual_overlay: undefined }
    }

    const seg = allSegments.find((s) => s.segment_id === item.segment_id)
    if (!seg || seg.source_kind === 'visual_only') {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Gemini] visual_overlay requiere un segment_id de clip con habla; se ignora.`
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
        `[VideoV2Pipeline][${jobId}][Gemini] B-roll clip ${vIdx} no cubre ${target.toFixed(2)}s; se quita overlay.`
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
  'chrysler', 'citroen', 'citroën', 'cupra', 'dodge', 'fiat', 'ford', 'genesis', 'gmc', 'great wall',
  'haval', 'honda', 'hyundai', 'infiniti', 'isuzu', 'jaguar', 'jeep', 'kia', 'lancia', 'land rover',
  'lexus', 'lincoln', 'maserati', 'mazda', 'mercedes', 'mercedes-benz', 'mercedes benz', 'mini',
  'mitsubishi', 'nissan', 'peugeot', 'polestar', 'porsche', 'ram', 'renault', 'seat', 'skoda', 'smart',
  'subaru', 'suzuki', 'tesla', 'toyota', 'volkswagen', 'volvo', 'vw', 'mg', 'byd', 'geely', 'jac',
  'figmotors', 'ksi',
]

/** Modelos / series frecuentes en inventario (ayuda a no clasificar "solo año" como presentación). */
const MODEL_LINE_REGEX =
  /\b(f[- ]?150|f[- ]?250|f[- ]?350|f[- ]?450|silverado|sierra|tahoe|yukon|explorer|escape|ranger|raptor|mustang|bronco|corvette|camaro|equinox|traverse|suburban|colorado|frontier|versa|sentra|altima|rogue|murano|armada|titan|pathfinder|hilux|rav4|highlander|sequoia|tundra|camry|corolla|prius|yaris|civic|accord|pilot|cr-v|hr-v|passat|jetta|tiguan|amarok|golf|polo|arteon|rdx|mdx|tlx|cx-5|cx-9|cx-30|mazda\s*3|mazda\s*6|outlander|eclipse|be\s?go|sportage|tucson|sorento|telluride|palisade|elantra|accent|creta|venue|wrangler|grand cherokee|gladiator|compass|renegade|defender|discovery|evoque|h1|h2|transit|promaster|sprinter)\b/i

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

/**
 * Solo "comenta este/esa/el… + auto" cuenta como gancho de apertura.
 * Frases cortas tipo "comenta Prado 2016" (sin marca ni demostrativo) suelen ser CTA de redes → cierre, no intro.
 */
function isComentaVehicleEngagementHook(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  if (!/\bcomenta\b/.test(t)) return false
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasModel =
    MODEL_LINE_REGEX.test(seg.text) ||
    /\b[hx]?\d{1,3}\b/.test(t) ||
    /\b(prado|picanto|hilux|rio|elantra|accent|tiida|sentra|versa|march|sunny|altima|be\s?go|sportage|tucson|creta)\b/.test(
      t
    )
  if (/\bcomenta\b\s+(este|esta|ese|esa|el|la|los|las|un|una|unos|unas)\b/.test(t)) return true
  if (hasBrand && hasModel) return true
  return false
}

function isPresentationSegment(seg: Segment): boolean {
  if (isComentaVehicleEngagementHook(seg)) return true
  const t = normalizeText(seg.text)
  if (/\bcomenta\b/.test(t)) return false
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasModelLikeToken =
    MODEL_LINE_REGEX.test(t) ||
    /\b[hx]?\d{1,3}\b/.test(t) ||
    /\b(prado|picanto|hilux|rio|elantra|accent|tiida|sentra|versa|march|sunny|altima|be\s?go|sportage|tucson|creta)\b/.test(
      t
    )
  if (hasYear && !hasBrand && !hasModelLikeToken) return false
  return hasBrand || hasYear || hasModelLikeToken
}

/** Primer corte del Reel: debe sonar marca + contexto (modelo o año), no solo "2012" ni solo "F-150" sin marca. */
function openingPresentationIsAdequate(seg: Segment | undefined): boolean {
  if (!seg) return false
  if (isComentaVehicleEngagementHook(seg)) return true
  const t = normalizeText(seg.text)
  const hasBrand = CAR_BRANDS.some((b) => t.includes(b))
  const hasYear = /\b(19|20)\d{2}\b/.test(t)
  const hasModel =
    MODEL_LINE_REGEX.test(seg.text) ||
    /\b[hx]?\d{1,3}\b/.test(t) ||
    /\b(prado|picanto|hilux|rio|elantra|accent|tiida|sentra|versa|march|sunny|altima|be\s?go|sportage|tucson|creta)\b/.test(
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

/**
 * Si el primer corte no cumple marca+modelo/año, intenta intercambiar con otro segmento ya en la lista
 * o insertar el mejor candidato no usado.
 *
 * Excepción: si los primeros N segmentos consecutivos son todos de presentación y entre ellos
 * cubren marca + modelo/año (e.g. "Toyota" + "Prado" + "2016"), se acepta el grupo tal cual.
 */
function strengthenOpeningPresentation(
  sequence: SequenceItem[],
  segmentLookup: Map<string, Segment>,
  allSegments: Segment[],
  jobId: string
): SequenceItem[] {
  if (sequence.length === 0) return sequence
  const firstSeg = segmentLookup.get(sequence[0].segment_id)
  if (openingPresentationIsAdequate(firstSeg)) return sequence

  // Verificar si los primeros clips de presentación forman juntos una apertura completa
  // (e.g. clip "Toyota" + clip "Prado" + clip "2016")
  const openingGroup: string[] = []
  for (const item of sequence) {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg || !isPresentationSegment(seg)) break
    openingGroup.push(normalizeText(seg.text))
  }
  if (openingGroup.length >= 2) {
    const combined = openingGroup.join(' ')
    const hasBrand = CAR_BRANDS.some((b) => combined.includes(b))
    const hasYear = /\b(19|20)\d{2}\b/.test(combined)
    const hasModel = MODEL_LINE_REGEX.test(combined) ||
      /\b(prado|picanto|hilux|rio|elantra|accent|tiida|sentra|versa|march|sunny|altima|be\s?go|sportage|tucson|creta)\b/.test(combined)
    if (hasBrand && (hasYear || hasModel)) {
      console.log(
        `[VideoV2Pipeline][${jobId}][Gemini] Apertura: grupo de ${openingGroup.length} micro-clips de presentación aceptado (marca+modelo/año combinados).`
      )
      return sequence
    }
  }

  for (let j = 1; j < sequence.length; j++) {
    const sj = segmentLookup.get(sequence[j].segment_id)
    if (sj && openingPresentationIsAdequate(sj)) {
      const tmp = sequence[0]
      sequence[0] = sequence[j]!
      sequence[j] = tmp
      console.warn(
        `[VideoV2Pipeline][${jobId}][Gemini] Apertura: se reordenó el primer corte para incluir marca+modelo/audio más completo (${sj.segment_id}).`
      )
      return sequence
    }
  }

  const used = new Set(sequence.map((x) => x.segment_id))
  const candidates = allSegments
    .filter(
      (s) =>
        !used.has(s.segment_id) &&
        s.source_kind !== 'visual_only' &&
        !isMistakeSegment(s) &&
        !isEndCtaSegment(s) &&
        openingPresentationIsAdequate(s)
    )
    .sort((a, b) => b.duration_s - a.duration_s)

  const pick = candidates[0]
  if (pick) {
    const rest = sequence.filter((_, idx) => idx !== 0)
    const merged = [sequenceItemFromSegment(pick, 1, 'apertura: marca+modelo/año (sustituye primer corte débil)'), ...rest]
    console.warn(
      `[VideoV2Pipeline][${jobId}][Gemini] Apertura: primer corte sustituido por ${pick.segment_id} (marca+modelo/año).`
    )
    return merged
  }

  console.warn(
    `[VideoV2Pipeline][${jobId}][Gemini] Apertura: no se encontró segmento alternativo con marca+modelo/año; revisa el mapa o el guion.`
  )
  return sequence
}

function isEndCtaSegment(seg: Segment): boolean {
  const t = normalizeText(seg.text)
  if (/solo aqui|ksi nuevos|casi nuevos/.test(t)) return true
  if (/te pasamos|te enviamos|te mandamos/.test(t)) return true
  if (/\bcomenta\b/.test(t)) {
    if (isComentaVehicleEngagementHook(seg)) return false
    return true
  }
  return false
}

/** true si el segmento es un "comenta" de cierre (redes), no el gancho "comenta este Prado". */
function isCtaCallToActionTrigger(seg: Segment): boolean {
  if (isComentaVehicleEngagementHook(seg)) return false
  const t = normalizeText(seg.text)
  return /\bcomenta\b/.test(t)
}

/** Dentro del bloque "cierre", prioridad creciente: info intermedia → comenta redes → marca Ksi/Casi Nuevos al final. */
function outroClosingStrength(seg: Segment | undefined): number {
  if (!seg) return 0
  const t = normalizeText(seg.text)
  if (/solo aqui|ksi nuevos|casi nuevos/.test(t)) return 3
  if (/\bcomenta\b/.test(t)) return 2
  if (/informacion|información|whatsapp|redes|siguenos|síguenos|mas info|más info|dm\b/.test(t)) return 1
  return 0
}

function introOpeningStrength(seg: Segment | undefined): number {
  if (!seg) return 0
  return openingPresentationIsAdequate(seg) ? 2 : isPresentationSegment(seg) ? 1 : 0
}

function enforceEditorialOrder(sequence: SequenceItem[], allSegments: Segment[]): SequenceItem[] {
  const lookup = new Map(allSegments.map((s) => [s.segment_id, s] as const))
  const intro: SequenceItem[] = []
  const middle: SequenceItem[] = []
  const outro: SequenceItem[] = []

  for (const item of sequence) {
    const seg = lookup.get(item.segment_id)
    if (!seg) {
      middle.push(item)
      continue
    }
    if (isEndCtaSegment(seg)) outro.push(item)
    else if (isPresentationSegment(seg)) intro.push(item)
    else middle.push(item)
  }

  intro.sort(
    (a, b) => introOpeningStrength(lookup.get(b.segment_id)) - introOpeningStrength(lookup.get(a.segment_id))
  )
  outro.sort((a, b) => {
    const sa = lookup.get(a.segment_id)
    const sb = lookup.get(b.segment_id)
    const byStrength = outroClosingStrength(sa) - outroClosingStrength(sb)
    if (byStrength !== 0) return byStrength
    const aIsTrigger = sa ? isCtaCallToActionTrigger(sa) : false
    const bIsTrigger = sb ? isCtaCallToActionTrigger(sb) : false
    if (aIsTrigger && !bIsTrigger) return -1
    if (!aIsTrigger && bIsTrigger) return 1
    return 0
  })

  return [...intro, ...middle, ...outro]
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

/**
 * True si dos segmentos son la misma frase (tomas repetidas), p.ej. dos clips distintos diciendo "con amplio espacio".
 * False si solo comparten nombre de modelo (presentación vs CTA distinto).
 */
function isSameUtterance(textA: string, textB: string): boolean {
  const na = normalizeForDedupe(textA)
  const nb = normalizeForDedupe(textB)
  if (!na || !nb) return false
  if (na === nb) return true

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
  const na = normalizeForDedupe(textA)
  const nb = normalizeForDedupe(textB)
  if (na.length < 12 || nb.length < 12) return false
  const short = na.length <= nb.length ? na : nb
  const long = na.length > nb.length ? na : nb
  if (long.includes(short) && short.length >= 14) return true
  return stringSimilarity(na, nb) >= 0.88
}

function dedupeSequenceByUtterance(
  sequence: SequenceItem[],
  segmentLookup: Map<string, Segment>,
  jobId: string
): SequenceItem[] {
  const kept: SequenceItem[] = []
  const keptTexts: string[] = []

  for (const item of sequence) {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) {
      kept.push(item)
      continue
    }
    const text = seg.text
    if (keptTexts.some((t) => isSameUtterance(t, text))) {
      console.warn(
        `[VideoV2Pipeline][${jobId}][Gemini] Dedupe: descartando ${item.segment_id} (misma frase que un clip ya elegido)`
      )
      continue
    }
    kept.push(item)
    keptTexts.push(text)
  }
  return kept
}

/** Tras el orden editorial, evita dos cortes seguidos casi idénticos (Gemini a veces repite la misma idea). */
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
      if (isSameUtterance(prevSeg.text, seg.text) || consecutiveNearDuplicateUtterance(prevSeg.text, seg.text)) {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Gemini] Dedupe consecutivo: descartando ${item.segment_id} (muy similar al corte anterior)`
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
  /** Si true, no se normaliza visual_overlay (modo VO manual: sin B-roll decidido por Gemini). */
  disableVisualOverlayNormalization?: boolean
  /** Si está definido, se valida y devuelve voice_over_insert_after_count en el resultado. */
  manualVoiceOverBaseClipIndex?: number
  /** VO desde MP3: mismas reglas de inserción que VO manual sin clip base. */
  manualVoiceOverFromExternalAudio?: boolean
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
 * Ajusta dónde va el bloque VO: Gemini propone `voice_over_insert_after_count`; se acota para que
 * haya al menos un corte antes y otro después cuando hay material suficiente, respetando presentación
 * al inicio y CTA antes del cierre. Opcionalmente se alinea el punto de inserción al 30–65 % del tiempo
 * narrativo para evitar que el VO abra o cierre el Reel por conteo de cortes engañoso.
 */
function finalizeVoiceOverInsertPlacement(
  sequence: SequenceItem[],
  segmentLookup: Map<string, Segment>,
  requested: number,
  jobId: string
): number {
  const n = sequence.length
  if (n === 0) return 0

  let m = Math.max(0, Math.min(Math.floor(requested), n))

  const firstSeg = segmentLookup.get(sequence[0].segment_id)
  const firstIsPresentation = firstSeg ? isPresentationSegment(firstSeg) : false

  let firstCtaIndex = -1
  for (let i = 0; i < n; i++) {
    const seg = segmentLookup.get(sequence[i].segment_id)
    if (seg && isEndCtaSegment(seg)) {
      firstCtaIndex = i
      break
    }
  }

  // ── Cotas duras ──────────────────────────────────────────────────────────
  let minI = 0
  if (firstIsPresentation) minI = 1
  if (n >= 2) minI = Math.max(minI, 1)

  let maxI = n
  if (firstCtaIndex >= 0) maxI = firstCtaIndex
  if (n >= 2) maxI = Math.min(maxI, n - 1)

  if (minI > maxI) {
    console.warn(
      `[VideoV2Pipeline][${jobId}][Gemini] VO insert: conflicto min (${minI}) vs max (${maxI}); se usa max (CTA tras VO).`
    )
    return maxI
  }

  m = Math.max(minI, Math.min(m, maxI))

  // ── Heurística temporal: 30–65 % del tiempo narrativo ────────────────────
  const rangeSize = maxI - minI
  if (rangeSize >= 2) {
    const totalDur = sequence.reduce((s, x) => s + x.trim_duration, 0)
    if (totalDur > 0) {
      const TARGET_LOW = 0.3
      const TARGET_HIGH = 0.65

      let acc = 0
      let idealMin = minI
      let idealMax = maxI

      for (let i = 0; i < maxI; i++) {
        acc += sequence[i].trim_duration
        if (acc / totalDur >= TARGET_LOW) {
          idealMin = Math.max(minI, i + 1)
          break
        }
      }

      acc = 0
      for (let i = 0; i < maxI; i++) {
        acc += sequence[i].trim_duration
        if (acc / totalDur >= TARGET_HIGH) {
          idealMax = Math.min(maxI, i + 1)
          break
        }
      }

      if (idealMin <= idealMax) {
        const prev = m
        m = Math.max(idealMin, Math.min(m, idealMax))
        if (m !== prev) {
          console.log(
            `[VideoV2Pipeline][${jobId}][Gemini] VO insert: ajuste temporal ${prev} → ${m} ` +
              `(${((sequence.slice(0, m).reduce((s, x) => s + x.trim_duration, 0) / totalDur) * 100).toFixed(0)}% del tiempo narrativo)`
          )
        }
      }
    }
  }

  if (n >= 4 && firstIsPresentation && firstCtaIndex >= 0 && m < 2 && maxI >= 2) {
    const target = Math.min(2, maxI)
    if (target > m) {
      console.log(
        `[VideoV2Pipeline][${jobId}][Gemini] VO insert: se prefiere al menos 2 cortes antes del VO (presentación + desarrollo); ${m} → ${target}`
      )
      m = target
    }
  }

  if (requested === 0 && n >= 3 && !firstIsPresentation && maxI >= 1) {
    m = Math.max(m, 1)
  }
  if (m !== requested) {
    console.warn(
      `[VideoV2Pipeline][${jobId}][Gemini] voice_over_insert_after_count ajustado ${requested} → ${m} (arco: presentación → VO → CTA)`
    )
  }
  return m
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
          `[VideoV2Pipeline][${jobId}][Gemini] segment_id desconocido "${item.segment_id}", se descarta.`
        )
        return false
      }
      if (excluded.includes(seg.clip_index)) {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Gemini] Se descarta ${item.segment_id} (clip ${seg.clip_index} excluido del montaje Gemini).`
        )
        return false
      }
      return !isMistakeSegment(seg)
    })
    .filter((item) => {
      const seg = segmentLookup.get(item.segment_id)
      if (seg?.source_kind === 'visual_only') {
        console.warn(
          `[VideoV2Pipeline][${jobId}][Gemini] Se descarta ${item.segment_id} como corte principal (clip B-roll sin habla).`
        )
        return false
      }
      return true
    })

  // 2) Forzar cortes exactos al segmento para no romper palabras
  sequence = sequence.map((item) => {
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) return item
    return {
      ...item,
      trim_start: seg.start_s,
      trim_end: seg.end_s,
      trim_duration: Number((seg.end_s - seg.start_s).toFixed(3)),
    }
  })

  // 2b) Ajustar / validar superposición B-roll + voz en off
  if (opts?.disableVisualOverlayNormalization) {
    sequence = sequence.map((item) => ({ ...item, visual_overlay: undefined }))
  } else {
    sequence = normalizeVisualOverlaysInSequence(sequence, kinds, allSegments, jobId)
  }

  // 3) Permitir micro-segmentos de presentación; descartar ultra-cortos que no aportan
  const before = sequence.length
  sequence = sequence.filter((item) => {
    if (item.trim_duration >= 0.8) return true
    const seg = segmentLookup.get(item.segment_id)
    if (!seg) return false
    return isPresentationSegment(seg) && item.trim_duration >= 0.15
  })
  if (sequence.length < before) {
    console.log(
      `[VideoV2Pipeline][${jobId}][Gemini] Se eliminaron ${before - sequence.length} segmentos ultra-cortos (<0.8s no-presentación)`
    )
  }

  // 4) Deduplicar en el orden de Gemini (antes de reordenar): así conservamos la toma que el modelo
  //    consideró más relevante, no la que quedó primero tras el reordenamiento editorial.
  sequence = dedupeSequenceByUtterance(sequence, segmentLookup, jobId)

  // 4b) Orden editorial + dedupe de vecinos casi iguales
  sequence = enforceEditorialOrder(sequence, allSegments)
  sequence = dedupeConsecutiveNearDuplicates(sequence, segmentLookup, jobId)

  // 4c) Primer corte: debe incluir marca y modelo o año (evita solo "2012" o "F-150" sin marca en mapa)
  sequence = strengthenOpeningPresentation(sequence, segmentLookup, allSegments, jobId)

  // 4d) Forzar micro-clips de presentación que Gemini ignoró (ej. "Toyota", "Prado", "2016" por separado)
  //     Si existen segmentos de presentación ≥ 0.15s no incluidos por Gemini, se insertan al inicio en
  //     orden de aparición (clip_index, luego start_s), pero solo si no están ya en la secuencia.
  {
    const usedIds = new Set(sequence.map((x) => x.segment_id))
    const missedPresentation = allSegments
      .filter(
        (s) =>
          !usedIds.has(s.segment_id) &&
          s.source_kind !== 'visual_only' &&
          !isMistakeSegment(s) &&
          isPresentationSegment(s) &&
          s.duration_s >= 0.15 &&
          !(excluded.includes(s.clip_index))
      )
      .sort((a, b) => a.clip_index - b.clip_index || a.start_s - b.start_s)

    if (missedPresentation.length > 0) {
      const injected = missedPresentation.map((s, idx) =>
        sequenceItemFromSegment(s, idx + 1, 'micro-clip presentación forzado al inicio')
      )
      console.log(
        `[VideoV2Pipeline][${jobId}][Gemini] Se inyectan ${injected.length} micro-clips de presentación omitidos por Gemini: ` +
          injected.map((x) => x.segment_id).join(', ')
      )
      // Insertar al frente, antes del resto de la secuencia
      sequence = [...injected, ...sequence]
      // Re-aplicar orden editorial para asegurar que presenten antes que middle/outro
      sequence = enforceEditorialOrder(sequence, allSegments)
    }
  }

  // 5) Duración: no se insertan clips extra por debajo de 20s (evita material ajeno al montaje elegido).
  let totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
  if (totalDuration < 20) {
    console.log(
      `[VideoV2Pipeline][${jobId}][Gemini] Duración total ${totalDuration.toFixed(1)}s (<20s): ` +
        'se mantiene el montaje sin añadir segmentos de relleno.'
    )
  }

  // 6) Si quedó muy largo: reels cortos (VO manual vs autónomo) o reels muy largos (>92s)
  const isManualVoMode =
    opts?.manualVoiceOverBaseClipIndex != null || opts?.manualVoiceOverFromExternalAudio === true
  const shortSoftCap = isManualVoMode ? 22 : 33
  const shortHardCap = isManualVoMode ? 25 : 36
  const REEL_TRIM_TRIGGER_SEC = 92
  const REEL_TRIM_TARGET_SEC = 88
  const REEL_LAST_SEGMENT_MIN_SEC = 0.22

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
  } else if (totalDuration > shortHardCap && sequence.length > 0) {
    for (let i = sequence.length - 1; i >= 0 && totalDuration > shortSoftCap; i--) {
      const seg = segmentLookup.get(sequence[i].segment_id)
      if (seg && !isEndCtaSegment(seg) && !isPresentationSegment(seg)) {
        totalDuration -= sequence[i].trim_duration
        sequence.splice(i, 1)
      }
    }
    totalDuration = Number(totalDuration.toFixed(3))

    if (totalDuration > shortHardCap && sequence.length > 0) {
      const last = sequence[sequence.length - 1]
      const excess = totalDuration - shortSoftCap
      last.trim_duration = Number(Math.max(0.8, last.trim_duration - excess).toFixed(3))
      last.trim_end = Number((last.trim_start + last.trim_duration).toFixed(3))
      if (last.visual_overlay) {
        last.visual_overlay = {
          ...last.visual_overlay,
          trim_end: Number((last.visual_overlay.trim_start + last.trim_duration).toFixed(3)),
        }
      }
      totalDuration = Number(sequence.reduce((sum, item) => sum + item.trim_duration, 0).toFixed(3))
    }
  }

  sequence.forEach((item, i) => { item.order = i + 1 })

  let voiceOverInsertAfter: number | undefined
  if (opts?.manualVoiceOverBaseClipIndex != null || opts?.manualVoiceOverFromExternalAudio === true) {
    const rawInsert = coerceVoiceOverInsertAfterCount(raw, sequence.length)
    voiceOverInsertAfter = finalizeVoiceOverInsertPlacement(sequence, segmentLookup, rawInsert, jobId)
  }

  return {
    sequence,
    total_duration: totalDuration,
    overall_strategy: raw.overall_strategy,
    ...(typeof voiceOverInsertAfter === 'number' ? { voice_over_insert_after_count: voiceOverInsertAfter } : {}),
  }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const AUTONOMOUS_EDIT_BLOCK = `
MONTAJE 100% AUTOMÁTICO:
- Nadie más va a reordenar: tu JSON es la timeline final del Reel.
- Usa el CATÁLOGO (transcripciones y tipos de clip) + lo que ves en los videos + el mapa de segmentos.
- Voz en off: si el clip con habla muestra poco (pantalla negra, tapado, solo audio útil), pon visual_overlay con el B-roll que mejor ilustre lo que se DICE en ese momento.
- Si hay varios clips "solo plano", elige el que mejor coincida tema a tema (motor vs interior vs exterior).
- Ritmo Reel/TikTok: cada corte debe aportar información NUEVA; NUNCA pongas dos segmentos seguidos que digan lo mismo o parafraseen la misma idea (ej. "con un diseño" y después "cuenta con un diseño" sobre el mismo tema).
- Orden: presentación (marca/modelo/año o "comenta este Prado 2016" como gancho) al inicio; CTA de cierre ("solo aquí en Ksi", "comenta abajo") al final — no inviertas gancho de auto con cierre.
- Reel llamativo: cada 2–4s debe haber cambio claro de imagen, dato o energía; evita planos estáticos largos sin mensaje nuevo.
- Evita sensación de hueco o negro prolongado: prioriza visual_overlay con B-roll alineado al audio; si un plano no aporta imagen, acorta el corte o cambia de segment_id en lugar de alargar silencio visual.
`

function manualVoiceOverMp3AutonomousBlock(): string {
  return `
BLOQUE VO DESDE ARCHIVO MP3 (no entra en "sequence"):
- El audio completo de la voz en off viene de un archivo de audio (MP3/WAV) ya subido; durante ese bloque el pipeline muestra solo vídeo de los clips indicados (o B-roll) con volumen 0% encima de ese audio.
- "sequence" solo contiene cortes de diálogo de clips que siguen en el mapa. NUNCA uses visual_overlay en "sequence".
`
}

function manualVoiceOverAutonomousBlock(voIdx: number): string {
  return `
BLOQUE VO MANUAL (no entra en "sequence"):
- Hay un clip reservado (índice ${voIdx}) cuyo audio completo irá una sola vez con planos sin habla (B-roll de AssemblyAI) encima; el pipeline intenta cubrir el audio con planos — elige B-roll temáticamente rico para minimizar huecos visuales. Ese clip NO está en el mapa de segmentos.
- "sequence" solo contiene cortes de diálogo de OTROS clips con habla (nunca clip ${voIdx}). NUNCA uses visual_overlay en "sequence".
- Debes respetar el arco narrativo del JSON (presentación del carro → desarrollo / VO → CTA) y fijar "voice_over_insert_after_count" en consecuencia.
- El PRIMER corte de "sequence" debe ser presentación clara (marca + modelo o año). El ÚLTIMO corte debe ser el cierre/CTA (comenta aquí, Ksi/Casi Nuevos, etc.). NO pongas el CTA antes que un clip que solo pide "comenta" el modelo del auto (eso es gancho, no cierre).
- En "sequence", cada corte debe aportar algo distinto: no pongas dos segmentos seguidos que repitan o parafraseen la misma idea (el sistema penaliza redundancia).
- Ritmo viral: cortes breves y contundentes antes y después del bloque VO; evita sensación de pantalla vacía.
`
}

const MANUAL_VO_ARCO_Y_JSON = `
ARCO NARRATIVO (prioridad alta; el sistema reordenará cortes por tipo, pero tú eliges cuántos van antes del bloque VO):
1) INICIO: presentación del vehículo (marca, modelo, año — ej. "Nissan Tiida 2012") si existe en el mapa. El PRIMER elemento de "sequence" debe ser ese tipo de corte cuando haya segment_id adecuado; es el ancla del Reel.
2) DESARROLLO: uno o varios cortes con habla (beneficios, precio, detalle) y/o el bloque VO en la parte MEDIA: el audio reservado explica mientras se ven solo planos (B-roll).
3) CIERRE: llamada a la acción o mensaje de marca ("comenta", "solo aquí en Ksi…") al FINAL del Reel — esos segmentos deben quedar en la parte DESPUÉS del bloque VO en la línea de tiempo.

CLAVE "voice_over_insert_after_count" (obligatoria en el JSON raíz):
- Entero entre 0 y longitud de "sequence": cuántos elementos de "sequence" se reproducen ANTES del bloque VO.
- El pipeline acota tu número: con 2 o más segmentos en "sequence", el bloque VO no debe abrir ni cerrar el Reel (queda al menos un corte antes y otro después), salvo conflictos raros de detección CTA.
- Todo CTA debe quedar después del bloque VO → el número debe ser ≤ índice del primer segmento tipo CTA en "sequence".
- Valores típicos: 1–3 (presentación + algo de desarrollo, luego VO en la parte media, luego más contenido + CTA al final). Evita 0 y evita sequence.length.
`

const BROLL_PROMPT_BLOCK = `
CLIPS SOLO VISUAL (B-ROLL / SIN HABLA):
- Los segmentos marcados [SOLO PLANO — NO USAR COMO AUDIO] NO tienen habla transcrita. NUNCA uses solo esos segment_id como fuente de audio de un corte.
- Cuando exista al menos un clip SOLO PLANO y el audio de un segmento hablado describa o sugiera esa imagen, DEBES preferir visual_overlay en lugar de mostrar solo el vídeo del clip de voz en off (si el emparejamiento es razonable).
- En el objeto de la secuencia añade "visual_overlay": { "clip_index": N, "trim_start": X, "trim_end": Y } con N = índice del clip solo visual, X/Y en segundos dentro de ese archivo; la duración (Y−X) debe coincidir con trim_duration del segmento hablado.
- Si ningún plano encaja bien, omite visual_overlay (se usará el vídeo del mismo clip que el audio).
- El campo "reason" debe mencionar el tema concreto (motor, interior, rines, etc.): el sistema usa eso para alinear planos con la voz en off reservada.
- clip_index del segmento principal siempre es el del clip CON HABLA de ese segment_id.
Ejemplo: {"segment_id":"0_2","clip_index":0,"trim_start":12.0,"trim_end":18.5,"trim_duration":6.5,"order":1,"reason":"voz en off motor + plano motor","visual_overlay":{"clip_index":3,"trim_start":2.0,"trim_end":8.5}}
`

function buildScriptGuidanceBlock(scriptGuidanceText?: string | null): string {
  const raw = scriptGuidanceText?.trim()
  if (!raw) return ''
  const capped =
    raw.length > 24000 ? `${raw.slice(0, 24000)}\n[… texto truncado para el modelo]` : raw
  return `=== GUION DE REFERENCIA (ORDEN EDITORIAL OBLIGATORIO) ===
IMPORTANTE: Los clips subidos contienen el audio/diálogo del guion — los vendedores grabaron los clips siguiendo este guion.
Tu tarea es MAPEAR cada sección del guion a los segment_id correspondientes del mapa y respetar el ORDEN del guion.

REGLAS SOBRE EL GUION:
1. SIGUE EL ORDEN del guion: la secuencia debe reflejar el flujo del guion (intro → desarrollo → cierre).
2. MAPEA cada bloque de texto del guion al segment_id cuya transcripción más se parezca a esa parte.
3. Si un segmento del mapa corresponde a una sección del guion, inclúyelo en ESA posición dentro de "sequence".
4. Si hay segmentos que no están en el guion (improvisaciones, errores), puedes descartarlos o incluirlos si aportan valor.
5. Si el guion tiene una sección que no encontraste en el mapa, no la inventes — simplemente omítela.
6. El guion es la ESTRUCTURA; el mapa de segmentos son los BLOQUES disponibles. Tú eres el editor que los une.

Texto del guion:
${capped}

=== FIN GUION ===`
}

function buildVisualPrompt(
  formattedSegmentMap: string,
  videoCount: number,
  clipKinds: VideoClipKind[],
  clipCatalog: string,
  manualVoiceOverBaseClipIndex?: number | null,
  scriptGuidanceText?: string | null,
  manualVoiceOverFromExternalAudio?: boolean
): string {
  const manual = manualVoiceOverBaseClipIndex != null || manualVoiceOverFromExternalAudio === true
  const videoRef = videoCount === 1 ? 'el video' : `los ${videoCount} videos`
  const plural = videoCount > 1 ? 's' : ''
  const brollExtra =
    !manual && clipKinds.some((k) => k === 'visual_only') ? BROLL_PROMPT_BLOCK : ''
  const autonomousBlock =
    manualVoiceOverBaseClipIndex != null
      ? manualVoiceOverAutonomousBlock(manualVoiceOverBaseClipIndex)
      : manualVoiceOverFromExternalAudio === true
        ? manualVoiceOverMp3AutonomousBlock()
        : AUTONOMOUS_EDIT_BLOCK
  const mapNote = manual
    ? manualVoiceOverBaseClipIndex != null
      ? 'Algunos clips no están en el mapa: el de voz en off reservado y los B-roll automáticos (ver catálogo).\n\n'
      : 'Algunos clips pueden estar reservados solo como planos sobre el audio MP3 de VO (ver catálogo).\n\n'
    : ''

  const scriptBlock = buildScriptGuidanceBlock(scriptGuidanceText)

  return `Eres un editor de video profesional especializado en crear Reels virales de venta de autos para Instagram y TikTok. Eres el mejor del mundo en esto. Tu objetivo es crear un Reel que detenga el scroll y genere engagement.

Acabas de ver ${videoRef} completo${plural}. Tienes el catálogo de transcripciones y tipos de clip, y el mapa fino de segmentos con timestamps EXACTOS.

${mapNote}${clipCatalog}
${scriptBlock ? `${scriptBlock}\n\n` : ''}
${autonomousBlock}

MAPA DE SEGMENTOS (cortes permitidos; respeta start_s/end_s de cada segment_id elegido):

${formattedSegmentMap}
${brollExtra}
REGLAS ABSOLUTAS DE CORTE:
1. NUNCA cortes a la mitad de una palabra o frase. Cada segmento debe empezar y terminar en una pausa natural del habla.
2. Usa EXACTAMENTE los trim_start y trim_end que correspondan al inicio y fin del segmento (start_s y end_s del mapa). NO modifiques los timestamps a menos que el segmento sea demasiado largo y necesites usar solo una parte (en ese caso, corta en una pausa natural entre palabras).
3. Objetivo de duración total: idealmente entre 20 y 32 segundos para Reels; si el material natural queda más corto, NO rellenes con trozos irrelevantes — prioriza coherencia sobre alargar.
4. Si detectas partes de error del vendedor (ej: "me equivoqué", "otra vez", "de nuevo"), descártalas.
5. Los segmentos de presentación de vehículo (marca/modelo/año) deben ir al INICIO. Un clip tipo "comenta este Toyota Prado 2016" es PRESENTACIÓN (gancho), no cierre: debe ir al inicio, no al final.
6. Los segmentos tipo CTA de cierre ("solo aquí en Ksi/Casi Nuevos", "comenta abajo", "síguenos") deben ir al FINAL — no confundas con "comenta" + nombre del carro + año.
7. El PRIMER segmento de "sequence" debe contener en su transcripción MARCA + (modelo o año), p. ej. "Ford F-150" o "Nissan Tiida 2012". Evita como primer corte solo el año ("2012") o solo modelo sin marca si en el mapa hay un segment_id más completo.
8. MODELO COMPLETO: mira el vídeo (emblema, parrilla, placa, pantalla) y la voz. Si el mapa parte el modelo (p. ej. un segmento termina en "H" y otro empieza en "1"), elige el segment_id que agrupe el nombre completo o el que ya diga "H1" / "X5" junto; en "reason" escribe el modelo tal cual lo venderías (ej. Hyundai H1), nunca truncado.


${manual
  ? `CRITERIOS (modo VO reservado — prioridad sobre el formato genérico de "gancho"):
- PRIMER corte: presentación del auto (marca/modelo/año, ej. Nissan Tiida 2012) si existe segmento adecuado en el mapa.
- MEDIO: desarrollo (precio, equipamiento, etc.); el bloque VO con B-roll encaja aquí (planos sin habla).
- CIERRE: CTA o mensaje de marca; debe quedar en los últimos cortes de sequence (después del bloque VO en la línea de tiempo).`
  : `CRITERIOS DE SELECCIÓN VISUAL (en orden de prioridad):
- GANCHO (primer segmento): Elige la toma más impactante visualmente + el texto más llamativo. Debe generar curiosidad o emoción en los primeros 2 segundos.
- Prioriza tomas donde el vendedor está frente a la cámara con buena energía
- Incluye tomas que muestren el auto desde ángulos atractivos
- Descarta: vendedor de espaldas, tomas borrosas, caminando sin hablar, silencios largos
- El cierre debe tener una llamada a la acción o dato memorable`}

ESTRUCTURA IDEAL${manual ? ' (el bloque VO suele ir en el tramo 2–3)' : ''}:
1. Presentación / gancho del vehículo (3-6s) → 2. Desarrollo (5-10s; aquí encaja el bloque VO con planos) → 3. Beneficios o precio (5-8s) → 4. Cierre con CTA (3-5s)

${manual ? MANUAL_VO_ARCO_Y_JSON : ''}
Responde SOLO con este JSON, sin markdown, sin explicaciones:
${manual
  ? '{"sequence":[{"segment_id":"1_1","clip_index":1,"trim_start":0,"trim_end":4.5,"trim_duration":4.5,"order":1,"reason":"Nissan Tiida 2012"},{"segment_id":"2_1","clip_index":2,"trim_start":1,"trim_end":5,"trim_duration":4,"order":2,"reason":"equipamiento"},{"segment_id":"2_2","clip_index":2,"trim_start":8,"trim_end":12,"trim_duration":4,"order":3,"reason":"motor"},{"segment_id":"1_5","clip_index":1,"trim_start":40,"trim_end":44,"trim_duration":4,"order":4,"reason":"CTA comenta"}],"total_duration":28,"overall_strategy":"Presentación, desarrollo, VO con planos, CTA final","voice_over_insert_after_count":2}'
  : '{"sequence":[{"segment_id":"0_2","clip_index":0,"trim_start":35.10,"trim_end":41.80,"trim_duration":6.70,"order":1,"reason":"gancho visual: vendedor energético frente al auto mencionando precio"}],"total_duration":28.00,"overall_strategy":"descripción breve de la estrategia editorial"}'}`
}

function buildTextOnlyPrompt(
  formattedSegmentMap: string,
  clipKinds: VideoClipKind[],
  clipCatalog: string,
  manualVoiceOverBaseClipIndex?: number | null,
  scriptGuidanceText?: string | null,
  manualVoiceOverFromExternalAudio?: boolean
): string {
  const manual = manualVoiceOverBaseClipIndex != null || manualVoiceOverFromExternalAudio === true
  const brollExtra =
    !manual && clipKinds.some((k) => k === 'visual_only') ? BROLL_PROMPT_BLOCK : ''
  const autonomousBlock =
    manualVoiceOverBaseClipIndex != null
      ? manualVoiceOverAutonomousBlock(manualVoiceOverBaseClipIndex)
      : manualVoiceOverFromExternalAudio === true
        ? manualVoiceOverMp3AutonomousBlock()
        : AUTONOMOUS_EDIT_BLOCK
  const mapNote = manual
    ? manualVoiceOverBaseClipIndex != null
      ? 'Algunos clips no están en el mapa: el de voz en off reservado y los B-roll automáticos (ver catálogo).\n\n'
      : 'Algunos clips pueden estar reservados solo como planos sobre el audio MP3 de VO (ver catálogo).\n\n'
    : ''

  const scriptBlock = buildScriptGuidanceBlock(scriptGuidanceText)

  return `Eres un editor de video profesional especializado en crear Reels virales de venta de autos para Instagram y TikTok. Eres el mejor del mundo en esto.

Tienes el catálogo de clips y el mapa de segmentos. Sin ver vídeo, infiere el mejor orden${manual ? ' y la posición del bloque VO (voice_over_insert_after_count)' : ' y cuándo usar visual_overlay si hay solo planos'}.

${mapNote}${clipCatalog}
${scriptBlock ? `${scriptBlock}\n\n` : ''}
${autonomousBlock}

MAPA DE SEGMENTOS (silencios eliminados):

${formattedSegmentMap}
${brollExtra}
REGLAS ABSOLUTAS DE CORTE:
1. NUNCA cortes a la mitad de una palabra o frase. Cada segmento debe empezar y terminar en una pausa natural.
2. Usa EXACTAMENTE los trim_start y trim_end del segmento (start_s y end_s del mapa). NO inventes timestamps.
3. Duración total: apunta a 25–32s si el material da; si no, no rellenes con contenido débil.
4. Puedes usar segmentos cortos si aportan valor (incluso alrededor de 1 segundo) siempre que no corten palabras.
5. Si detectas partes de error del vendedor (ej: "me equivoqué", "otra vez", "de nuevo"), descártalas.
6. Los segmentos de presentación de vehículo (marca/modelo/año) deben ir al INICIO. "Comenta este Toyota Prado 2016" es presentación/gancho, no CTA de cierre.
7. Los segmentos tipo CTA de cierre ("solo aquí en Ksi/Casi Nuevos", "comenta abajo", "síguenos") van al FINAL — no confundas con "comenta" + nombre del carro + año.
8. El PRIMER segmento de "sequence" debe incluir MARCA + (modelo o año) en el texto del mapa; no uses solo año o solo modelo sin marca como apertura si existe un segment_id mejor.
9. MODELO COMPLETO: infiere del catálogo y del texto del mapa el modelo entero (H1, X5, 320d, etc.); en "reason" del primer corte escribe marca+modelo completos, sin truncar dígitos.

${manual
  ? `CRITERIOS (modo VO reservado):
- Primer corte: presentación marca/modelo/año si el mapa lo permite.
- Bloque VO en la parte media salvo mapa muy corto.
- Últimos cortes: CTA o marca.`
  : `CRITERIOS DE SELECCIÓN:
- GANCHO (primer segmento): La frase más impactante, una pregunta, un precio, algo que detenga el scroll
- Puedes reordenar segmentos: no importa el orden original del video
- Puedes usar segmentos del mismo clip de forma discontinua
- Descarta: presentaciones aburridas, muletillas, repeticiones, silencios`}

ESTRUCTURA IDEAL${manual ? ' (bloque VO en desarrollo)' : ''}:
1. Presentación del vehículo (3-6s) → 2. Desarrollo (5-10s; bloque VO con planos) → 3. Beneficios/precio (5-8s) → 4. Cierre CTA (3-5s)

${manual ? MANUAL_VO_ARCO_Y_JSON : ''}
Responde SOLO con este JSON, sin markdown, sin explicaciones:
${manual
  ? '{"sequence":[{"segment_id":"1_1","clip_index":1,"trim_start":0,"trim_end":4.5,"trim_duration":4.5,"order":1,"reason":"Nissan Tiida 2012"},{"segment_id":"2_1","clip_index":2,"trim_start":1,"trim_end":5,"trim_duration":4,"order":2,"reason":"equipamiento"},{"segment_id":"2_2","clip_index":2,"trim_start":8,"trim_end":12,"trim_duration":4,"order":3,"reason":"motor"},{"segment_id":"1_5","clip_index":1,"trim_start":40,"trim_end":44,"trim_duration":4,"order":4,"reason":"CTA"}],"total_duration":28,"overall_strategy":"Arco completo con VO central","voice_over_insert_after_count":2}'
  : '{"sequence":[{"segment_id":"0_2","clip_index":0,"trim_start":35.10,"trim_end":41.80,"trim_duration":6.70,"order":1,"reason":"gancho: pregunta directa sobre el auto"}],"total_duration":28.00,"overall_strategy":"descripción breve de la estrategia"}'}`
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
}

/**
 * Envía el mapa de segmentos a Gemini, opcionalmente con los videos reales
 * subidos al File API de Google para análisis visual + textual.
 *
 * @param formattedSegmentMap  Mapa de segmentos formateado en texto
 * @param allSegments          Array de todos los segmentos para validación
 * @param jobId                ID del job para logging
 * @param googleFileRefs       Referencias a videos en el File API de Google (vacío = solo texto)
 * @param useVisualAnalysis    true = enviar videos + texto, false = solo texto
 */
export async function analyzeSegments(
  formattedSegmentMap: string,
  allSegments: Segment[],
  jobId: string,
  googleFileRefs: GoogleFileRef[] = [],
  useVisualAnalysis: boolean = false,
  clipKinds: VideoClipKind[] = [],
  options?: AnalyzeSegmentsOptions
): Promise<GeminiSegmentAnalysis> {
  const mode = useVisualAnalysis && googleFileRefs.length > 0 ? 'visual+texto' : 'solo texto'
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
  const validateOpts: ValidateGeminiSequenceOptions | undefined =
    manualVo != null
      ? {
          excludeClipIndicesFromSequence: [manualVo],
          disableVisualOverlayNormalization: true,
          manualVoiceOverBaseClipIndex: manualVo,
        }
      : externalVo
        ? {
            excludeClipIndicesFromSequence: options?.excludeClipIndicesFromSequence ?? [],
            disableVisualOverlayNormalization: true,
            manualVoiceOverFromExternalAudio: true,
          }
        : undefined
  console.log(`[VideoV2Pipeline][${jobId}][Gemini] Analizando ${allSegments.length} segmentos (modo: ${mode})`)

  const genAI = getGenAI()
  const selectedModel = (useVisualAnalysis && googleFileRefs.length > 0) ? MODEL_VISUAL : MODEL_TEXT
  const model = genAI.getGenerativeModel({ model: selectedModel })

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const strictSuffix = attempt > 1
        ? '\n\nIMPORTANTE: Responde SOLO con el JSON, sin texto adicional, sin bloques de código, sin explicaciones.'
        : ''

      let contentParts: Parameters<typeof model.generateContent>[0]

      if (useVisualAnalysis && googleFileRefs.length > 0) {
        const prompt =
          buildVisualPrompt(
            formattedSegmentMap,
            googleFileRefs.length,
            kindsForPrompt,
            clipCatalog,
            manualVo ?? null,
            scriptGuidance,
            externalVo
          ) + strictSuffix
        contentParts = [
          ...googleFileRefs.map((ref) => ({
            fileData: { mimeType: ref.mimeType, fileUri: ref.fileUri },
          })),
          { text: prompt },
        ]
      } else {
        contentParts =
          buildTextOnlyPrompt(
            formattedSegmentMap,
            kindsForPrompt,
            clipCatalog,
            manualVo ?? null,
            scriptGuidance,
            externalVo
          ) + strictSuffix
      }

      const result = await Promise.race([
        model.generateContent(contentParts),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
        ),
      ])

      const rawText = result.response.text()
      console.log(`[VideoV2Pipeline][${jobId}][Gemini] Respuesta (${rawText.length} chars, modo: ${mode})`)

      const jsonStr = extractJsonObject(rawText)
      const parsed = JSON.parse(jsonStr) as GeminiSegmentAnalysis
      const validated = validateSequence(parsed, allSegments, jobId, clipKinds, validateOpts)

      const voIns = validated.voice_over_insert_after_count
      const voInsNote =
        typeof voIns === 'number' ? `, voice_over_insert_after_count=${voIns}` : ''
      console.log(
        `[VideoV2Pipeline][${jobId}][Gemini] Secuencia validada: ${validated.sequence.length} segmentos, ${validated.total_duration.toFixed(1)}s total${voInsNote}`
      )

      return validated
    } catch (err) {
      if (attempt > MAX_RETRIES) {
        throw new Error(`[VideoV2Pipeline][${jobId}][Gemini] Error analizando segmentos tras ${MAX_RETRIES + 1} intentos: ${err}`)
      }
      console.warn(`[VideoV2Pipeline][${jobId}][Gemini] Reintento ${attempt}: ${err}`)
      await sleep(3000 * attempt)
    }
  }

  throw new Error('Gemini no pudo analizar los segmentos')
}
