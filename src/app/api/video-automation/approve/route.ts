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
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json({ error: 'job_id es requerido' }, { status: 400 })
    }

    const { data: job, error: jobError } = await supabase
      .from('video_automation_jobs')
      .select(`
        id,
        status,
        final_export_url,
        descript_project_url,
        vehicle_id,
        inventoryoracle!inner (
          brand,
          model,
          year,
          price
        )
      `)
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    if (job.status !== 'ready_for_qa' && job.status !== 'processing_descript') {
      return NextResponse.json(
        { error: `Estado inválido para aprobar: ${job.status}` },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('video_automation_jobs')
      .update({ status: 'approved' })
      .eq('id', job_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al aprobar', details: updateError.message },
        { status: 500 }
      )
    }

    const vehicle = job.inventoryoracle as unknown as {
      brand: string
      model: string
      year: number
      price: number
    }

    /*
     * ╔══════════════════════════════════════════════════════════════════════════════╗
     * ║                                                                            ║
     * ║   TODO: INTEGRACIÓN CON n8n PARA PUBLICACIÓN EN REDES SOCIALES             ║
     * ║                                                                            ║
     * ║   Aquí debe ir un fetch al Webhook de n8n que:                             ║
     * ║                                                                            ║
     * ║   1. Reciba el JSON con los datos del vehículo y el video editado:         ║
     * ║      {                                                                     ║
     * ║        export_url: job.final_export_url,                                   ║
     * ║        brand: vehicle.brand,                                               ║
     * ║        model: vehicle.model,                                               ║
     * ║        year: vehicle.year,                                                 ║
     * ║        price: vehicle.price,                                               ║
     * ║        descript_project_url: job.descript_project_url                       ║
     * ║      }                                                                     ║
     * ║                                                                            ║
     * ║   2. n8n usará estos datos para:                                           ║
     * ║      - Generar copy automático para Instagram/TikTok con los datos reales  ║
     * ║        del vehículo (marca, modelo, año, precio)                           ║
     * ║      - Publicar el video editado en ambas plataformas                      ║
     * ║      - Notificar al vendedor vía WhatsApp/email que el post está live      ║
     * ║                                                                            ║
     * ║   Ejemplo de implementación:                                               ║
     * ║                                                                            ║
     * ║   const N8N_WEBHOOK_URL = process.env.N8N_VIDEO_PUBLISH_WEBHOOK!           ║
     * ║   await fetch(N8N_WEBHOOK_URL, {                                           ║
     * ║     method: 'POST',                                                        ║
     * ║     headers: { 'Content-Type': 'application/json' },                       ║
     * ║     body: JSON.stringify({                                                 ║
     * ║       export_url: job.final_export_url,                                    ║
     * ║       brand: vehicle.brand,                                                ║
     * ║       model: vehicle.model,                                                ║
     * ║       year: vehicle.year,                                                  ║
     * ║       price: vehicle.price,                                                ║
     * ║       descript_project_url: job.descript_project_url,                       ║
     * ║       approved_by: user.id,                                                ║
     * ║       approved_at: new Date().toISOString(),                               ║
     * ║     }),                                                                    ║
     * ║   })                                                                       ║
     * ║                                                                            ║
     * ╚══════════════════════════════════════════════════════════════════════════════╝
     */

    return NextResponse.json({
      job_id,
      status: 'approved',
      vehicle: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      message: 'Video aprobado exitosamente. Pendiente integración con n8n para publicación.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
