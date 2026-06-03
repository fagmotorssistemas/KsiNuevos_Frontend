import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { parseGuionEscenas, type GuionEscena } from '@/types/video-script'
import { jaccardSimilarity } from './subtitle-screen-text'
import type { Segment } from './segmenter'

const MIN_SCRIPT_MATCH_WITH_VEHICLE = 0.1
const MIN_SCRIPT_MATCH_GLOBAL = 0.14

type ScriptCandidate = {
  id: string
  guion_escenas: unknown
  texto_hablado: string | null
  texto_guion: string
  guion_titulo: string | null
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

function scriptReferenceText(script: ScriptCandidate): string {
  const escenas = parseGuionEscenas(script.guion_escenas)
  const chunks: string[] = []
  for (const e of escenas) {
    if (e.dialogo?.trim()) chunks.push(e.dialogo.trim())
    if (e.texto_pantalla?.trim()) chunks.push(e.texto_pantalla.trim())
  }
  if (script.texto_hablado?.trim()) chunks.push(script.texto_hablado.trim())
  if (script.texto_guion?.trim()) chunks.push(script.texto_guion.trim())
  return chunks.join(' ')
}

function scoreScriptAgainstTranscript(transcript: string, script: ScriptCandidate): number {
  const ref = scriptReferenceText(script)
  if (!ref.trim() || !transcript.trim()) return 0
  return jaccardSimilarity(transcript, ref)
}

export function buildScriptGuidanceFromEscenas(escenas: GuionEscena[]): string {
  const lines = escenas
    .sort((a, b) => a.esc - b.esc)
    .map((e) => {
      const d = e.dialogo?.trim()
      const p = e.texto_pantalla?.trim()
      // Las comillas permiten que extractQuotedDialoguesFromScript las recoja
      // como scriptDialogueLines para la lista priorizada de Gemini.
      if (d && p) return `Escena ${e.esc} — Diálogo: "${d}"\nTexto en pantalla: ${p}`
      if (d) return `Escena ${e.esc} — "${d}"`
      if (p) return `Escena ${e.esc} — Pantalla: ${p}`
      return ''
    })
    .filter(Boolean)
  return lines.join('\n\n')
}

async function fetchScriptCandidates(
  supabase: SupabaseClient<Database>,
  vehicleId?: string | null
): Promise<ScriptCandidate[]> {
  let q = supabase
    .from('video_scripts')
    .select('id, guion_escenas, texto_hablado, texto_guion, guion_titulo')
    .not('guion_escenas', 'is', null)
    .order('created_at', { ascending: false })
    .limit(vehicleId ? 20 : 40)

  if (vehicleId) {
    q = q.eq('vehicle_id', vehicleId)
  }

  const { data, error } = await q
  if (error) {
    console.warn(`[VideoScriptResolve] Error cargando guiones: ${error.message}`)
    return []
  }
  return (data ?? []) as ScriptCandidate[]
}

export type ResolvedVideoScript = {
  scriptId: string
  escenas: GuionEscena[]
  score: number
  guionTitulo: string | null
}

/**
 * Identifica el video_scripts más probable comparando la transcripción Assembly
 * con diálogos del guión. Opcionalmente acota por vehicle_id del inventario.
 */
export async function resolveVideoScriptFromTranscript(
  supabase: SupabaseClient<Database>,
  segments: Segment[],
  opts?: { vehicleId?: string | null; jobId?: string }
): Promise<ResolvedVideoScript | null> {
  const transcript = transcriptFromSegments(segments)
  if (!transcript.trim()) return null

  const vehicleId = opts?.vehicleId?.trim() || null
  const candidates = await fetchScriptCandidates(supabase, vehicleId)
  if (candidates.length === 0 && vehicleId) {
    const fallback = await fetchScriptCandidates(supabase, null)
    return pickBestScript(transcript, fallback, false, opts?.jobId)
  }
  return pickBestScript(transcript, candidates, Boolean(vehicleId), opts?.jobId)
}

function pickBestScript(
  transcript: string,
  candidates: ScriptCandidate[],
  scopedToVehicle: boolean,
  jobId?: string
): ResolvedVideoScript | null {
  const minScore = scopedToVehicle ? MIN_SCRIPT_MATCH_WITH_VEHICLE : MIN_SCRIPT_MATCH_GLOBAL
  let best: ResolvedVideoScript | null = null

  for (const c of candidates) {
    const escenas = parseGuionEscenas(c.guion_escenas)
    if (escenas.length === 0) continue
    const score = scoreScriptAgainstTranscript(transcript, c)
    if (score < minScore) continue
    if (!best || score > best.score) {
      best = {
        scriptId: c.id,
        escenas,
        score,
        guionTitulo: c.guion_titulo,
      }
    }
  }

  if (best && jobId) {
    console.log(
      `[VideoScriptResolve][${jobId}] Guión enlazado id=${best.scriptId} score=${best.score.toFixed(3)}` +
        (best.guionTitulo ? ` titulo="${best.guionTitulo}"` : '') +
        ` escenas=${best.escenas.length}`
    )
  }

  return best
}

export async function loadGuionEscenasForJob(
  supabase: SupabaseClient<Database>,
  videoScriptId: string | null | undefined
): Promise<GuionEscena[]> {
  if (!videoScriptId) return []
  const { data, error } = await supabase
    .from('video_scripts')
    .select('guion_escenas')
    .eq('id', videoScriptId)
    .maybeSingle()
  if (error || !data) return []
  return parseGuionEscenas(data.guion_escenas)
}

export async function resolveAndLinkVideoScriptForJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  segments: Segment[],
  vehicleId?: string | null
): Promise<ResolvedVideoScript | null> {
  const resolved = await resolveVideoScriptFromTranscript(supabase, segments, {
    vehicleId,
    jobId,
  })
  if (!resolved) {
    console.warn(
      `[VideoScriptResolve][${jobId}] No se encontró guión de marketing compatible` +
        (vehicleId ? ` (vehicle_id=${vehicleId})` : '')
    )
    return null
  }

  // Guardamos video_script_id Y script_text con los diálogos del guión
  // para que Gemini pueda usarlo como guía de ordenamiento.
  const guidance = buildScriptGuidanceFromEscenas(resolved.escenas)
  const updatePayload: Record<string, unknown> = { video_script_id: resolved.scriptId }
  if (guidance.length > 0) {
    updatePayload.script_text = guidance
    console.log(
      `[VideoScriptResolve][${jobId}] Guía de guión enviada a Gemini (${guidance.length} chars, score=${resolved.score.toFixed(3)})`
    )
  }
  const { error } = await supabase
    .from('video_jobs_v2')
    .update(updatePayload)
    .eq('id', jobId)

  if (error) {
    console.warn(`[VideoScriptResolve][${jobId}] No se pudo guardar video_script_id: ${error.message}`)
  }

  return resolved
}
