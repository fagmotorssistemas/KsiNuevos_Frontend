import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { campaignsFrom } from '@/lib/marketing/campaigns-db'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ vehicleId: string }> }

function parseNonNegativeInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { vehicleId } = await context.params
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes) : null

  const reelsCount = parseNonNegativeInt(body.reelsCount)
  if (reelsCount !== null) patch.reels_count = reelsCount

  const postsCount = parseNonNegativeInt(body.postsCount)
  if (postsCount !== null) patch.posts_count = postsCount

  if (typeof body.needsVideo === 'boolean') patch.needs_video = body.needsVideo
  if (typeof body.needsPhotos === 'boolean') patch.needs_photos = body.needsPhotos

  if (
    body.videoStatus === 'pending' ||
    body.videoStatus === 'done' ||
    body.videoStatus === 'needs_another'
  ) {
    patch.video_status = body.videoStatus
  }
  if (typeof body.sortOrder === 'number') patch.sort_order = body.sortOrder

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await campaignsFrom(supabase, 'marketing_campaign_vehicles')
    .update(patch)
    .eq('id', vehicleId)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vehicle: data })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { vehicleId } = await context.params
  const supabase = await createServerSupabaseClient()
  const { error } = await campaignsFrom(supabase, 'marketing_campaign_vehicles')
    .delete()
    .eq('id', vehicleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
