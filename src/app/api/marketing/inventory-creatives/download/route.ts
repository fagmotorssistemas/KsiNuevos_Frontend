import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  creativeDownloadFilename,
  fetchVehicleCreativeById,
} from '@/lib/marketing/inventory-vehicle-creatives'

export const dynamic = 'force-dynamic'

const ALLOWED_BUCKETS = new Set(
  ['plantillas-campaigns', process.env.SUPABASE_STORAGE_BUCKET?.trim()].filter(
    (b): b is string => !!b
  )
)

function parsePublicStorageUrl(raw: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(raw)
    const marker = '/storage/v1/object/public/'
    const idx = url.pathname.indexOf(marker)
    if (idx < 0) return null
    const rest = decodeURIComponent(url.pathname.slice(idx + marker.length))
    const [bucket, ...pathParts] = rest.split('/').filter(Boolean)
    if (!bucket || pathParts.length === 0) return null
    return { bucket, path: pathParts.join('/') }
  } catch {
    return null
  }
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_')
  const encoded = encodeURIComponent(filename)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export async function GET(request: NextRequest) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const creativeId = request.nextUrl.searchParams.get('creativeId')?.trim() ?? ''
  const imageIndex = Math.max(0, Number(request.nextUrl.searchParams.get('index') ?? '0') || 0)
  if (!creativeId) {
    return NextResponse.json({ error: 'Falta creativeId' }, { status: 400 })
  }

  try {
    const creative = await fetchVehicleCreativeById(creativeId)
    const fileUrl = creative?.images[imageIndex] ?? creative?.imageUrl ?? null
    if (!creative || !fileUrl) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
    }

    const parsed = parsePublicStorageUrl(fileUrl)
    if (!parsed || !ALLOWED_BUCKETS.has(parsed.bucket)) {
      return NextResponse.json({ error: 'Origen de imagen no permitido' }, { status: 400 })
    }

    const filename = creativeDownloadFilename(creative, imageIndex)
    const supabase = createServiceRoleClient()
    const { data: fileData, error: storageErr } = await supabase.storage
      .from(parsed.bucket)
      .download(parsed.path)

    if (!storageErr && fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer())
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': fileData.type || 'image/png',
          'Content-Disposition': contentDisposition(filename),
          'Content-Length': String(buffer.length),
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    const remote = await fetch(fileUrl)
    if (!remote.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el archivo' }, { status: 502 })
    }
    const buffer = Buffer.from(await remote.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': remote.headers.get('content-type') ?? 'image/png',
        'Content-Disposition': contentDisposition(filename),
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[inventory-creatives/download]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
