const FB_API = 'https://graph.facebook.com/v25.0'
const FB_RUPLOAD = 'https://rupload.facebook.com/video-upload/v25.0'

const POLL_INTERVAL_MS = 5000
const POLL_MAX_ATTEMPTS = 60

export interface FacebookPublishResult {
  /** Permalink público, post_id o video_id. */
  postId: string
  videoId: string
  permalinkUrl?: string
}

export type FacebookPublishDiagnostics = {
  tokenValid: boolean
  scopes: string[]
  missingScopes: string[]
  appId: string | null
  userId: string | null
  visibilityHint: string | null
}

type FbPhase = { status?: string; error?: { message?: string } }

type FbVideoStatusPayload = {
  video_status?: string
  uploading_phase?: FbPhase
  processing_phase?: FbPhase
  publishing_phase?: FbPhase
}

const REQUIRED_PAGE_SCOPES = ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'] as const

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function readFbJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Facebook respuesta no JSON (${res.status}): ${text.slice(0, 400)}`)
  }
}

function fbErrorMessage(json: Record<string, unknown>, fallback: string): string {
  const err = json.error as { message?: string } | undefined
  return err?.message ?? fallback
}

function assertPhaseOk(phase: FbPhase | undefined, label: string) {
  const msg = phase?.error?.message
  if (msg) throw new Error(`Facebook (${label}): ${msg}`)
}

function visibilityErrorMessage(extra?: string): string {
  const base =
    'El Reel se subió a Meta pero no quedó visible para el público. ' +
    'Causa más común: la app de Meta está en modo Desarrollo (solo admins/testers ven las publicaciones). ' +
    'En developers.facebook.com → tu app → activa modo Live y solicita revisión de pages_manage_posts. ' +
    'También revisa en Meta Business Suite que el Reel no esté en borrador.'
  return extra ? `${base} (${extra})` : base
}

async function getVideoStatus(videoId: string, token: string): Promise<FbVideoStatusPayload> {
  const res = await fetch(
    `${FB_API}/${videoId}?fields=status&access_token=${encodeURIComponent(token)}`
  )
  const json = await readFbJson(res)
  if (!res.ok) {
    console.error('[Facebook] status error', json)
    throw new Error(fbErrorMessage(json, `Error consultando video ${videoId}`))
  }
  return (json.status as FbVideoStatusPayload) ?? {}
}

async function waitForVideoStatus(
  videoId: string,
  token: string,
  predicate: (s: FbVideoStatusPayload) => boolean,
  label: string
) {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    if (i > 0) await sleep(POLL_INTERVAL_MS)
    const s = await getVideoStatus(videoId, token)
    assertPhaseOk(s.uploading_phase, 'subida')
    assertPhaseOk(s.processing_phase, 'procesamiento')
    assertPhaseOk(s.publishing_phase, 'publicación')
    if (predicate(s)) {
      console.log(`[Facebook] ${label} listo video_id=${videoId}`, JSON.stringify(s))
      return
    }
  }
  throw new Error(`Facebook: tiempo de espera agotado (${label})`)
}

async function verifyReelIsPublic(
  videoId: string,
  postId: string | undefined,
  token: string
): Promise<{ postId: string; permalinkUrl?: string }> {
  const res = await fetch(
    `${FB_API}/${videoId}?fields=permalink_url,post_id,published,status&access_token=${encodeURIComponent(token)}`
  )
  const json = await readFbJson(res)
  if (!res.ok) {
    console.warn('[Facebook] verificación publicación', json)
    throw new Error(fbErrorMessage(json, 'No se pudo verificar el Reel publicado'))
  }

  const published = json.published === true
  const permalink = typeof json.permalink_url === 'string' ? json.permalink_url : undefined
  const resolvedPostId =
    typeof json.post_id === 'string' ? json.post_id : postId ?? videoId

  if (!published) {
    const status = json.status as FbVideoStatusPayload | undefined
    const phase = status?.publishing_phase?.status ?? status?.video_status ?? 'desconocido'
    throw new Error(visibilityErrorMessage(`published=false, fase=${phase}`))
  }

  if (postId) {
    const postRes = await fetch(
      `${FB_API}/${resolvedPostId}?fields=is_published,permalink_url&access_token=${encodeURIComponent(token)}`
    )
    const postJson = await readFbJson(postRes)
    if (postRes.ok) {
      if (postJson.is_published === false) {
        throw new Error(visibilityErrorMessage('post is_published=false'))
      }
      const postPermalink =
        typeof postJson.permalink_url === 'string' ? postJson.permalink_url : undefined
      return {
        postId: postPermalink ?? permalink ?? resolvedPostId,
        permalinkUrl: postPermalink ?? permalink,
      }
    }
  }

  if (!permalink && !postId) {
    throw new Error(visibilityErrorMessage('sin permalink ni post_id'))
  }

  return { postId: permalink ?? resolvedPostId, permalinkUrl: permalink }
}

/**
 * Diagnóstico del token de página (scopes, app). Útil en /api/videos/publish/health.
 */
export async function getFacebookPublishDiagnostics(): Promise<FacebookPublishDiagnostics | null> {
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!pageToken || !appId || !appSecret) return null

  const appToken = `${appId}|${appSecret}`
  const res = await fetch(
    `${FB_API}/debug_token?input_token=${encodeURIComponent(pageToken)}&access_token=${encodeURIComponent(appToken)}`
  )
  const json = await readFbJson(res)
  const data = json.data as
    | { is_valid?: boolean; scopes?: string[]; app_id?: string; user_id?: string }
    | undefined

  const scopes = data?.scopes ?? []
  const missingScopes = REQUIRED_PAGE_SCOPES.filter((s) => !scopes.includes(s))

  let visibilityHint: string | null = null
  if (!data?.is_valid) {
    visibilityHint = 'Token de página inválido o expirado.'
  } else if (missingScopes.length > 0) {
    visibilityHint = `Faltan permisos en el token: ${missingScopes.join(', ')}.`
  } else {
    visibilityHint =
      'Si solo los admins ven los Reels, la app Meta suele estar en modo Desarrollo. Activa modo Live en developers.facebook.com.'
  }

  return {
    tokenValid: !!data?.is_valid,
    scopes,
    missingScopes,
    appId: data?.app_id ?? null,
    userId: data?.user_id ?? null,
    visibilityHint,
  }
}

/**
 * Publica un Reel en la página de Facebook (Reels Publishing API).
 * @see https://developers.facebook.com/docs/video-api/guides/reels-publishing/
 */
export async function publishFacebookPageReel(videoUrl: string, description: string): Promise<FacebookPublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !token) {
    throw new Error('FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN no configurados')
  }

  const startRes = await fetch(`${FB_API}/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'start',
      access_token: token,
    }),
  })
  const startJson = await readFbJson(startRes)
  if (!startRes.ok) {
    console.error('[Facebook] start session error', startJson)
    throw new Error(fbErrorMessage(startJson, 'No se pudo iniciar sesión de subida'))
  }

  const videoId = String(startJson.video_id ?? '')
  if (!videoId) throw new Error('Facebook no devolvió video_id al iniciar Reel')

  const uploadRes = await fetch(`${FB_RUPLOAD}/${videoId}`, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      file_url: videoUrl,
    },
  })
  const uploadJson = await readFbJson(uploadRes)
  if (!uploadRes.ok || uploadJson.success !== true) {
    console.error('[Facebook] upload error', uploadJson)
    throw new Error(fbErrorMessage(uploadJson, 'Error subiendo video a Meta'))
  }

  await waitForVideoStatus(
    videoId,
    token,
    (s) => s.uploading_phase?.status === 'complete',
    'subida del archivo'
  )

  const finishRes = await fetch(`${FB_API}/${pageId}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'finish',
      video_id: videoId,
      video_state: 'PUBLISHED',
      description,
      access_token: token,
    }),
  })
  const finishJson = await readFbJson(finishRes)
  if (!finishRes.ok || finishJson.success !== true) {
    console.error('[Facebook] finish publish error', finishJson)
    throw new Error(fbErrorMessage(finishJson, 'Error publicando Reel'))
  }

  const finishPostId = typeof finishJson.post_id === 'string' ? finishJson.post_id : undefined
  if (finishPostId) {
    console.log('[Facebook] finish post_id=', finishPostId)
  }

  await waitForVideoStatus(
    videoId,
    token,
    (s) => s.publishing_phase?.status === 'complete',
    'publicación del Reel en el feed'
  )

  const { postId, permalinkUrl } = await verifyReelIsPublic(videoId, finishPostId, token)
  console.log('[Facebook] Reel público verificado video_id=', videoId, 'link=', postId)
  return { postId, videoId, permalinkUrl }
}

/** @deprecated Usar publishFacebookPageReel — alias para compatibilidad. */
export const publishFacebookPageVideo = publishFacebookPageReel
