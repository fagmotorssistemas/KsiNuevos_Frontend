import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/videos/test-svg',
    description: 'Envía un render de prueba a Shotstack con SVG feGaussianBlur y retorna { renderId }.',
  })
}

export async function POST() {
  const apiKey = process.env.SHOTSTACK_API_KEY
  const baseUrl = process.env.SHOTSTACK_BASE_URL

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: 'Faltan SHOTSTACK_API_KEY o SHOTSTACK_BASE_URL en .env' },
      { status: 500 }
    )
  }

  const svgSrc =
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="200" viewBox="0 0 720 200">' +
    '<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="20"/>' +
    '</filter></defs>' +
    '<ellipse cx="360" cy="100" rx="300" ry="70" fill="rgba(0,0,0,0.95)" filter="url(#blur)"/>' +
    '</svg>'

  const body = {
    timeline: {
      tracks: [
        {
          clips: [
            {
              asset: { type: 'svg', src: svgSrc },
              start: 0,
              length: 3,
              position: 'top',
              offset: { x: 0, y: -0.1 },
            },
          ],
        },
        {
          clips: [
            {
              asset: {
                type: 'video',
                src: 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/footage/skater.hls',
              },
              start: 0,
              length: 3,
              fit: 'cover',
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
  try { json = text ? JSON.parse(text) : null } catch { /* keep as text */ }

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
