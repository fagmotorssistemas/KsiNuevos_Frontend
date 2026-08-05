import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { ecuadorLocalInputToIso } from '@/lib/marketing-planner/timezone'
import { getPilarCronogramaDelDia } from '@/lib/marketing/pilar-cronograma'
import { isPilarSistema, type PilarSistema } from '@/types/pilar'
import { rawFullFolderToPilarTab } from '@/lib/videos/raw-full-caption-templates'

export type PilarComplianceBreakdownItem = {
  sistema: PilarSistema
  label: string
  expected: number
  /** Videos en bruto subidos ese día (calendario Ecuador) para este pilar. */
  videosEvidence: number
  /** 0–expected */
  score: number
}

export type PilarDayCompliance = {
  fecha: string
  percent: number
  expectedCount: number
  guionReadyCount: number
  videoEvidenceCount: number
  breakdown: PilarComplianceBreakdownItem[]
  computedAt: string
  /** false cuando el día no tiene piezas en el cronograma (finde / vacío) */
  applicable: boolean
}

/**
 * Cumplimiento operativo arranca este día (Ecuador).
 * Días anteriores no cuentan evidencia histórica.
 */
export const PILAR_COMPLIANCE_START_YMD = '2026-08-05'

/** Formato de video en bruto → pilar del cronograma. */
export const RAW_FORMATO_TO_PILAR: Record<string, PilarSistema> = {
  video_autos: 'pilar1',
  video_educativo: 'pilar3',
  video_entretenimiento: 'pilar4',
  video_humanizar: 'pilar2',
  ficha_rapida: 'pilar1',
  pov_gancho: 'pilar1',
  duelo: 'pilar1',
  creativo: 'pilar1',
  detras_camaras: 'pilar2',
  financiamiento: 'pilar3',
}

