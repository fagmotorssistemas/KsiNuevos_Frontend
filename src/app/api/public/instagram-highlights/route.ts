import { NextResponse } from 'next/server'
import { INSTAGRAM_HIGHLIGHT_URL } from '@/lib/home/instagram-highlight-constants'
import { fetchInstagramHomeStories } from '@/lib/home/instagram-highlights'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { stories, source } = await fetchInstagramHomeStories()
    return NextResponse.json(
      {
        stories,
        highlightUrl: INSTAGRAM_HIGHLIGHT_URL,
        source,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
        },
      }
    )
  } catch (err) {
    console.error('[instagram-highlights]', err)
    return NextResponse.json({ stories: [], highlightUrl: INSTAGRAM_HIGHLIGHT_URL, source: 'empty' })
  }
}
