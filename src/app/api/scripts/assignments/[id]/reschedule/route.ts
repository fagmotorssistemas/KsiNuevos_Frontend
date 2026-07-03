import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

const MAX_REPROGRAMACIONES = 2
const MIN_JUSTIFICACION = 10

function ymd(v: string): string {
  return String(v).slice(0, 10)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json({ message: 'ID de asignación requerido' }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  const fechaDestino = typeof body.fecha_destino === 'string' ? body.fecha_destino.trim() : ''
  const justificacion = typeof body.justificacion === 'string' ? body.justificacion.trim() : ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDestino)) {
    return NextResponse.json({ message: 'fecha_destino inválida (use YYYY-MM-DD)' }, { status: 400 })
  }
  if (justificacion.length < MIN_JUSTIFICACION) {
    return NextResponse.json(
      { message: `La justificación debe tener al menos ${MIN_JUSTIFICACION} caracteres` },
      { status: 400 }
    )
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error de configuración del servidor'
    return NextResponse.json({ message }, { status: 500 })
  }

  const { data: row, error: fetchErr } = await supabase
    .from('script_vehicle_assignments')
    .select('id, fecha_asignacion, fecha_programada, reprogramaciones_count, vendedor_id')
    .eq('id', id)
    .single()

  if (fetchErr || !row) {
    return NextResponse.json({ message: 'Asignación no encontrada o archivada' }, { status: 404 })
  }

  const fechaOrigen = ymd(row.fecha_programada ?? row.fecha_asignacion)
  if (fechaDestino === fechaOrigen) {
    return NextResponse.json(
      { message: 'La fecha destino debe ser distinta a la fecha programada actual' },
      { status: 400 }
    )
  }

  const count = row.reprogramaciones_count ?? 0
  if (count >= MAX_REPROGRAMACIONES) {
    return NextResponse.json(
      { message: `Máximo ${MAX_REPROGRAMACIONES} reprogramaciones por vehículo` },
      { status: 400 }
    )
  }

  const { error: logErr } = await supabase.from('script_assignment_schedule_log').insert({
    assignment_id: id,
    accion: 'reprogramar',
    fecha_origen: fechaOrigen,
    fecha_destino: fechaDestino,
    justificacion,
    created_by: auth.userId,
  })

  if (logErr) {
    return NextResponse.json({ message: logErr.message }, { status: 500 })
  }

  const { data: updated, error: updateErr } = await supabase
    .from('script_vehicle_assignments')
    .update({
      fecha_programada: fechaDestino,
      reprogramaciones_count: count + 1,
    })
    .eq('id', id)
    .select('id, fecha_asignacion, fecha_programada, reprogramaciones_count')
    .single()

  if (updateErr) {
    return NextResponse.json({ message: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ assignment: updated })
}
