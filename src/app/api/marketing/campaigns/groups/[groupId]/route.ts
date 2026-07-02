import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { campaignsFrom } from '@/lib/marketing/campaigns-db'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ groupId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { groupId } = await context.params
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (body.status === 'draft' || body.status === 'active' || body.status === 'completed') {
    patch.status = body.status
  }
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes) : null
  if (typeof body.sortOrder === 'number') patch.sort_order = body.sortOrder
  if (body.vehicleCategory !== undefined) {
    patch.vehicle_category = body.vehicleCategory ? String(body.vehicleCategory) : null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await campaignsFrom(supabase, 'marketing_campaign_groups')
    .update(patch)
    .eq('id', groupId)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ group: data })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { groupId } = await context.params
  const supabase = await createServerSupabaseClient()
  const { error } = await campaignsFrom(supabase, 'marketing_campaign_groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
