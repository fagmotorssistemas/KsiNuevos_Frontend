import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Segment } from './segmenter'
import { jaccardSimilarity, normalizeForMatch, wordFuzzyMatches } from './subtitle-screen-text'
import {
  brandsMentionedInTranscript,
  inventoryModelTokenMatches,
  modelSearchTokens,
  transcriptMatchesVehicleIdentity,
} from './transcript-vehicle-identity'

const MIN_INVENTORY_MATCH = 0.12
const MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT = 0.08

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

async function loadScriptVehicleIdentity(
  supabase: SupabaseClient<Database>,
  scriptId: string
): Promise<{ brand: string; model: string; year: string | null } | null> {
  const { data: scriptRow } = await supabase
    .from('video_scripts')
    .select('vehicle_id, vehicle_data')
    .eq('id', scriptId)
    .maybeSingle()

  if (!scriptRow) return null

  let brand = ''
  let model = ''
  let year: string | null = null

  if (scriptRow.vehicle_data && typeof scriptRow.vehicle_data === 'object') {
    const vd = scriptRow.vehicle_data as Record<string, unknown>
    brand = String(vd.brand ?? '').trim()
    model = String(vd.model ?? '').trim()
    year = vd.year != null ? String(vd.year).trim() : null
  }

  if ((!brand || !model) && scriptRow.vehicle_id) {
    const { data: inv } = await supabase
      .from('inventoryoracle')
      .select('brand, model, year')
      .eq('id', scriptRow.vehicle_id)
      .maybeSingle()
    if (inv) {
      brand = brand || String(inv.brand ?? '').trim()
      model = model || String(inv.model ?? '').trim()
      year = year ?? (inv.year != null ? String(inv.year).trim() : null)
    }
  }

  if (!brand || !model) return null
  return { brand, model, year }
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

async function resolveBestInventoryVehicle(
  supabase: SupabaseClient<Database>,
  segments: Segment[],
  vehicleIdHint?: string | null
): Promise<{ vehicle: InventoryCandidate; score: number } | null> {
  const transcript = transcriptFromSegments(segments)
  if (!transcript.trim()) return null

  const candidates = await fetchInventoryCandidates(supabase, vehicleIdHint)
  if (candidates.length === 0) return null

  const transcriptWords = normalizeForMatch(transcript).split(' ').filter(Boolean)
  const brandNorms = [
    ...new Set(candidates.map((c) => normalizeForMatch(c.brand)).filter((b) => b.length >= 3)),
  ]
  const mentionedBrands = brandsMentionedInTranscript(transcriptWords, brandNorms)

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
  if (!best || bestScore < minScore) return null

  return { vehicle: best, score: bestScore }
}

async function applyInventoryVehicleToJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  segments: Segment[],
  match: { vehicle: InventoryCandidate; score: number }
): Promise<ResolvedInventoryVehicle | null> {
  const brand = match.vehicle.brand.trim()
  const model = match.vehicle.model.trim()
  const year = match.vehicle.year != null ? String(match.vehicle.year).trim() : ''
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

  const mentionedList = [...new Set([normalizeForMatch(brand)])].join(', ')
  console.log(
    `[InventoryMatch][${jobId}] Vehículo desde Assembly→inventario: ` +
      `"${brand}" "${model}"${year ? ` (${year})` : ''} score=${match.score.toFixed(3)}` +
      (brandMentionTimeSec != null ? ` t=${brandMentionTimeSec}s` : '') +
      ` marcas_en_audio=[${mentionedList}]`
  )

  return {
    vehicleId: match.vehicle.id,
    brand,
    model,
    year,
    score: match.score,
    brandMentionTimeSec,
  }
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
    .select('video_script_id, show_brand_overlays, vehicle_line_1, vehicle_line_2')
    .eq('id', jobId)
    .single()

  if (jobErr || !jobRow) {
    console.warn(`[InventoryMatch][${jobId}] No se pudo leer job: ${jobErr?.message ?? 'sin datos'}`)
    return null
  }

  if (jobRow.video_script_id) {
    return null
  }

  const needsBrandConfig =
    !jobRow.show_brand_overlays &&
    !jobRow.vehicle_line_1?.trim() &&
    !jobRow.vehicle_line_2?.trim()

  if (!needsBrandConfig) {
    return null
  }

  const match = await resolveBestInventoryVehicle(supabase, segments, opts?.vehicleIdHint)
  if (!match) {
    console.warn(`[InventoryMatch][${jobId}] Sin match confiable en inventario`)
    return null
  }

  return applyInventoryVehicleToJob(supabase, jobId, segments, match)
}

