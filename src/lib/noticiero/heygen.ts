import { isAllowedNoticieroBackgroundUrl, NOTICIERO_WHITE_BACKGROUND } from './backgrounds-storage'
import { getNoticieroEnv } from './env'
import type {
  HeyGenGenerateBody,
  HeyGenGenerateResponse,
  HeyGenStatusData,
  HeyGenStatusResponse,
} from './types'

const HEYGEN_GENERATE_URL = 'https://api.heygen.com/v2/video/generate'
const HEYGEN_STATUS_URL = 'https://api.heygen.com/v1/video_status.get'
const POLL_INTERVAL_MS = 5_000
/** Polls extra tras el timeout principal (HeyGen suele pasar de processing → completed justo después). */
const GRACE_POLL_ATTEMPTS = 12

/** Por defecto 8 min; HeyGen con fondo de imagen a veces supera 5 min en processing. */
function getPollTimeoutMs(): number {
  const raw = process.env.HEYGEN_POLL_TIMEOUT_MS?.trim()
  if (raw) {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 60_000) return n
  }
  return 8 * 60 * 1000
}

export function isHeyGenTimeoutError(message: string): boolean {
  return message.includes('tiempo de espera agotado')
}

function heygenHeaders(): HeadersInit {
  return {
    'X-Api-Key': getNoticieroEnv('HEYGEN_API_KEY'),
    'Content-Type': 'application/json',
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`HeyGen respuesta no JSON (${res.status}): ${text.slice(0, 400)}`)
  }
}

function extractVideoId(payload: HeyGenGenerateResponse): string {
  const id = payload.data?.video_id ?? payload.video_id
  if (!id) throw new Error('HeyGen no devolvió video_id')
  return id
}

function formatHeyGenError(error: unknown): string | undefined {
  if (error == null) return undefined
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const o = error as { message?: string; detail?: string; code?: number }
    const parts = [o.message, o.detail].filter(Boolean)
    if (parts.length) return parts.join(' — ')
    return JSON.stringify(error)
  }
  return String(error)
}

function extractStatus(payload: HeyGenStatusResponse): {
  ok: boolean
  status: string
  videoUrl?: string
  error?: string
} {
  const code = payload.code
  const data: HeyGenStatusData = payload.data ?? {
    status: payload.status,
    video_url: payload.video_url,
  }

  const apiError = formatHeyGenError(data.error)
  const status = String(data.status ?? '').toLowerCase().trim()

  return {
    ok: code === undefined || code === 100,
    status,
    videoUrl: data.video_url ?? undefined,
    error: apiError,
  }
}

async function fetchHeyGenStatusOnce(videoId: string): Promise<{
  status: string
  videoUrl?: string
  error?: string
}> {
  const statusUrl = `${HEYGEN_STATUS_URL}?video_id=${encodeURIComponent(videoId)}`
  const statusRes = await fetch(statusUrl, { method: 'GET', headers: heygenHeaders() })
  const statusJson = await readJson<HeyGenStatusResponse>(statusRes)

  if (!statusRes.ok) {
    throw new Error(`HeyGen status HTTP ${statusRes.status}: ${JSON.stringify(statusJson)}`)
  }

  const { ok, status, videoUrl, error } = extractStatus(statusJson)
  if (!ok) {
    throw new Error(`HeyGen API code inválido: ${JSON.stringify(statusJson)}`)
  }

  return { status, videoUrl, error }
}

/** Consulta HeyGen una vez; útil si el polling principal hizo timeout pero el video ya terminó. */
export async function tryGetHeyGenVideoUrl(videoId: string): Promise<string | null> {
  try {
    const { status, videoUrl, error } = await fetchHeyGenStatusOnce(videoId)
    if (status === 'failed') {
      console.warn('[noticiero/heygen] Estado failed al reconsultar:', error)
      return null
    }
    if (videoUrl) return videoUrl
    if (status === 'completed') {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      const retry = await fetchHeyGenStatusOnce(videoId)
      return retry.videoUrl ?? null
    }
    return null
  } catch (err) {
    console.warn('[noticiero/heygen] tryGetHeyGenVideoUrl:', err)
    return null
  }
}

