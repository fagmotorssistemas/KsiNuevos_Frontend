import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import type { MonthOverviewItem, MonthOverviewResponse } from '@/types/script-assignment'

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

function vehicleLabel(inv: { brand?: string | null; model?: string | null; year?: number | null } | null) {
  if (!inv) return 'Vehículo'
  const label = `${inv.brand ?? ''} ${inv.model ?? ''} ${inv.year ?? ''}`.trim()
  return label || 'Vehículo'
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

  const { data, error } = await supabase
    .from('script_vehicle_assignments')
    .select(
      `
      id,
      fecha_asignacion,
      status,
      inventoryoracle:inventoryoracle (brand, model, year),
      video_scripts (id)
    `
    )
    .gte('fecha_asignacion', range.start)
    .lte('fecha_asignacion', range.end)
    .order('fecha_asignacion', { ascending: true })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const items: MonthOverviewItem[] = (data ?? []).map((row) => {
    const inv = row.inventoryoracle as
      | { brand?: string | null; model?: string | null; year?: number | null }
      | null
    const scripts = row.video_scripts as { id: string }[] | null
    const scriptCount = Array.isArray(scripts) ? scripts.length : 0
    const status = String(row.status ?? '')
    const guionGenerado = scriptCount > 0 || status === 'guion_generado'

    return {
      fecha: String(row.fecha_asignacion).slice(0, 10),
      assignment_id: row.id,
      vehicle_label: vehicleLabel(inv),
      guion_generado: guionGenerado,
      status,
    }
  })

  const body: MonthOverviewResponse = { mes: range.mes, items }
  return NextResponse.json(body)
}
