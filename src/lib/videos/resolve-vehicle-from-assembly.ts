import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Segment } from './segmenter'
import { jaccardSimilarity, normalizeForMatch, wordFuzzyMatches } from './subtitle-screen-text'

const MIN_INVENTORY_MATCH = 0.12
const MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT = 0.08

/** Artículos/preposiciones: no deben sumar score contra tokens de modelo (la→land). */
const INVENTORY_STOPWORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'es', 'la', 'las', 'le', 'les',
  'lo', 'los', 'me', 'mi', 'no', 'o', 'para', 'por', 'que', 'se', 'si', 'su', 'sus',
  'te', 'tu', 'u', 'un', 'una', 'unos', 'unas', 'y', 'ya',
])

type InventoryCandidate = {
  id: string
  brand: string
  model: string
  year: number | null
}

export type ResolvedInventoryVehicle = {
  vehicleId: string
  brand: string
  model: string
  year: string
  score: number
  brandMentionTimeSec?: number
}

function transcriptFromSegments(segments: Segment[]): string {
  const parts: string[] = []
  for (const s of segments) {
    if (s.source_kind === 'visual_only') continue
    const t = s.text?.trim()
    if (t) parts.push(t)
    for (const w of s.words ?? []) {
      const wt = w.text?.trim()
      if (wt) parts.push(wt)
    }
  }
  return parts.join(' ')
}

function isInventoryStopword(word: string): boolean {
  return INVENTORY_STOPWORDS.has(normalizeForMatch(word))
}

/**
 * Fuzzy estricto solo para inventario (no usar en subtítulos).
 * Evita "la"→"land" y exige coincidencia exacta en tokens numéricos de modelo (2008).
 */
function inventoryModelTokenMatches(assemblyWord: string, modelToken: string): boolean {
  const a = normalizeForMatch(assemblyWord)
  const k = normalizeForMatch(modelToken)
  if (!a || !k) return false
  if (isInventoryStopword(a)) return false

  if (/^\d{3,4}$/.test(k)) return a === k

  if (a === k) return true
  if (a.length < 3) return false
  if (a.length < k.length * 0.6 && (a.length < 4 || !k.includes(a))) return false

  return wordFuzzyMatches(a, k)
}

function brandMentionedInTranscript(brandNorm: string, transcriptWords: string[]): boolean {
  if (brandNorm.length < 3) return false
  for (const w of transcriptWords) {
    if (isInventoryStopword(w)) continue
    if (wordFuzzyMatches(w, brandNorm)) return true
  }
  return false
}

/** Tokens de modelo: incluye números (2008, 3008) + primeras palabras alfabéticas. */
function modelSearchTokens(model: string): string[] {
  const raw = normalizeForMatch(model).split(' ').filter(Boolean)
  const tokens: string[] = []

  for (const w of raw) {
    if (/^\d{3,4}$/.test(w)) {
      tokens.push(w)
      break
    }
  }

  for (const w of raw) {
    if (w.length >= 3 && !/^\d/.test(w)) tokens.push(w)
    if (tokens.length >= 3) break
  }

  return [...new Set(tokens)]
}

function brandsMentionedInTranscript(
  transcriptWords: string[],
  candidates: InventoryCandidate[]
): Set<string> {
  const mentioned = new Set<string>()
  const uniqueBrands = [
    ...new Set(candidates.map((c) => normalizeForMatch(c.brand)).filter((b) => b.length >= 3)),
  ]

  for (const brandNorm of uniqueBrands) {
    if (brandMentionedInTranscript(brandNorm, transcriptWords)) {
      mentioned.add(brandNorm)
    }
  }
  return mentioned
}

function transcriptYearTokens(words: string[]): string[] {
  return words.filter((w) => /^(19|20)\d{2}$/.test(w))
}

function candidateBrandInMentionedSet(
  brandNorm: string,
  mentionedBrands: Set<string>
): boolean {
  if (mentionedBrands.has(brandNorm)) return true
  for (const mb of mentionedBrands) {
    if (wordFuzzyMatches(brandNorm, mb)) return true
  }
  return false
}

