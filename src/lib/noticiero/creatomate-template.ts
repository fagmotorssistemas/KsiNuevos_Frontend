import { getNoticieroEnv } from './env'
import type { CreatomateV1RenderRequest, CreatomateV1RenderResponse } from './types'

const CREATOMATE_V1_BASE = 'https://api.creatomate.com/v1'
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

function creatomateHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getNoticieroEnv('CREATOMATE_API_KEY')}`,
    'Content-Type': 'application/json',
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Creatomate respuesta no JSON (${res.status}): ${text.slice(0, 400)}`)
  }
}

export async function renderNoticieroTemplate(
  heygenVideoUrl: string,
  bannerTitle: string
): Promise<{ renderId: string; videoUrl: string }> {
  const title = bannerTitle.trim()
  if (!title) {
    throw new Error('El titular del banner (titulo_vehiculo) es requerido para Creatomate')
  }

  // La plantilla usa {{titulo_vehiculo}}; Creatomate espera esa clave dinámica (no solo el name del elemento).
  const body: CreatomateV1RenderRequest = {
    template_id: getNoticieroEnv('CREATOMATE_TEMPLATE_ID'),
    modifications: {
      'Avatar-HeyGen': heygenVideoUrl,
      'bg-video': heygenVideoUrl,
      titulo_vehiculo: title,
      'Titulo-Vehiculo': title,
      'Titulo-Vehiculo.text': title,
    },
  }

  console.log('[noticiero/creatomate] POST /v1/renders template=', body.template_id, 'titulo=', title)
  const createRes = await fetch(`${CREATOMATE_V1_BASE}/renders`, {
    method: 'POST',
    headers: creatomateHeaders(),
    body: JSON.stringify(body),
  })

  const created = await readJson<CreatomateV1RenderResponse | CreatomateV1RenderResponse[]>(createRes)
  if (!createRes.ok) {
    console.error('[noticiero/creatomate] Error create:', created)
    throw new Error(`Creatomate HTTP ${createRes.status}: ${JSON.stringify(created)}`)
  }

  const render = Array.isArray(created) ? created[0] : created
  if (!render?.id) throw new Error('Creatomate no devolvió id de render')

  const renderId = render.id
  console.log('[noticiero/creatomate] render_id=', renderId)

  if (render.status === 'succeeded' && render.url) {
    return { renderId, videoUrl: render.url }
  }

  const started = Date.now()
  let attempt = 0

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    attempt++

    const statusRes = await fetch(`${CREATOMATE_V1_BASE}/renders/${renderId}`, {
      method: 'GET',
      headers: creatomateHeaders(),
    })
    const statusJson = await readJson<CreatomateV1RenderResponse>(statusRes)

    if (!statusRes.ok) {
      console.error('[noticiero/creatomate] Error status:', statusJson)
      throw new Error(`Creatomate status HTTP ${statusRes.status}: ${JSON.stringify(statusJson)}`)
    }

    console.log(`[noticiero/creatomate] Poll #${attempt} status=${statusJson.status}`)

    if (statusJson.status === 'succeeded' && statusJson.url) {
      console.log('[noticiero/creatomate] Video final:', statusJson.url)
      return { renderId, videoUrl: statusJson.url }
    }

    if (statusJson.status === 'failed') {
      throw new Error(
        `Creatomate falló al componer el video: ${statusJson.error_message ?? 'error desconocido'}`
      )
    }
  }

  throw new Error('Creatomate: tiempo de espera agotado al componer el video (5 minutos).')
}
