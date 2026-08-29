import { getInstagramAccessToken } from '@/lib/videos/instagram-token'
import { INSTAGRAM_HIGHLIGHT_ID } from '@/lib/home/instagram-highlight-constants'

const IG_API = 'https://graph.instagram.com/v21.0'

export type HighlightStory = {
  id: string
  src: string
  alt: string
  permalink?: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string
}

export type InstagramStorySource = 'highlight' | 'stories' | 'media' | 'empty'

type GraphNode = {
  id?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  caption?: string
}

function highlightId() {
  return process.env.INSTAGRAM_HIGHLIGHT_ID?.trim() || INSTAGRAM_HIGHLIGHT_ID
}

function storyFromNode(node: GraphNode, index: number): HighlightStory | null {
  const isVideo = node.media_type === 'VIDEO'
  const src = ((isVideo ? node.thumbnail_url : node.media_url) || node.thumbnail_url || node.media_url || '').trim()
  if (!src) return null
  const caption = typeof node.caption === 'string' ? node.caption.trim() : ''
  return {
    id: node.id || `highlight-${index}`,
    src,
    alt: caption ? caption.slice(0, 80) : 'K-si Nuevos en Instagram',
    permalink: typeof node.permalink === 'string' ? node.permalink : undefined,
    mediaType: node.media_type || (isVideo ? 'VIDEO' : 'IMAGE'),
  }
}

function collectFromPayload(payload: unknown): HighlightStory[] {
  const stories: HighlightStory[] = []
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (Array.isArray(record.data)) {
      record.data.forEach(walk)
      return
    }
    if (record.children && typeof record.children === 'object') {
      walk(record.children)
    }
    const node = record as GraphNode
    if (node.media_url || node.thumbnail_url) {
      const story = storyFromNode(node, stories.length)
      if (story) stories.push(story)
    }
    if (Array.isArray(record.items)) record.items.forEach(walk)
  }
  walk(payload)
  const seen = new Set<string>()
  return stories.filter((story) => {
    if (seen.has(story.src)) return false
    seen.add(story.src)
    return true
  })
}

async function graphGet(path: string, token: string): Promise<unknown | null> {
  const url = path.startsWith('http') ? path : `${IG_API}/${path.replace(/^\//, '')}`
  const separator = url.includes('?') ? '&' : '?'
  try {
    const res = await fetch(`${url}${separator}access_token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 1800 },
    })
    const json = (await res.json().catch(() => null)) as unknown
    if (!res.ok) {
      console.warn('[instagram-highlight]', res.status, JSON.stringify(json).slice(0, 400))
      return null
    }
    return json
  } catch {
    return null
  }
}

const MEDIA_FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp'

export async function fetchInstagramHomeStories(): Promise<{
  stories: HighlightStory[]
  source: InstagramStorySource
}> {
  const { token } = await getInstagramAccessToken()
  if (!token) return { stories: [], source: 'empty' }

  const id = highlightId()
  const userId = process.env.INSTAGRAM_USER_ID?.trim()
  const highlightAttempts = [
    `${id}?fields=id,title,children{${MEDIA_FIELDS}}`,
    `${id}?fields=id,title,stories{${MEDIA_FIELDS}}`,
    `${id}/stories?fields=${MEDIA_FIELDS}`,
  ]
  const liveAttempts = [
    `me/stories?fields=${MEDIA_FIELDS}`,
    userId ? `${userId}/stories?fields=${MEDIA_FIELDS}` : '',
  ].filter(Boolean)
  const feedAttempts = [
    `me/media?fields=${MEDIA_FIELDS}&limit=16`,
    userId ? `${userId}/media?fields=${MEDIA_FIELDS}&limit=16` : '',
  ].filter(Boolean)

  const [highlightPayloads, livePayloads, feedPayloads] = await Promise.all([
    Promise.all(highlightAttempts.map((path) => graphGet(path, token))),
    Promise.all(liveAttempts.map((path) => graphGet(path, token))),
    Promise.all(feedAttempts.map((path) => graphGet(path, token))),
  ])

  const firstStories = (payloads: unknown[]) => {
    for (const payload of payloads) {
      if (!payload) continue
      const stories = collectFromPayload(payload)
      if (stories.length > 0) return stories
    }
    return []
  }

  const highlightStories = firstStories(highlightPayloads)
  if (highlightStories.length > 0) return { stories: highlightStories, source: 'highlight' }

  const liveStories = firstStories(livePayloads)
  if (liveStories.length > 0) return { stories: liveStories, source: 'stories' }

  const feedStories = firstStories(feedPayloads)
  if (feedStories.length > 0) return { stories: feedStories, source: 'media' }

  return { stories: [], source: 'empty' }
}

export async function fetchInstagramHighlightStories(): Promise<HighlightStory[]> {
  const { stories } = await fetchInstagramHomeStories()
  return stories
}
