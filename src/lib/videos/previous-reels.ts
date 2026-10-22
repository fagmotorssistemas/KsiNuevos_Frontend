/**
 * Reels anteriores del mismo vehículo, resumidos para el prompt del editor:
 * así Claude arma uno distinto (otra apertura, otro orden, otro enfoque).
 * Cuesta unos cientos de tokens por Reel.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { isPipelineInputMeta } from './clip-config'

const MAX_PREVIOUS_REELS = 3
const MAX_CUTS_PER_REEL = 12
const MAX_CUT_CHARS = 90

type StoredAnalysis = {
  sequence?: { segment_id?: unknown }[]
  overall_strategy?: unknown
  total_duration?: unknown
}

type StoredSegment = { segment_id?: unknown; text?: unknown }

function vehicleIdOf(job: { inventory_vehicle_id: string | null; selected_clips: unknown }): string | null {
  const linked = job.inventory_vehicle_id?.trim()
  if (linked) return linked
  if (isPipelineInputMeta(job.selected_clips)) return job.selected_clips.vehicleId?.trim() || null
  return null
}

function clip(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > MAX_CUT_CHARS ? `${t.slice(0, MAX_CUT_CHARS)}…` : t
}

function describeReel(createdAt: string, analysis: StoredAnalysis, segmentMap: unknown): string | null {
  if (!Array.isArray(analysis.sequence) || analysis.sequence.length === 0) return null
  const textById = new Map<string, string>()
  if (Array.isArray(segmentMap)) {
    for (const s of segmentMap as StoredSegment[]) {
      if (typeof s?.segment_id === 'string' && typeof s.text === 'string') textById.set(s.segment_id, s.text)
    }
  }

  const cuts = analysis.sequence
    .map((it) => (typeof it.segment_id === 'string' ? textById.get(it.segment_id) : undefined))
    .filter((t): t is string => !!t?.trim())
  if (cuts.length === 0) return null

  const duration =
    typeof analysis.total_duration === 'number' ? ` (${Math.round(analysis.total_duration)} s)` : ''
  const strategy =
    typeof analysis.overall_strategy === 'string' && analysis.overall_strategy.trim()
      ? ` — «${clip(analysis.overall_strategy)}»`
      : ''
  const lines = cuts.slice(0, MAX_CUTS_PER_REEL).map((t, i) => `  ${i + 1}. «${clip(t)}»`)
  if (cuts.length > MAX_CUTS_PER_REEL) lines.push(`  … (${cuts.length - MAX_CUTS_PER_REEL} cortes más)`)
  return `Reel del ${createdAt.slice(0, 10)}${duration}${strategy}:\n${lines.join('\n')}`
}

/** Bloque para el prompt, o '' si el vehículo no tiene reels anteriores (o no se sabe cuál es). */
export async function buildPreviousReelsBlock(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<string> {
  const { data: job } = await supabase
    .from('video_jobs_v2')
    .select('inventory_vehicle_id, selected_clips')
    .eq('id', jobId)
    .single()
  const vehicleId = job ? vehicleIdOf(job) : null
  if (!vehicleId) {
    console.log(`[VideoV2Pipeline][${jobId}][PreviousReels] Sin vehículo del inventario: no se comparan reels anteriores`)
    return ''
  }

  const { data: rows, error } = await supabase
    .from('video_jobs_v2')
    .select('created_at, gemini_analysis, segment_map')
    .eq('inventory_vehicle_id', vehicleId)
    .eq('status', 'completed')
    .neq('id', jobId)
    .order('created_at', { ascending: false })
    .limit(MAX_PREVIOUS_REELS)
  if (error) {
    console.warn(`[VideoV2Pipeline][${jobId}][PreviousReels] No se pudieron leer reels anteriores: ${error.message}`)
    return ''
  }

  const reels = (rows ?? [])
    .map((r) => describeReel(r.created_at ?? '', (r.gemini_analysis ?? {}) as StoredAnalysis, r.segment_map))
    .filter((d): d is string => d != null)
  console.log(`[VideoV2Pipeline][${jobId}][PreviousReels] ${reels.length} reel(s) anteriores del mismo vehículo`)
  if (reels.length === 0) return ''

  return `=== REELS ANTERIORES DE ESTE MISMO AUTO (no los repitas) ===
${reels.join('\n\n')}
Este Reel tiene que sentirse claramente distinto a esos: que no abra igual, que no siga el mismo orden y que tenga otro enfoque. Puedes repetir datos del auto, pero no la misma secuencia.
=== FIN REELS ANTERIORES ===

`
}