function scoreVehicleAgainstTranscript(
  transcript: string,
  vehicle: InventoryCandidate,
  mentionedBrands: Set<string>,
  vehicleIdHint?: string | null
): number {
  const normTranscript = normalizeForMatch(transcript)
  if (!normTranscript) return 0

  const brand = vehicle.brand.trim()
  const model = vehicle.model.trim()
  const fullName = `${brand} ${model}`

  let score = jaccardSimilarity(transcript, fullName)

  const transcriptWords = normTranscript.split(' ').filter(Boolean)
  const brandNorm = normalizeForMatch(brand)

  if (brandNorm.length >= 2) {
    for (const w of transcriptWords) {
      if (isInventoryStopword(w)) continue
      if (wordFuzzyMatches(w, brandNorm)) score += 0.18
    }
  }

  for (const token of modelSearchTokens(model)) {
    for (const w of transcriptWords) {
      if (isInventoryStopword(w)) continue
      if (/^\d{3,4}$/.test(token)) {
        if (w === token) score += 0.38
        continue
      }
      if (inventoryModelTokenMatches(w, token)) score += 0.28
      if (
        token.length >= 4 &&
        w.length >= 4 &&
        (token.includes(w) || w.includes(token))
      ) {
        score += 0.12
      }
    }
  }

  const normFull = normalizeForMatch(fullName)
  if (normFull.length >= 4) {
    if (normTranscript.includes(normFull)) score += 0.35
    else if (normFull.includes(normTranscript.slice(0, Math.min(24, normTranscript.length)))) {
      score += 0.2
    }
  }

  const yearTokens = transcriptYearTokens(transcriptWords)
  if (vehicle.year != null) {
    const yearStr = String(vehicle.year)
    if (yearTokens.length > 0) {
      if (yearTokens.includes(yearStr)) score += 0.12
      else score -= 0.25
    } else if (transcriptWords.includes(yearStr)) {
      score += 0.08
    }
  }

  if (mentionedBrands.size > 0 && brandNorm.length >= 3) {
    if (!candidateBrandInMentionedSet(brandNorm, mentionedBrands)) {
      score -= 0.55
    }
  }

  if (vehicleIdHint && vehicle.id === vehicleIdHint) score += 0.45

  return score
}

function findBrandMentionTimeSec(
  segments: Segment[],
  brand: string,
  model: string
): number | undefined {
  const brandNorm = normalizeForMatch(brand)
  const modelTokens = modelSearchTokens(model)

  for (const seg of segments) {
    if (seg.source_kind === 'visual_only') continue
    for (const w of seg.words ?? []) {
      const wt = w.text?.trim()
      if (!wt || isInventoryStopword(wt)) continue
      if (brandNorm.length >= 3 && wordFuzzyMatches(wt, brandNorm)) {
        return Number((w.start / 1000).toFixed(3))
      }
    }
  }

  for (const seg of segments) {
    if (seg.source_kind === 'visual_only') continue
    for (const w of seg.words ?? []) {
      const wt = w.text?.trim()
      if (!wt || isInventoryStopword(wt)) continue
      for (const token of modelTokens) {
        if (/^\d{3,4}$/.test(token)) {
          if (normalizeForMatch(wt) === token) {
            return Number((w.start / 1000).toFixed(3))
          }
        } else if (inventoryModelTokenMatches(wt, token)) {
          return Number((w.start / 1000).toFixed(3))
        }
      }
    }
  }

  return undefined
}

async function fetchInventoryCandidates(
  supabase: SupabaseClient<Database>,
  vehicleIdHint?: string | null
): Promise<InventoryCandidate[]> {
  const { data, error } = await supabase
    .from('inventoryoracle')
    .select('id, brand, model, year')
    .eq('status', 'disponible')
    .order('updated_at', { ascending: false })
    .limit(120)

  if (error) {
    console.warn(`[InventoryMatch] Error cargando inventario: ${error.message}`)
    return []
  }

  const rows = (data ?? []) as InventoryCandidate[]
  if (!vehicleIdHint?.trim()) return rows

  const hint = vehicleIdHint.trim()
  if (rows.some((r) => r.id === hint)) return rows

  const { data: hinted } = await supabase
    .from('inventoryoracle')
    .select('id, brand, model, year')
    .eq('id', hint)
    .maybeSingle()

  if (hinted) return [hinted as InventoryCandidate, ...rows]
  return rows
}

