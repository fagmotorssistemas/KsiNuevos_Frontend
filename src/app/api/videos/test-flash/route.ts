import { NextResponse } from 'next/server'

const flashSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">' +
  '<defs>' +
  '<radialGradient id="flash" cx="50%" cy="50%" r="60%">' +
  '<stop offset="0%" stop-color="#FFE94A" stop-opacity="1"/>' +
  '<stop offset="60%" stop-color="#FF8C00" stop-opacity="1"/>' +
  '<stop offset="100%" stop-color="#FF4500" stop-opacity="0.8"/>' +
  '</radialGradient>' +
  '</defs>' +
  '<rect width="720" height="1280" fill="url(#flash)"/>' +
  '</svg>'

const TEST_VIDEO_SRC =
  'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/footage/skater.hls'

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/videos/test-flash',
    usage: 'POST /api/videos/test-flash',
    description:
      'Render de prueba (6 s): 2 clips de video + destello amarillo-naranja SVG en t≈3 s (corte clip 2→3).',
    instructions: [
      '1. Asegúrate de tener SHOTSTACK_API_KEY y SHOTSTACK_BASE_URL en .env',
      '2. Ejecuta: curl -X POST http://localhost:3000/api/videos/test-flash',
      '3. Recibirás { renderId } — consulta estado en el dashboard de Shotstack o vía API',
      '4. Endpoint temporal para validar destello antes de integrarlo en el clip 4 del pipeline',
    ],
    timeline: {
      durationSec: 6,
      flashAtSec: 3,
      flashStartSec: 2.92,
      flashLengthSec: 0.16,
    },
  })
}

export async function POST() {
  const apiKey = process.env.SHOTSTACK_API_KEY?.trim()
  const baseUrl = process.env.SHOTSTACK_BASE_URL?.trim()

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: 'Faltan SHOTSTACK_API_KEY o SHOTSTACK_BASE_URL en .env' },
      { status: 500 }
    )
  }

  const body = {
    timeline: {
      tracks: [
        {
          clips: [
            {
              asset: { type: 'svg', src: flashSvg },
              start: 2.92,
              length: 0.16,
              fit: 'none',
              width: 720,
              height: 1280,
              position: 'center',
              opacity: [
                { from: 0, to: 0.9, start: 0, length: 0.06 },
                { from: 0.9, to: 0, start: 0.06, length: 0.1 },
              ],
            },
          ],
        },
        {
          clips: [
            {
              asset: {
                type: 'video',
                src: TEST_VIDEO_SRC,
                trim: 0,
                volume: 1,
              },
              start: 0,
              length: 3,
              fit: 'cover',
              effect: 'zoomIn',
            },
            {
              asset: {
                type: 'video',
                src: TEST_VIDEO_SRC,
                trim: 3,
                volume: 1,
              },
              start: 3,
              length: 3,
              fit: 'cover',
              effect: 'zoomIn',
            },
          ],
        },
      ],
    },
    output: {
      format: 'mp4',
      size: { width: 720, height: 1280 },
      fps: 30,
      quality: 'medium',
    },
  }

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json: Record<string, unknown> | null = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* keep as text */
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Shotstack HTTP ${res.status}`, detail: json ?? text },
      { status: res.status }
    )
  }

  const renderId = (json as { response?: { id?: string } })?.response?.id
  if (!renderId) {
    return NextResponse.json(
      { error: 'No se recibió response.id de Shotstack', raw: json ?? text },
      { status: 500 }
    )
  }

  return NextResponse.json({ renderId })
}