export async function pollHeyGenVideo(videoId: string): Promise<string> {
  const timeoutMs = getPollTimeoutMs()
  const started = Date.now()
  let attempt = 0
  let lastStatus = ''
  const pollOnce = async (): Promise<string | null> => {
    const { status, videoUrl, error } = await fetchHeyGenStatusOnce(videoId)
    lastStatus = status

    if (status === 'completed' && videoUrl) {
      console.log('[noticiero/heygen] Video listo:', videoUrl)
      return videoUrl
    }
    if (status === 'completed') {
      console.log('[noticiero/heygen] completed sin URL aún, esperando siguiente poll...')
    }
    if (status === 'failed') {
      throw new Error(`HeyGen falló al generar el avatar: ${error ?? 'estado failed'}`)
    }
    return null
  }

  while (Date.now() - started < timeoutMs) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    attempt++

    const elapsedSec = Math.round((Date.now() - started) / 1000)
    const url = await pollOnce()
    console.log(
      `[noticiero/heygen] Poll #${attempt} (${elapsedSec}s) status=${lastStatus} url=${url ? 'yes' : 'no'}`
    )
    if (url) return url
  }

  console.log(
    `[noticiero/heygen] Timeout principal (${Math.round(timeoutMs / 60_000)} min, status=${lastStatus}). Grace polls…`
  )

  for (let g = 0; g < GRACE_POLL_ATTEMPTS; g++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const url = await pollOnce()
    console.log(`[noticiero/heygen] Grace poll #${g + 1} status=${lastStatus} url=${url ? 'yes' : 'no'}`)
    if (url) return url
  }

  const recovered = await tryGetHeyGenVideoUrl(videoId)
  if (recovered) {
    console.log('[noticiero/heygen] URL recuperada tras grace period')
    return recovered
  }

  const timeoutMin = Math.round(timeoutMs / 60_000)
  console.error(
    '[noticiero/heygen] Timeout definitivo tras',
    timeoutMin,
    'min + grace. Último status=',
    lastStatus
  )

  throw new Error(
    `HeyGen: tiempo de espera agotado (${timeoutMin} minutos, último estado: "${lastStatus || 'desconocido'}"). ` +
      'El video puede seguir procesándose en HeyGen; el sistema reintentará automáticamente.'
  )
}

function resolveHeyGenBackground(backgroundUrl?: string | null): HeyGenGenerateBody['video_inputs'][0]['background'] {
  const url = backgroundUrl?.trim()
  if (url) {
    if (!isAllowedNoticieroBackgroundUrl(url)) {
      throw new Error('URL de fondo no válida (debe ser del bucket noticiero-fondos)')
    }
    return { type: 'image', url }
  }
  return { type: 'color', value: NOTICIERO_WHITE_BACKGROUND }
}

export async function startHeyGenGeneration(
  script: string,
  backgroundUrl?: string | null
): Promise<string> {
  const background = resolveHeyGenBackground(backgroundUrl)
  const body: HeyGenGenerateBody = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: getNoticieroEnv('HEYGEN_AVATAR_ID'),
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id: getNoticieroEnv('HEYGEN_VOICE_ID'),
            input_text: script,
          },
          background,
        },
      ],
      dimension: { width: 1280, height: 720 },
    }

    console.log(
      '[noticiero/heygen] Enviando guión a HeyGen (',
      script.length,
      'caracteres), fondo=',
      background.type
    )
    const genRes = await fetch(HEYGEN_GENERATE_URL, {
      method: 'POST',
      headers: heygenHeaders(),
      body: JSON.stringify(body),
    })

    const genJson = await readJson<HeyGenGenerateResponse>(genRes)
    if (!genRes.ok) {
      console.error('[noticiero/heygen] Error generate:', genJson)
      throw new Error(`HeyGen generate HTTP ${genRes.status}: ${JSON.stringify(genJson)}`)
    }

  const videoId = extractVideoId(genJson)
  console.log('[noticiero/heygen] video_id=', videoId)
  return videoId
}

export async function generateHeyGenAvatar(
  script: string,
  opts?: { existingVideoId?: string; backgroundUrl?: string | null }
): Promise<{ videoId: string; videoUrl: string }> {
  const videoId = opts?.existingVideoId?.trim()
    ? opts.existingVideoId.trim()
    : await startHeyGenGeneration(script, opts?.backgroundUrl)

  if (opts?.existingVideoId) {
    console.log('[noticiero/heygen] Reanudando polling para video_id=', videoId)
  } else {
    console.log('[noticiero/heygen] Iniciando polling')
  }

  const videoUrl = await pollHeyGenVideo(videoId)
  return { videoId, videoUrl }
}