/**
 * Sin guión de marketing: empareja la transcripción Assembly con `inventoryoracle`
 * y auto-puebla brand overlays del job cuando aún no tienen marca/modelo.
 */
export async function resolveAndApplyVehicleFromAssemblyForJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  segments: Segment[],
  opts?: { vehicleIdHint?: string | null }
): Promise<ResolvedInventoryVehicle | null> {
  const { data: jobRow, error: jobErr } = await supabase
    .from('video_jobs_v2')
    .select('video_script_id, show_brand_overlays, vehicle_line_1, vehicle_line_2, vehicle_line_4')
    .eq('id', jobId)
    .single()

  if (jobErr || !jobRow) {
    console.warn(`[InventoryMatch][${jobId}] No se pudo leer job: ${jobErr?.message ?? 'sin datos'}`)
    return null
  }

  if (jobRow.video_script_id) {
    return null
  }

  const line1 = jobRow.vehicle_line_1?.trim() ?? ''
  const line2 = jobRow.vehicle_line_2?.trim() ?? ''
  const line4 = jobRow.vehicle_line_4?.trim() ?? ''

  // Completar desde audio si falta marca, modelo o año (p. ej. biblioteca heredó solo L2).
  const shouldMatchFromAssembly = !line1 || !line2 || !line4

  if (!shouldMatchFromAssembly) {
    return null
  }

  const transcript = transcriptFromSegments(segments)
  if (!transcript.trim()) {
    return null
  }

  const vehicleIdHint = opts?.vehicleIdHint?.trim() || null
  const candidates = await fetchInventoryCandidates(supabase, vehicleIdHint)
  if (candidates.length === 0) {
    console.warn(`[InventoryMatch][${jobId}] Inventario vacío para match`)
    return null
  }

  const transcriptWords = normalizeForMatch(transcript).split(' ').filter(Boolean)
  const mentionedBrands = brandsMentionedInTranscript(transcriptWords, candidates)

  let best: InventoryCandidate | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const score = scoreVehicleAgainstTranscript(
      transcript,
      candidate,
      mentionedBrands,
      vehicleIdHint
    )
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  const minScore = vehicleIdHint ? MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT : MIN_INVENTORY_MATCH
  if (!best || bestScore < minScore) {
    console.warn(
      `[InventoryMatch][${jobId}] Sin match confiable (best=${bestScore.toFixed(3)}, min=${minScore})`
    )
    return null
  }

  const brand = best.brand.trim()
  const model = best.model.trim()
  const year = best.year != null ? String(best.year).trim() : ''
  const brandMentionTimeSec = findBrandMentionTimeSec(segments, brand, model)

  const updatePayload: Record<string, unknown> = {
    show_brand_overlays: true,
    vehicle_line_1: brand,
    vehicle_line_2: model,
  }
  if (year) updatePayload.vehicle_line_4 = year

  const { error: updateErr } = await supabase
    .from('video_jobs_v2')
    .update(updatePayload)
    .eq('id', jobId)

  if (updateErr) {
    console.warn(`[InventoryMatch][${jobId}] No se pudo guardar brand config: ${updateErr.message}`)
    return null
  }

  const mentionedList = [...mentionedBrands].join(', ') || 'ninguna'
  console.log(
    `[InventoryMatch][${jobId}] Vehículo desde Assembly→inventario: ` +
      `"${brand}" "${model}"${year ? ` (${year})` : ''} score=${bestScore.toFixed(3)}` +
      (brandMentionTimeSec != null ? ` t=${brandMentionTimeSec}s` : '') +
      ` marcas_en_audio=[${mentionedList}]`
  )

  return {
    vehicleId: best.id,
    brand,
    model,
    year,
    score: bestScore,
    brandMentionTimeSec,
  }
}
