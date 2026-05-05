const FB_API = 'https://graph.facebook.com/v25.0'

export interface FacebookPublishResult {
  postId: string
}

export async function publishFacebookPageVideo(videoUrl: string, description: string): Promise<FacebookPublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !token) {
    throw new Error('FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN no configurados')
  }

  const res = await fetch(`${FB_API}/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_url: videoUrl,
      description,
      access_token: token,
    }),
  })
  const json = (await res.json()) as { id?: string; error?: { message?: string; code?: number } }
  if (!res.ok) {
    console.error('[Facebook] publish error', json)
    throw new Error(JSON.stringify(json))
  }
  const postId = json.id ?? ''
  if (!postId) throw new Error('Facebook no devolvió id del video')
  console.log('[Facebook] Publicado post_id=', postId)
  return { postId }
}
