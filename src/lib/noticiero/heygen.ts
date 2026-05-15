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
const POLL_TIMEOUT_MS = 3 * 60 * 1000

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

function extractStatus(payload: HeyGenStatusResponse): { status: string; videoUrl?: string; error?: string } {
  const data: HeyGenStatusData = payload.data ?? {
    status: payload.status,
    video_url: payload.video_url,
  }
  return {
    status: String(data.status ?? '').toLowerCase(),
    videoUrl: data.video_url,
    error: data.error ?? undefined,
  }
}

export async function generateHeyGenAvatar(script: string): Promise<{ videoId: string; videoUrl: string }> {
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
        background: {
          type: 'color',
          value: '#ffffff',
        },
      },
    ],
    dimension: { width: 1280, height: 720 },
  }

  console.log('[noticiero/heygen] Enviando guión a HeyGen (', script.length, 'caracteres)')
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
  console.log('[noticiero/heygen] video_id=', videoId, '— iniciando polling')

  const started = Date.now()
  let attempt = 0

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    attempt++

    const statusUrl = `${HEYGEN_STATUS_URL}?video_id=${encodeURIComponent(videoId)}`
    const statusRes = await fetch(statusUrl, { method: 'GET', headers: heygenHeaders() })
    const statusJson = await readJson<HeyGenStatusResponse>(statusRes)

    if (!statusRes.ok) {
      console.error('[noticiero/heygen] Error status:', statusJson)
      throw new Error(`HeyGen status HTTP ${statusRes.status}: ${JSON.stringify(statusJson)}`)
    }

    const { status, videoUrl, error } = extractStatus(statusJson)
    console.log(`[noticiero/heygen] Poll #${attempt} status=${status}`)

    if (status === 'completed' && videoUrl) {
      console.log('[noticiero/heygen] Video listo:', videoUrl)
      return { videoId, videoUrl }
    }

    if (status === 'failed' || error) {
      throw new Error(`HeyGen falló al generar el avatar: ${error ?? status}`)
    }
  }

  throw new Error(
    'HeyGen: tiempo de espera agotado (3 minutos). El avatar puede seguir procesándose; intente de nuevo en unos minutos.'
  )
}
