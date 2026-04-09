import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { raw_video_url, vehicle_id, target_duration_seconds } = body

    if (!raw_video_url || !vehicle_id) {
      return NextResponse.json(
        { error: 'raw_video_url y vehicle_id son requeridos' },
        { status: 400 }
      )
    }

    const VALID_DURATIONS = [25, 40, 60]
    const duration = VALID_DURATIONS.includes(Number(target_duration_seconds))
      ? Number(target_duration_seconds)
      : 40

    const { data: vehicle, error: vehicleError } = await supabase
      .from('inventoryoracle')
      .select('id, brand, model, year')
      .eq('id', vehicle_id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado en inventario' },
        { status: 404 }
      )
    }

    const { data: job, error: insertError } = await supabase
      .from('video_automation_jobs')
      .insert({
        vehicle_id,
        raw_video_url,
        status: 'analyzing_gemini',
        target_duration_seconds: duration,
      })
      .select('id, status, created_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Error al crear el job', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      vehicle: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      target_duration_seconds: duration,
      created_at: job.created_at,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
