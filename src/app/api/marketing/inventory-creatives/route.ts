import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import {
  CREATIVE_UPLOAD_MAX_BYTES,
  CREATIVE_UPLOAD_MAX_FILES,
  fetchVehicleCreatives,
  resolveCreativeUploadMimeType,
  uploadManualVehicleCreatives,
} from '@/lib/marketing/inventory-vehicle-creatives'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const vehicleId = request.nextUrl.searchParams.get('vehicleId')?.trim() ?? ''
  if (!vehicleId) {
    return NextResponse.json({ error: 'Falta vehicleId' }, { status: 400 })
  }

  try {
    const creatives = await fetchVehicleCreatives(vehicleId)
    return NextResponse.json({ creatives })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[inventory-creatives]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  try {
    const formData = await request.formData()
    const vehicleId = String(formData.get('vehicleId') ?? '').trim()
    if (!vehicleId) {
      return NextResponse.json({ error: 'Falta vehicleId' }, { status: 400 })
    }

    const rawFiles = [...formData.getAll('files'), ...formData.getAll('file')].filter(
      (item): item is File => item instanceof File
    )
    if (rawFiles.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una imagen' }, { status: 400 })
    }
    if (rawFiles.length > CREATIVE_UPLOAD_MAX_FILES) {
      return NextResponse.json(
        { error: `Puedes subir hasta ${CREATIVE_UPLOAD_MAX_FILES} imágenes a la vez` },
        { status: 400 }
      )
    }

    const prepared = []
    for (const file of rawFiles) {
      const mimeType = resolveCreativeUploadMimeType(file)
      if (!mimeType) {
        return NextResponse.json(
          { error: `${file.name || 'Un archivo'} no es JPG, PNG o WebP` },
          { status: 400 }
        )
      }
      if (file.size === 0) {
        return NextResponse.json({ error: `${file.name || 'Un archivo'} está vacío` }, { status: 400 })
      }
      if (file.size > CREATIVE_UPLOAD_MAX_BYTES) {
        return NextResponse.json(
          {
            error: `${file.name || 'Una imagen'} supera el límite de ${Math.round(CREATIVE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`,
          },
          { status: 413 }
        )
      }
      prepared.push({
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        mimeType,
      })
    }

    const creatives = await uploadManualVehicleCreatives(vehicleId, prepared)
    return NextResponse.json({ creatives }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[inventory-creatives POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
