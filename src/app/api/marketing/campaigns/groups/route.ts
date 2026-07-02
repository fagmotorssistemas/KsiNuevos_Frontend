import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { campaignsFrom } from '@/lib/marketing/campaigns-db'
import { currentCampaignMonth } from '@/types/marketing-campaigns'
import { normalizeCategoryToSegment } from '@/lib/marketing/campaign-segments'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const campaignMonth = String(body.campaignMonth ?? currentCampaignMonth()).trim()
  const segmentInput = body.segment ?? body.vehicleCategory
  const segmentSlug =
    typeof segmentInput === 'string' ? normalizeCategoryToSegment(segmentInput) : null
  const vehicleCategory =
    segmentSlug != null
      ? segmentSlug
      : segmentInput
        ? String(segmentInput).trim()
        : null
  const status = body.status === 'active' || body.status === 'completed' ? body.status : 'draft'

  if (!name) {
    return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: existing } = await campaignsFrom(supabase, 'marketing_campaign_groups')
    .select('sort_order')
    .eq('campaign_month', campaignMonth)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1

  const { data, error } = await campaignsFrom(supabase, 'marketing_campaign_groups')
    .insert({
      name,
      campaign_month: campaignMonth,
      vehicle_category: vehicleCategory,
      status,
      sort_order: nextSort,
      created_by: auth.userId,
    })
    .select('id, name, campaign_month, status, sort_order')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ group: data })
}
