import { NextResponse } from 'next/server'
import { fetchHeroInventorySlides } from '@/lib/home/hero-inventory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const slides = await fetchHeroInventorySlides()
    return NextResponse.json(
      { slides },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[hero-inventory]', message)
    return NextResponse.json({ slides: [] }, { status: 200 })
  }
}
