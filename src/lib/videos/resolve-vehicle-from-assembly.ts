import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { Segment } from './segmenter'
import { jaccardSimilarity, normalizeForMatch } from './subtitle-screen-text'

const MIN_INVENTORY_MATCH = 0.12
const MIN_INVENTORY_MATCH_WITH_VEHICLE_HINT = 0.08

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

function wordFuzzyMatches(assemblyWord: string, keyword: string): boolean {
  const a = normalizeForMatch(assemblyWord)
  const k = normalizeForMatch(keyword)
  if (a.length < 2 || k.length < 2) return false
  const pLen = Math.min(4, Math.min(a.length, k.length))
  return a.slice(0, pLen) === k.slice(0, pLen)
}

function modelSearchTokens(model: string): string[] {
  const parts = normalizeForMatch(model)
    .split(' ')
    .filter((w) => w.length >= 3 && !/^\d/.test(w))
  return parts.slice(0, 2)
}

function scoreVehicleAgainstTranscript(
  transcript: string,
  vehicle: InventoryCandidate,
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
      if (wordFuzzyMatches(w, brandNorm)) score += 0.18
    }
  }

  for (const token of modelSearchTokens(model)) {
    for (const w of transcriptWords) {
      if (wordFuzzyMatches(w, token)) score += 0.28
      if (token.length >= 4 && w.length >= 4 && (token.includes(w) || w.includes(token))) {
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

  if (vehicle.year != null) {
    const yearStr = String(vehicle.year)
    if (transcriptWords.includes(yearStr)) score += 0.08
  }

  if (vehicleIdHint && vehicle.id === vehicleIdHint) score += 0.45

  return score
}

function findBrandMentionTimeSec(
  segments: Segment[],
  brand: string,
  model: string
): number | undefined {
  const keywords = [
    brand.trim(),
    modelSearchTokens(model)[0] ?? '',
    model.trim().split(/\s+/)[0] ?? '',
  ].filter((k) => k.length >= 2)

  if (keywords.length === 0) return undefined

  for (const seg of segments) {
    if (seg.source_kind === 'visual_only') continue
    for (const w of seg.words ?? []) {
      if (keywords.some((k) => wordFuzzyMatches(w.text, k))) {
        return Number((w.start / 1000).toFixed(3))
      }
    }
  }

  const firstSpoken = segments.find(
    (s) => s.source_kind !== 'visual_only' && (s.words?.length ?? 0) > 0
  )
  if (firstSpoken?.words?.[0]) {
    return Number((firstSpoken.words[0].start / 1000).toFixed(3))
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

  let best: InventoryCandidate | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const score = scoreVehicleAgainstTranscript(transcript, candidate, vehicleIdHint)
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

  console.log(
    `[InventoryMatch][${jobId}] Vehículo desde Assembly→inventario: ` +
      `"${brand}" "${model}"${year ? ` (${year})` : ''} score=${bestScore.toFixed(3)}` +
      (brandMentionTimeSec != null ? ` t=${brandMentionTimeSec}s` : '')
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
