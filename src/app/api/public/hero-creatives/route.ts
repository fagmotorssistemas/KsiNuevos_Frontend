import { NextResponse } from 'next/server'
import { fetchReadyCreativeBlocks } from '@/lib/marketing/inventory-vehicle-creatives'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const blocks = await fetchReadyCreativeBlocks()
    return NextResponse.json(
      { blocks },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[hero-creatives]', message)
    return NextResponse.json({ blocks: [] }, { status: 200 })
  }
}