export function mapRawFormatoToPilar(formato: string | null | undefined): PilarSistema | null {
  if (!formato) return null
  return RAW_FORMATO_TO_PILAR[formato as RawFullCaptionFormato] ?? null
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function complianceDb(supabase: SupabaseClient<Database>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('marketing_pilar_day_compliance')
}

function foldersDb(supabase: SupabaseClient<Database>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('raw_full_video_folders')
}

/** Rango UTC del día calendario en Ecuador (America/Guayaquil). */
export function ecuadorDayUtcRange(fechaYmd: string): { startIso: string; endIso: string } {
  const startIso = ecuadorLocalInputToIso(`${fechaYmd}T00:00`)
  const [y, m, d] = fechaYmd.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const nextYmd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
  const endIso = ecuadorLocalInputToIso(`${nextYmd}T00:00`)
  return { startIso, endIso }
}

function emptyResult(fecha: string, applicable = false): PilarDayCompliance {
  return {
    fecha,
    percent: 0,
    expectedCount: 0,
    guionReadyCount: 0,
    videoEvidenceCount: 0,
    breakdown: [],
    computedAt: new Date().toISOString(),
    applicable,
  }
}

/**
 * Solo videos subidos ese día (hora Ecuador) en:
 * - Biblioteca videos bruto (`raw_full_video_folders`)
 * - Videos / pipeline (`video_jobs_v2`, sin noticiero)
 * No cuenta carpetas ni jobs de otros días.
 */
async function countVideoEvidenceBySistema(
  fechaYmd: string
): Promise<Record<PilarSistema, number>> {
  const counts: Record<PilarSistema, number> = {
    pilar1: 0,
    pilar2: 0,
    pilar3: 0,
    pilar4: 0,
  }

  if (fechaYmd < PILAR_COMPLIANCE_START_YMD) {
    return counts
  }

  const { startIso, endIso } = ecuadorDayUtcRange(fechaYmd)
  const supabase = getServiceClient()

  const [{ data: folders, error: foldersErr }, { data: jobs, error: jobsErr }] =
    await Promise.all([
      foldersDb(supabase)
        .select('id, formato, inventory_vehicle_id, created_at')
        .gte('created_at', startIso)
        .lt('created_at', endIso),
      supabase
        .from('video_jobs_v2')
        .select('id, flow_type, created_at')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .neq('flow_type', 'noticiero'),
    ])

  if (foldersErr) {
    console.error('[pilar-compliance] folders', foldersErr.message)
  }
  if (jobsErr) {
    console.error('[pilar-compliance] jobs', jobsErr.message)
  }

  for (const row of folders ?? []) {
    const r = row as {
      formato?: string | null
      inventory_vehicle_id?: string | null
    }
    const tab = rawFullFolderToPilarTab({
      formato: r.formato,
      inventoryVehicleId: r.inventory_vehicle_id,
    })
    if (!tab || !isPilarSistema(tab)) continue
    counts[tab] += 1
  }

  // Jobs de Videos (clips o raw_full programados) → Pilar 1 si hay vehículo implícito del flujo autos;
  // raw_full ya se contó por carpeta; contar solo pipeline no-raw_full para no duplicar.
  for (const job of jobs ?? []) {
    const flow = (job as { flow_type?: string }).flow_type
    if (flow === 'raw_full') continue
    counts.pilar1 += 1
  }

  return counts
}

/**
 * Cumplimiento del día = videos subidos ese día (Biblioteca bruto + Videos)
 * / piezas esperadas del cronograma. Filtra por fecha Ecuador (UTC−5).
 */
export async function computeAndPersistPilarDayCompliance(
  fechaYmd: string
): Promise<PilarDayCompliance> {
  const expected = getPilarCronogramaDelDia(fechaYmd)
  if (expected.length === 0) {
    const empty = emptyResult(fechaYmd, false)
    await upsertCompliance(empty)
    return empty
  }

  const videoCounts = await countVideoEvidenceBySistema(fechaYmd)

  const breakdown: PilarComplianceBreakdownItem[] = []
  let totalExpected = 0
  let totalScore = 0
  let videoEvidenceTotal = 0

  for (const slot of expected) {
    const videosEvidence = videoCounts[slot.sistema] ?? 0
    const score = Math.min(videosEvidence, slot.count)

    breakdown.push({
      sistema: slot.sistema,
      label: slot.label,
      expected: slot.count,
      videosEvidence: Math.min(videosEvidence, slot.count),
      score,
    })

    totalExpected += slot.count
    totalScore += score
    videoEvidenceTotal += Math.min(videosEvidence, slot.count)
  }

  const percent =
    totalExpected <= 0 ? 0 : Math.round((1000 * totalScore) / totalExpected) / 10

  const result: PilarDayCompliance = {
    fecha: fechaYmd,
    percent,
    expectedCount: totalExpected,
    guionReadyCount: 0,
    videoEvidenceCount: videoEvidenceTotal,
    breakdown,
    computedAt: new Date().toISOString(),
    applicable: true,
  }

  await upsertCompliance(result)
  return result
}

async function upsertCompliance(row: PilarDayCompliance) {
  const supabase = getServiceClient()
  const { error } = await complianceDb(supabase).upsert(
    {
      fecha: row.fecha,
      percent: row.percent,
      expected_count: row.expectedCount,
      guion_ready_count: row.guionReadyCount,
      video_evidence_count: row.videoEvidenceCount,
      breakdown: row.breakdown,
      computed_at: row.computedAt,
    },
    { onConflict: 'fecha' }
  )
  if (error) {
    console.error('[pilar-compliance] upsert', error.message)
    throw new Error(`No se pudo guardar el cumplimiento: ${error.message}`)
  }
}

function mapDbRow(row: Record<string, unknown>): PilarDayCompliance {
  const expectedCount = Number(row.expected_count ?? 0)
  const breakdownRaw = Array.isArray(row.breakdown) ? row.breakdown : []
  return {
    fecha: String(row.fecha).slice(0, 10),
    percent: Number(row.percent ?? 0),
    expectedCount,
    guionReadyCount: Number(row.guion_ready_count ?? 0),
    videoEvidenceCount: Number(row.video_evidence_count ?? 0),
    breakdown: breakdownRaw.filter(
      (b): b is PilarComplianceBreakdownItem =>
        !!b &&
        typeof b === 'object' &&
        isPilarSistema((b as PilarComplianceBreakdownItem).sistema)
    ),
    computedAt:
      typeof row.computed_at === 'string' ? row.computed_at : new Date().toISOString(),
    applicable: expectedCount > 0,
  }
}

export async function getStoredPilarComplianceForMonth(
  monthKey: string
): Promise<PilarDayCompliance[]> {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return []
  const start = `${monthKey}-01`
  const [y, m] = monthKey.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${monthKey}-${String(lastDay).padStart(2, '0')}`

  const supabase = getServiceClient()
  const { data, error } = await complianceDb(supabase)
    .select('*')
    .gte('fecha', start)
    .lte('fecha', end)
    .order('fecha', { ascending: true })

  if (error) {
    console.error('[pilar-compliance] list month', error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapDbRow(row))
}

export async function getStoredPilarComplianceForDate(
  fechaYmd: string
): Promise<PilarDayCompliance | null> {
  const supabase = getServiceClient()
  const { data, error } = await complianceDb(supabase)
    .select('*')
    .eq('fecha', fechaYmd)
    .maybeSingle()

  if (error) {
    console.error('[pilar-compliance] get day', error.message)
    throw new Error(error.message)
  }
  if (!data) return null
  return mapDbRow(data as Record<string, unknown>)
}
