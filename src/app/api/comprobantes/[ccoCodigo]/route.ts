/**
 * POST /api/comprobantes/:ccoCodigo
 *
 * Flujo de dos pasos:
 *
 * 1. Next.js (Node 24) sube el archivo a Supabase Storage directamente.
 *    → Express no toca Supabase (evita el problema de Node 16 sin fetch/Headers).
 *
 * 2. Next.js llama a Express con un POST JSON mínimo a la ruta
 *    POST /api/comprobantes/:ccoCodigo/registrar-url  { url, creaUsr, empresa? }
 *    → Express hace solo el INSERT en Oracle (sin Supabase SDK, sin multipart).
 *
 * REQUISITO BACKEND: añadir el endpoint /registrar-url en Express.
 * Ver: /docs o el comentario al final de este archivo para el código exacto.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = 'comprobantes-adjuntos'

const MIMES_PERMITIDOS = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif', 'image/heic', 'image/heif', 'application/pdf',
])

const MAX_SIZE_BYTES = 25 * 1024 * 1024

function sanitizarNombre(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return base.length > 180 ? base.slice(-180) : base || 'adjunto'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ccoCodigo: string }> }
) {
  const { ccoCodigo } = await params

  if (!ccoCodigo || !/^\d+$/.test(ccoCodigo)) {
    return NextResponse.json(
      { success: false, message: 'ccoCodigo debe ser numérico.', code: 'BAD_REQUEST' },
      { status: 400 }
    )
  }

  const { searchParams } = request.nextUrl
  const empresa = searchParams.get('empresa') ?? ''
  const qs = empresa ? `?empresa=${empresa}` : ''

  // ── 1. Leer FormData ────────────────────────────────────────────────
  let incomingForm: FormData
  try {
    incomingForm = await request.formData()
  } catch {
    return NextResponse.json(
      { success: false, message: 'No se pudo leer el formulario multipart.', code: 'BAD_REQUEST' },
      { status: 400 }
    )
  }

  const fileField = incomingForm.get('file')
  if (!fileField || !(fileField instanceof Blob)) {
    return NextResponse.json(
      { success: false, message: 'Debe enviar un archivo en el campo "file".', code: 'FILE_REQUIRED' },
      { status: 400 }
    )
  }

  const file = fileField as File
  const mimeType = file.type || 'application/octet-stream'
  const originalName = file.name || 'adjunto'

  if (!MIMES_PERMITIDOS.has(mimeType)) {
    return NextResponse.json(
      {
        success: false,
        message: `Tipo de archivo no permitido (${mimeType}). Use imagen (JPEG, PNG, WebP, GIF, HEIC) o PDF.`,
        code: 'INVALID_MIME',
      },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, message: 'El archivo supera el tamaño máximo permitido (25 MB).', code: 'FILE_TOO_LARGE' },
      { status: 400 }
    )
  }

  const creaUsr =
    (incomingForm.get('creaUsr') as string | null)?.trim() ||
    request.headers.get('x-usuario')?.trim() ||
    'USR'

  // ── 2. Verificar comprobante (Express GET — simple, sin body) ────────
  try {
    const checkRes = await fetch(
      `${BACKEND_URL}/comprobantes/${ccoCodigo}/imagenes${qs}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (checkRes.status === 404) {
      return NextResponse.json(
        { success: false, message: 'Comprobante no encontrado para la empresa indicada.', code: 'COMPROBANTE_NOT_FOUND' },
        { status: 404 }
      )
    }
  } catch (err) {
    // Si Express no responde en 8s, lo dejamos pasar; el registrar-url fallará con error claro
    console.warn('[comprobantes/upload] No se pudo verificar comprobante (continuando):', err)
  }

  // ── 3. Subir a Supabase Storage desde Next.js (Node 24) ─────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const ext = mimeType === 'application/pdf' ? 'pdf'
    : mimeType.includes('png') ? 'png'
    : mimeType.includes('webp') ? 'webp'
    : mimeType.includes('gif') ? 'gif'
    : mimeType.includes('heic') ? 'heic'
    : mimeType.includes('heif') ? 'heif'
    : 'jpg'

  const safeName = sanitizarNombre(originalName)
  const tieneExt = /\.[a-zA-Z0-9]{1,8}$/.test(safeName)
  const fileName = tieneExt ? safeName : `${safeName}.${ext}`
  const objectPath = `${empresa || '162'}/${ccoCodigo}/${Date.now()}_${fileName}`.replace(/\.\./g, '_')

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, fileBuffer, { contentType: mimeType, upsert: false })

  if (storageErr) {
    console.error('[comprobantes/upload] Error Supabase Storage:', storageErr)
    return NextResponse.json(
      {
        success: false,
        message: `Error al subir archivo a almacenamiento: ${storageErr.message}`,
        code: 'STORAGE_UPLOAD_FAILED',
      },
      { status: 502 }
    )
  }

  const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
  const publicUrl = pubData?.publicUrl
  if (!publicUrl) {
    await supabase.storage.from(BUCKET).remove([objectPath]).catch(() => undefined)
    return NextResponse.json(
      { success: false, message: 'No se pudo obtener la URL pública del archivo.', code: 'STORAGE_PUBLIC_URL' },
      { status: 502 }
    )
  }

  console.log(`[comprobantes/upload] Supabase OK → ${publicUrl}`)

  // ── 4. Registrar en Oracle vía Express (JSON mínimo, sin multipart) ─
  // Requiere el endpoint POST /api/comprobantes/:ccoCodigo/registrar-url en Express.
  // Ese endpoint hace solo el INSERT en Oracle; no necesita Supabase SDK.
  let registrarRes: Response
  try {
    registrarRes = await fetch(
      `${BACKEND_URL}/comprobantes/${ccoCodigo}/registrar-url${qs}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-usuario': creaUsr,
        },
        body: JSON.stringify({ url: publicUrl, creaUsr }),
        signal: AbortSignal.timeout(10000),
      }
    )
  } catch (err) {
    // Si Express aún no tiene el endpoint o hay conectividad, limpiamos Storage
    await supabase.storage.from(BUCKET).remove([objectPath]).catch(() => undefined)
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[comprobantes/upload] Error llamando a /registrar-url:', err)
    return NextResponse.json(
      {
        success: false,
        message: `Archivo subido a Storage pero el INSERT en Oracle falló (${msg}). Asegúrate de haber desplegado el endpoint /registrar-url en el backend Express.`,
        code: 'ORACLE_INSERT_FAILED',
        debug: { publicUrl, objectPath },
      },
      { status: 502 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = await registrarRes.json()
  } catch {
    body = { message: `HTTP ${registrarRes.status}` }
  }

  if (!registrarRes.ok) {
    await supabase.storage.from(BUCKET).remove([objectPath]).catch(() => undefined)
    console.error(`[comprobantes/upload] Express /registrar-url respondió ${registrarRes.status}:`, body)
    return NextResponse.json(body, { status: registrarRes.status })
  }

  return NextResponse.json(body, { status: registrarRes.status })
}
