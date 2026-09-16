import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const { jobId } = await params
    const body = (await request.json()) as { featured?: boolean }
    if (typeof body.featured !== 'boolean') {
      return NextResponse.json({ error: 'featured es requerido' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data: job, error } = await supabase
      .from('video_jobs_v2')
      .select('id, inventory_vehicle_id, is_featured')
      .eq('id', jobId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    const now = new Date().toISOString()

    if (!body.featured) {
      const { error: clearErr } = await supabase
        .from('video_jobs_v2')
        .update({ is_featured: false, updated_at: now })
        .eq('id', jobId)
      if (clearErr) {
        return NextResponse.json({ error: clearErr.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, featured: false })
    }

    const vehicleId = job.inventory_vehicle_id?.trim() || null
    if (vehicleId) {
      const { error: othersErr } = await supabase
        .from('video_jobs_v2')
        .update({ is_featured: false, updated_at: now })
        .eq('inventory_vehicle_id', vehicleId)
        .neq('id', jobId)
        .eq('is_featured', true)
      if (othersErr) {
        return NextResponse.json({ error: othersErr.message }, { status: 500 })
      }
    }

    const { error: featureErr } = await supabase
      .from('video_jobs_v2')
      .update({ is_featured: true, updated_at: now })
      .eq('id', jobId)
    if (featureErr) {
      return NextResponse.json({ error: featureErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, featured: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = getServiceClient()

    const { error } = await supabase.from('video_jobs_v2').delete().eq('id', jobId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
