import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const NOTICIERO_FONDOS_BUCKET = 'noticiero-fondos'
export const NOTICIERO_WHITE_BACKGROUND = '#ffffff'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export interface NoticieroBackgroundItem {
  name: string
  path: string
  publicUrl: string
  createdAt: string | null
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function resolveImageMimeType(file: File): string | null {
  const t = (file.type || '').trim().toLowerCase()
  if (ALLOWED_IMAGE_TYPES.has(t)) return t === 'image/jpg' ? 'image/jpeg' : t
  if (t === 'application/octet-stream' || t === '') {
    const mapped = EXT_TO_MIME[extensionFromFilename(file.name)]
    if (mapped) return mapped
  }
  return null
}

function safeBackgroundFilename(originalFilename: string): string {
  const base = originalFilename.trim().split(/[/\\]/).pop() || 'fondo'
  const dot = base.lastIndexOf('.')
  const extRaw = dot >= 0 ? base.slice(dot).toLowerCase() : ''
  const stem = dot >= 0 ? base.slice(0, dot) : base
  const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp'])
  const ext = extRaw && allowedExt.has(extRaw) ? extRaw : '.jpg'
  const slug = stem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const token = randomBytes(4).toString('hex')
  return `${slug || 'fondo'}-${Date.now()}-${token}${ext}`
}

export function getNoticieroBackgroundPublicUrl(path: string): string {
  const supabase = getServiceClient()
  const { data } = supabase.storage.from(NOTICIERO_FONDOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function isAllowedNoticieroBackgroundUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return false
  const prefix = `${base}/storage/v1/object/public/${NOTICIERO_FONDOS_BUCKET}/`
  return trimmed.startsWith(prefix)
}

export async function listNoticieroBackgrounds(): Promise<NoticieroBackgroundItem[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.storage
    .from(NOTICIERO_FONDOS_BUCKET)
    .list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    throw new Error(`Error listando fondos: ${error.message}`)
  }

  const files = (data ?? []).filter((f) => f.name && !f.name.endsWith('/') && f.id !== null)

  return files.map((file) => {
    const path = file.name
    return {
      name: path,
      path,
      publicUrl: getNoticieroBackgroundPublicUrl(path),
      createdAt: file.created_at ?? null,
    }
  })
}

export async function uploadNoticieroBackground(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<NoticieroBackgroundItem> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `La imagen supera el límite (${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`
    )
  }

  const supabase = getServiceClient()
  const path = safeBackgroundFilename(originalFilename)

  const { error } = await supabase.storage.from(NOTICIERO_FONDOS_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  })

  if (error) {
    throw new Error(`Error subiendo fondo: ${error.message}`)
  }

  return {
    name: path,
    path,
    publicUrl: getNoticieroBackgroundPublicUrl(path),
    createdAt: new Date().toISOString(),
  }
}

export { MAX_UPLOAD_BYTES as NOTICIERO_BACKGROUND_MAX_BYTES }
