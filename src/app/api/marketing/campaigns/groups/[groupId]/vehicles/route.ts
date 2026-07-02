import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { campaignsFrom } from '@/lib/marketing/campaigns-db'
import {
  inferCampaignSegment,
  normalizeCategoryToSegment,
  segmentLabel,
} from '@/lib/marketing/campaign-segments'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ groupId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { groupId } = await context.params
  const body = await request.json().catch(() => ({}))
  const inventoryId = String(body.inventoryId ?? '').trim()

  if (!inventoryId) {
    return NextResponse.json({ error: 'inventoryId requerido' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const [{ data: inv, error: invErr }, { data: group, error: groupErr }, { data: existing }] =
    await Promise.all([
      supabase
        .from('inventoryoracle')
        .select('id, brand, model, type_body, type, price, internal_fixed_price')
        .eq('id', inventoryId)
        .single(),
      campaignsFrom(supabase, 'marketing_campaign_groups')
        .select('id, vehicle_category, name')
        .eq('id', groupId)
        .single(),
      campaignsFrom(supabase, 'marketing_campaign_vehicles')
        .select('sort_order')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: false })
        .limit(1),
    ])

  if (invErr || !inv) {
    return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
  }
  if (groupErr || !group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
  }

  const groupSegment =
    normalizeCategoryToSegment(group.vehicle_category) ??
    normalizeCategoryToSegment(group.name) ??
    'suv'
  const vehicleSegment = inferCampaignSegment(inv)

  if (vehicleSegment && vehicleSegment !== groupSegment) {
    return NextResponse.json(
      {
        error: `Este vehículo es ${segmentLabel(vehicleSegment)} y el grupo es ${segmentLabel(groupSegment)}`,
      },
      { status: 400 }
    )
  }

  const { count: assignedElsewhere } = await campaignsFrom(supabase, 'marketing_campaign_vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('inventory_id', inventoryId)

  if ((assignedElsewhere ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Este vehículo ya está asignado a otra campaña del mes' },
      { status: 409 }
    )
  }

  const priceSnapshot =
    inv.internal_fixed_price != null
      ? inv.internal_fixed_price
      : inv.price != null && inv.price > 0
        ? inv.price
        : null

  const nextSort = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1

  const { data, error } = await campaignsFrom(supabase, 'marketing_campaign_vehicles')
    .insert({
      group_id: groupId,
      inventory_id: inventoryId,
      sort_order: nextSort,
      price_snapshot: priceSnapshot,
      video_status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vehicle: data })
}
