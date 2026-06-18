import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Segment } from './segmenter'
import { buildJobNameFromInventory } from './resolve-job-vehicle'
import { jaccardSimilarity, normalizeForMatch, wordFuzzyMatches } from './subtitle-screen-text'

const MIN_INVENTORY_MATCH = 0.12
const MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT = 0.08
const MIN_MARGIN_ACCEPT_SCORE = 0.08
const MIN_MARGIN_GAP = 0.06
const NEAR_MISS_MIN_SCORE = 0.1
const COMPOUND_PHRASE_BONUS = 0.32

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

type VehicleLabels = {
  brand: string
  model: string
  year: string
  vehicleId?: string
  score: number
  reason: string
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
  if (brandNorm.length < 2) return false
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

function firstAlphabeticModelToken(model: string): string | null {
  for (const t of modelSearchTokens(model)) {
    if (!/^\d/.test(t)) return t
  }
  return null
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

/** Dos palabras seguidas en audio ≈ marca + primer token de modelo (mini cooper, kia seltos). */
function phraseFuzzyMatches(spokenPhrase: string, targetPhrase: string): boolean {
  const aParts = normalizeForMatch(spokenPhrase).split(' ').filter(Boolean)
  const bParts = normalizeForMatch(targetPhrase).split(' ').filter(Boolean)
  if (aParts.length < 2 || bParts.length < 2) return false
  return wordFuzzyMatches(aParts[0]!, bParts[0]!) && wordFuzzyMatches(aParts[1]!, bParts[1]!)
}

function compoundBrandModelTargetPhrase(candidate: InventoryCandidate): string | null {
  const brandNorm = normalizeForMatch(candidate.brand.trim())
  const modelToken = firstAlphabeticModelToken(candidate.model)
  if (!brandNorm || !modelToken) return null
  return `${brandNorm} ${modelToken}`
}

function compoundBrandModelPhraseMatches(
  transcriptWords: string[],
  candidate: InventoryCandidate
): boolean {
  const target = compoundBrandModelTargetPhrase(candidate)
  if (!target) return false

  for (let i = 0; i < transcriptWords.length - 1; i++) {
    if (isInventoryStopword(transcriptWords[i]!) || isInventoryStopword(transcriptWords[i + 1]!)) {
      continue
    }
    const bigram = `${transcriptWords[i]} ${transcriptWords[i + 1]}`
    if (phraseFuzzyMatches(bigram, target)) return true
  }
  return false
}

function modelMentionedInTranscript(
  candidate: InventoryCandidate,
  transcriptWords: string[]
): boolean {
  if (compoundBrandModelPhraseMatches(transcriptWords, candidate)) return true
  const modelTokens = modelSearchTokens(candidate.model)
  return modelTokens.some((token) =>
    transcriptWords.some(
      (w) => !isInventoryStopword(w) && inventoryModelTokenMatches(w, token)
    )
  )
}

function yearMatchesTranscript(
  candidate: InventoryCandidate,
  yearTokens: string[]
): boolean {
  if (yearTokens.length === 0) return true
  if (candidate.year == null) return false
  return yearTokens.includes(String(candidate.year))
}

function candidatePassesAnchorFilter(
  candidate: InventoryCandidate,
  transcriptWords: string[],
  yearTokens: string[]
): boolean {
  const brandNorm = normalizeForMatch(candidate.brand)
  if (!brandMentionedInTranscript(brandNorm, transcriptWords)) return false
  if (!modelMentionedInTranscript(candidate, transcriptWords)) return false
  if (!yearMatchesTranscript(candidate, yearTokens)) return false
  return true
}

function anotherCandidateHasYear(
  candidates: InventoryCandidate[],
  currentId: string,
  yearStr: string
): boolean {
  return candidates.some(
    (c) => c.id !== currentId && c.year != null && String(c.year) === yearStr
  )
}

function hasStrongMatchSignal(
  candidate: InventoryCandidate,
  transcriptWords: string[],
  yearTokens: string[]
): boolean {
  const brandNorm = normalizeForMatch(candidate.brand)
  const brandOk = brandMentionedInTranscript(brandNorm, transcriptWords)
  const compoundOk = compoundBrandModelPhraseMatches(transcriptWords, candidate)
  const modelOk = modelMentionedInTranscript(candidate, transcriptWords)
  const yearOk = yearMatchesTranscript(candidate, yearTokens)
  return brandOk && (compoundOk || modelOk) && yearOk
}

function shouldAcceptByMargin(bestScore: number, secondScore: number): boolean {
  return bestScore >= MIN_MARGIN_ACCEPT_SCORE && bestScore - secondScore >= MIN_MARGIN_GAP
}

function scoreVehicleAgainstTranscript(
  transcript: string,
  vehicle: InventoryCandidate,
  mentionedBrands: Set<string>,
  allCandidates: InventoryCandidate[],
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
  const yearTokens = transcriptYearTokens(transcriptWords)
  const compoundMatch = compoundBrandModelPhraseMatches(transcriptWords, vehicle)

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

  if (compoundMatch) {
    score += COMPOUND_PHRASE_BONUS
  }

  const normFull = normalizeForMatch(fullName)
  if (normFull.length >= 4) {
    if (normTranscript.includes(normFull)) score += 0.35
    else if (normFull.includes(normTranscript.slice(0, Math.min(24, normTranscript.length)))) {
      score += 0.2
    }
  }

  if (vehicle.year != null) {
    const yearStr = String(vehicle.year)
    if (yearTokens.length > 0) {
      if (yearTokens.includes(yearStr)) score += 0.12
      else if (anotherCandidateHasYear(allCandidates, vehicle.id, yearTokens[0]!)) {
        score -= 0.25
      }
    } else if (transcriptWords.includes(yearStr)) {
      score += 0.08
    }
  }

  if (
    mentionedBrands.size > 0 &&
    brandNorm.length >= 3 &&
    !candidateBrandInMentionedSet(brandNorm, mentionedBrands) &&
    !hasStrongMatchSignal(vehicle, transcriptWords, yearTokens)
  ) {
    score -= 0.55
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

function pickAcceptedVehicle(
  candidates: InventoryCandidate[],
  transcript: string,
  transcriptWords: string[],
  mentionedBrands: Set<string>,
  vehicleIdHint: string | null
): VehicleLabels | null {
  const yearTokens = transcriptYearTokens(transcriptWords)
  const minScore = vehicleIdHint ? MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT : MIN_INVENTORY_MATCH

  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: scoreVehicleAgainstTranscript(
        transcript,
        candidate,
        mentionedBrands,
        candidates,
        vehicleIdHint
      ),
    }))
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null

  const best = scored[0]!
  const second = scored[1]
  const secondScore = second?.score ?? 0

  const anchorMatches = candidates.filter((c) =>
    candidatePassesAnchorFilter(c, transcriptWords, yearTokens)
  )

  if (anchorMatches.length === 1) {
    const only = anchorMatches[0]!
    const matched = scored.find((s) => s.candidate.id === only.id)
    return {
      brand: only.brand.trim(),
      model: only.model.trim(),
      year: only.year != null ? String(only.year) : '',
      vehicleId: only.id,
      score: matched?.score ?? Math.max(minScore, best.score),
      reason: 'unique-anchor',
    }
  }

  if (best.score >= minScore) {
    return {
      brand: best.candidate.brand.trim(),
      model: best.candidate.model.trim(),
      year: best.candidate.year != null ? String(best.candidate.year) : '',
      vehicleId: best.candidate.id,
      score: best.score,
      reason: 'score-threshold',
    }
  }

  if (shouldAcceptByMargin(best.score, secondScore)) {
    return {
      brand: best.candidate.brand.trim(),
      model: best.candidate.model.trim(),
      year: best.candidate.year != null ? String(best.candidate.year) : '',
      vehicleId: best.candidate.id,
      score: best.score,
      reason: 'score-margin',
    }
  }

  if (
    best.score >= NEAR_MISS_MIN_SCORE &&
    hasStrongMatchSignal(best.candidate, transcriptWords, yearTokens)
  ) {
    return {
      brand: best.candidate.brand.trim(),
      model: best.candidate.model.trim(),
      year: best.candidate.year != null ? String(best.candidate.year) : '',
      vehicleId: best.candidate.id,
      score: best.score,
      reason: 'near-miss-strong',
    }
  }

  if (anchorMatches.length > 1) {
    const bestAnchor = scored.find((s) => anchorMatches.some((a) => a.id === s.candidate.id))
    if (
      bestAnchor &&
      bestAnchor.score >= MIN_MARGIN_ACCEPT_SCORE &&
      hasStrongMatchSignal(bestAnchor.candidate, transcriptWords, yearTokens)
    ) {
      return {
        brand: bestAnchor.candidate.brand.trim(),
        model: bestAnchor.candidate.model.trim(),
        year: bestAnchor.candidate.year != null ? String(bestAnchor.candidate.year) : '',
        vehicleId: bestAnchor.candidate.id,
        score: bestAnchor.score,
        reason: 'anchor-best',
      }
    }
  }

  return inferVehicleLabelsFromTranscript(transcriptWords, yearTokens, scored)
}

/** Título desde audio cuando inventario no supera umbral pero marca/modelo/año están claros. */
function inferVehicleLabelsFromTranscript(
  transcriptWords: string[],
  yearTokens: string[],
  scored: { candidate: InventoryCandidate; score: number }[]
): VehicleLabels | null {
  const year = yearTokens[0] ?? ''

  for (const { candidate, score } of scored) {
    if (score < NEAR_MISS_MIN_SCORE) continue
    if (!hasStrongMatchSignal(candidate, transcriptWords, yearTokens)) continue
    return {
      brand: candidate.brand.trim(),
      model: candidate.model.trim(),
      year: candidate.year != null ? String(candidate.year) : year,
      score,
      reason: 'audio-fallback-inventory',
    }
  }

  for (const { candidate } of scored) {
    if (!compoundBrandModelPhraseMatches(transcriptWords, candidate)) continue
    if (yearTokens.length > 0 && candidate.year != null && !yearTokens.includes(String(candidate.year))) {
      continue
    }
    return {
      brand: candidate.brand.trim(),
      model: candidate.model.trim(),
      year: candidate.year != null ? String(candidate.year) : year,
      score: 0,
      reason: 'audio-fallback-compound',
    }
  }

  return null
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
    .select('video_script_id, show_brand_overlays, vehicle_line_1, vehicle_line_2, vehicle_line_4, job_name')
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

  const picked = pickAcceptedVehicle(
    candidates,
    transcript,
    transcriptWords,
    mentionedBrands,
    vehicleIdHint
  )

  if (!picked) {
    const bestPreview = candidates
      .map((c) =>
        scoreVehicleAgainstTranscript(transcript, c, mentionedBrands, candidates, vehicleIdHint)
      )
      .sort((a, b) => b - a)[0]
    console.warn(
      `[InventoryMatch][${jobId}] Sin match confiable (best=${(bestPreview ?? 0).toFixed(3)}, min=${vehicleIdHint ? MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT : MIN_INVENTORY_MATCH})`
    )
    return null
  }

  const brand = picked.brand
  const model = picked.model
  const year = picked.year
  const brandMentionTimeSec = findBrandMentionTimeSec(segments, brand, model)

  const updatePayload: Record<string, unknown> = {
    show_brand_overlays: true,
    vehicle_line_1: brand,
    vehicle_line_2: model,
  }
  if (year) updatePayload.vehicle_line_4 = year
  if (picked.vehicleId) updatePayload.inventory_vehicle_id = picked.vehicleId
  if (!jobRow.job_name?.trim()) {
    updatePayload.job_name = buildJobNameFromInventory(brand, model, year || null)
  }

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
    `[InventoryMatch][${jobId}] Vehículo (${picked.reason}): ` +
      `"${brand}" "${model}"${year ? ` (${year})` : ''} score=${picked.score.toFixed(3)}` +
      (brandMentionTimeSec != null ? ` t=${brandMentionTimeSec}s` : '') +
      ` marcas_en_audio=[${mentionedList}]` +
      (picked.vehicleId ? '' : ' (sin inventory_vehicle_id)')
  )

  return {
    vehicleId: picked.vehicleId ?? '',
    brand,
    model,
    year,
    score: picked.score,
    brandMentionTimeSec,
  }
}
