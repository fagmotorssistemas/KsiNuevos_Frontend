import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const RAW_BUCKET = 'raw-videos-v2'
const MUSIC_BUCKET = 'music-tracks-v2'
const SIGNED_URL_EXPIRY = 60 * 60 * 24 // 24 horas

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function uploadRawVideoV2(
  jobId: string,
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ path: string; signedUrl: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const path = `${jobId}/${timestamp}_${filename}`

  const { error } = await supabase.storage
    .from(RAW_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`[VideoV2Storage] Error subiendo video: ${error.message}`)

  const { data: signedData, error: signedError } = await supabase.storage
    .from(RAW_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (signedError || !signedData)
    throw new Error(`[VideoV2Storage] Error generando URL firmada: ${signedError?.message}`)

  return { path, signedUrl: signedData.signedUrl }
}

export async function uploadRawVideoClipV2(
  jobId: string,
  clipIndex: number,
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ path: string; signedUrl: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const path = `${jobId}/clip_${clipIndex}_${timestamp}_${filename}`

  const { error } = await supabase.storage
    .from(RAW_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`[VideoV2Storage] Error subiendo clip ${clipIndex}: ${error.message}`)

  const { data: signedData, error: signedError } = await supabase.storage
    .from(RAW_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (signedError || !signedData)
    throw new Error(`[VideoV2Storage] Error firmando URL clip ${clipIndex}: ${signedError?.message}`)

  return { path, signedUrl: signedData.signedUrl }
}

export async function getSignedUrlForPath(path: string): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.storage
    .from(RAW_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (error || !data) throw new Error(`[VideoV2Storage] Error generando URL firmada: ${error?.message}`)
  return data.signedUrl
}

export async function uploadMusicTrackV2(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const path = `tracks/${timestamp}_${filename}`

  const { error } = await supabase.storage
    .from(MUSIC_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`[VideoV2Storage] Error subiendo música: ${error.message}`)

  const { data: publicData } = supabase.storage.from(MUSIC_BUCKET).getPublicUrl(path)

  return { path, publicUrl: publicData.publicUrl }
}
