const IG_API = 'https://graph.instagram.com/v21.0'

function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Instagram respuesta no JSON (${res.status}): ${text.slice(0, 400)}`)
  }
}

export interface InstagramPublishResult {
  mediaId: string
  containerId: string
}

/**
 * Publica un Reel en Instagram desde URL pública del MP4 (Creatomate).
 */
export async function publishInstagramReel(videoUrl: string, caption: string): Promise<InstagramPublishResult> {
  const userId = process.env.INSTAGRAM_USER_ID
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!userId || !token) {
    throw new Error('INSTAGRAM_USER_ID o INSTAGRAM_ACCESS_TOKEN no configurados')
  }

  const containerRes = await fetch(`${IG_API}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      media_type: 'REELS',
      video_url: videoUrl,
      caption,
      access_token: token,
    }),
  })

  const containerJson = await readJson(containerRes)
  if (!containerRes.ok) {
    const err = JSON.stringify(containerJson)
    console.error('[Instagram] crear container:', err)
    throw new Error(err)
  }

  const containerId = String(containerJson.id ?? '')
  if (!containerId) throw new Error('Instagram no devolvió id de container')

  let statusCode = ''
  let attempts = 0
  while (statusCode !== 'FINISHED' && attempts < 24) {
    if (attempts > 0) await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await fetch(
      `${IG_API}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`
    )
    const statusData = await readJson(statusRes)
    statusCode = String(statusData.status_code ?? '')
    attempts++
    if (statusCode === 'ERROR') {
      console.error('[Instagram] container ERROR', statusData)
      throw new Error('Instagram container processing failed')
    }
  }

  if (statusCode !== 'FINISHED') {
    throw new Error('Instagram: timeout esperando procesamiento del video')
  }

  const publishRes = await fetch(`${IG_API}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      creation_id: containerId,
      access_token: token,
    }),
  })
  const publishJson = await readJson(publishRes)
  if (!publishRes.ok) {
    console.error('[Instagram] media_publish:', JSON.stringify(publishJson))
    throw new Error(JSON.stringify(publishJson))
  }
  const mediaId = String(publishJson.id ?? '')
  if (!mediaId) throw new Error('Instagram no devolvió id del media publicado')

  console.log('[Instagram] Publicado media_id=', mediaId, 'container=', containerId)
  return { mediaId, containerId }
}

export function isInstagramOAuth190Error(message: string): boolean {
  try {
    const o = JSON.parse(message) as { error?: { code?: number; error_subcode?: number } }
    return o?.error?.code === 190
  } catch {
    return message.includes('"code":190') || message.includes('code": 190')
  }
}
