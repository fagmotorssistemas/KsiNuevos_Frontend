import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  listNoticieroBackgrounds,
  NOTICIERO_BACKGROUND_MAX_BYTES,
  resolveImageMimeType,
  uploadNoticieroBackground,
} from '@/lib/noticiero/backgrounds-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const backgrounds = await listNoticieroBackgrounds()
    return NextResponse.json({ backgrounds })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error listando fondos'
    console.error('[noticiero/backgrounds GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession()
  if (!auth.ok) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo de imagen requerido' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }
    if (file.size > NOTICIERO_BACKGROUND_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `La imagen supera el límite (${Math.round(NOTICIERO_BACKGROUND_MAX_BYTES / (1024 * 1024))} MB).`,
        },
        { status: 413 }
      )
    }

    const mimeType = resolveImageMimeType(file)
    if (!mimeType) {
      return NextResponse.json(
        { error: 'Formato no válido. Usa JPG, PNG o WebP.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const background = await uploadNoticieroBackground(buffer, file.name, mimeType)

    return NextResponse.json({ background }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error subiendo fondo'
    console.error('[noticiero/backgrounds POST]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
