import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  buildMonthOverviewItems,
  buildReelCompletionIndex,
  enrichArchiveRowsWithInventory,
  SCRIPT_ASSIGNMENT_ACTIVE_SELECT,
  SCRIPT_ASSIGNMENT_ARCHIVE_SELECT,
  type RawArchiveRow,
  type RawAssignmentRow,
} from '@/lib/marketing/script-assignment-calendar'
import type { MonthOverviewResponse } from '@/types/script-assignment'

export const dynamic = 'force-dynamic'

function parseMonthParam(raw: string | null): { mes: string; start: string; end: string } | null {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null
  const [yStr, mStr] = raw.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!y || m < 1 || m > 12) return null
  const lastDay = new Date(y, m, 0).getDate()
  const mm = String(m).padStart(2, '0')
  return {
    mes: `${y}-${mm}`,
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const range = parseMonthParam(request.nextUrl.searchParams.get('mes'))
  if (!range) {
    return NextResponse.json({ message: 'Parámetro mes inválido (use YYYY-MM)' }, { status: 400 })
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error de configuración del servidor'
    return NextResponse.json({ message }, { status: 500 })
  }

  let activeRows: RawAssignmentRow[] = []
  {
    const activeRes = await supabase
      .from('script_vehicle_assignments')
      .select(SCRIPT_ASSIGNMENT_ACTIVE_SELECT)
      .or(
        `and(fecha_asignacion.gte.${range.start},fecha_asignacion.lte.${range.end}),and(fecha_programada.gte.${range.start},fecha_programada.lte.${range.end})`
      )

    if (
      activeRes.error?.message?.includes('fecha_programada') ||
      activeRes.error?.message?.includes('reprogramaciones_count')
    ) {
      const fallback = await supabase
        .from('script_vehicle_assignments')
        .select(
          `
          id,
          vehicle_id,
          fecha_asignacion,
          status,
          inventoryoracle:inventoryoracle (brand, model, year),
          video_scripts (id)
        `
        )
        .gte('fecha_asignacion', range.start)
        .lte('fecha_asignacion', range.end)
      if (fallback.error) {
        return NextResponse.json({ message: fallback.error.message }, { status: 500 })
      }
      activeRows = (fallback.data ?? []).map((r) => {
        const row = r as unknown as RawAssignmentRow & { fecha_asignacion: string }
        return {
          ...row,
          fecha_programada: String(row.fecha_asignacion).slice(0, 10),
          reprogramaciones_count: 0,
        }
      })
    } else if (activeRes.error) {
      return NextResponse.json({ message: activeRes.error.message }, { status: 500 })
    } else {
      activeRows = (activeRes.data ?? []) as unknown as RawAssignmentRow[]
    }
  }

  const [archiveRes, archiveScriptsRes, jobsRes] = await Promise.all([
    supabase
      .from('script_vehicle_assignments_archive')
      .select(SCRIPT_ASSIGNMENT_ARCHIVE_SELECT)
      .gte('fecha_asignacion', range.start)
      .lte('fecha_asignacion', range.end),
    supabase
      .from('video_scripts_archive')
      .select('assignment_id')
      .not('assignment_id', 'is', null),
    supabase
      .from('video_jobs_v2')
      .select('inventory_vehicle_id, created_at')
      .eq('status', 'completed')
      .neq('flow_type', 'noticiero')
      .not('inventory_vehicle_id', 'is', null)
      .gte('created_at', `${range.start}T00:00:00-05:00`)
      .lte('created_at', `${range.end}T23:59:59-05:00`),
  ])

  if (archiveRes.error) {
    return NextResponse.json({ message: archiveRes.error.message }, { status: 500 })
  }

  const archiveRows = await enrichArchiveRowsWithInventory(
    supabase,
    (archiveRes.data ?? []) as Omit<RawArchiveRow, 'inventoryoracle'>[]
  )

  const archiveScriptIds = new Set<string>()
  for (const row of archiveScriptsRes.data ?? []) {
    const aid = row.assignment_id as string | null
    if (aid) archiveScriptIds.add(aid)
  }

  const reelIndex = buildReelCompletionIndex(jobsRes.data ?? [])

  const items = buildMonthOverviewItems(
    activeRows,
    archiveRows as RawArchiveRow[],
    archiveScriptIds,
    reelIndex,
    range
  )

  const body: MonthOverviewResponse = { mes: range.mes, items }
  return NextResponse.json(body)
}