export type ReconcileVehicleResult = {
  corrected: boolean
  guionRevoked: boolean
  vehicle: ResolvedInventoryVehicle | null
}

/**
 * Valida que el brand config / guión coincida con lo dicho en el audio.
 * Si no: corrige desde inventario y revoca el guión enlazado.
 */
export async function reconcileBrandConfigWithAssemblyForJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  segments: Segment[],
  opts?: { vehicleIdHint?: string | null }
): Promise<ReconcileVehicleResult> {
  const transcript = transcriptFromSegments(segments)
  if (!transcript.trim()) {
    return { corrected: false, guionRevoked: false, vehicle: null }
  }

  const { data: jobRow } = await supabase
    .from('video_jobs_v2')
    .select(
      'video_script_id, show_brand_overlays, vehicle_line_1, vehicle_line_2, vehicle_line_4'
    )
    .eq('id', jobId)
    .single()

  if (!jobRow) {
    return { corrected: false, guionRevoked: false, vehicle: null }
  }

  const brand = jobRow.vehicle_line_1?.trim() ?? ''
  const model = jobRow.vehicle_line_2?.trim() ?? ''
  const year = jobRow.vehicle_line_4?.trim() || null
  const hasBrandConfig = Boolean(jobRow.show_brand_overlays && brand && model)

  if (hasBrandConfig) {
    const check = transcriptMatchesVehicleIdentity(transcript, { brand, model, year })
    if (check.ok) {
      return { corrected: false, guionRevoked: false, vehicle: null }
    }

    console.warn(
      `[InventoryMatch][${jobId}] Brand/guion no coincide con audio: ${check.reason ?? 'conflicto'} — ` +
        `config="${brand}" "${model}"${year ? ` ${year}` : ''}`
    )
  } else if (jobRow.video_script_id) {
    const scriptVehicle = await loadScriptVehicleIdentity(supabase, jobRow.video_script_id)
    if (scriptVehicle) {
      const check = transcriptMatchesVehicleIdentity(transcript, scriptVehicle)
      if (check.ok) {
        return { corrected: false, guionRevoked: false, vehicle: null }
      }
      console.warn(
        `[InventoryMatch][${jobId}] Guión enlazado no coincide con audio: ${check.reason ?? 'conflicto'}`
      )
    }
  } else if (!brand && !model) {
    const matchOnly = await resolveBestInventoryVehicle(supabase, segments, opts?.vehicleIdHint)
    if (!matchOnly) {
      return { corrected: false, guionRevoked: false, vehicle: null }
    }
    const vehicle = await applyInventoryVehicleToJob(supabase, jobId, segments, matchOnly)
    return { corrected: Boolean(vehicle), guionRevoked: false, vehicle }
  } else {
    return { corrected: false, guionRevoked: false, vehicle: null }
  }

  const match = await resolveBestInventoryVehicle(supabase, segments, opts?.vehicleIdHint)
  if (!match) {
    console.warn(`[InventoryMatch][${jobId}] No se pudo corregir vehículo desde audio`)
    return { corrected: false, guionRevoked: false, vehicle: null }
  }

  const vehicle = await applyInventoryVehicleToJob(supabase, jobId, segments, match)
  if (!vehicle) {
    return { corrected: false, guionRevoked: false, vehicle: null }
  }

  let guionRevoked = false
  if (jobRow.video_script_id) {
    const { error: revokeErr } = await supabase
      .from('video_jobs_v2')
      .update({ video_script_id: null, script_text: null })
      .eq('id', jobId)

    if (revokeErr) {
      console.warn(`[InventoryMatch][${jobId}] No se pudo revocar guión: ${revokeErr.message}`)
    } else {
      guionRevoked = true
      console.warn(
        `[InventoryMatch][${jobId}] Guión revocado: audio no coincide con vehículo del guión enlazado`
      )
    }
  }

  return { corrected: true, guionRevoked, vehicle }
}
