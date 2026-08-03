import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/supabase'
import { RAW_FULL_VIDEOS_BUCKET } from '@/lib/videos/raw-full-videos-types'
import { finalReelPublicUrl, finalReelStoragePath } from '@/lib/videos/storage'
import type { PublishingPlatform } from '@/lib/videos/types'

const REELS_FINAL_BUCKET = 'reels-v2'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function foldersDb(supabase: ReturnType<typeof getServiceClient>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('raw_full_video_folders')
}

/**
 * Copia un video de raw-full-videos-v2 a reels-v2 (público) y crea un job
 * completed + fila en la cola de publicación (misma lógica que Videos).
 */
export async function scheduleRawFullVideoPublish(opts: {
  folderId: string
  videoPath: string
  caption: string
  platforms: PublishingPlatform[]
  scheduledAtIso: string
  vehicleId?: string | null
}): Promise<{ queueId: string; jobId: string }> {
  const folderId = opts.folderId.trim()
  const videoPath = opts.videoPath.trim()
  const caption = opts.caption.trim()
  if (!folderId || !videoPath || !caption) {
    throw new Error('folderId, videoPath y caption son requeridos')
  }
  if (!opts.platforms.length) throw new Error('Selecciona al menos una red')
  if (!videoPath.startsWith(`${folderId}/`)) throw new Error('Ruta de video inválida')

  const scheduled = new Date(opts.scheduledAtIso)
  if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() - 30_000) {
    throw new Error('La fecha de publicación no puede estar en el pasado')
  }

  const supabase = getServiceClient()
  const { data: folder, error: folderErr } = await foldersDb(supabase)
    .select('id, inventory_vehicle_id, inventory_vehicle_id_2, formato, folder_name')
    .eq('id', folderId)
    .maybeSingle()

  if (folderErr || !folder) throw new Error('Carpeta no encontrada')

  const row = folder as {
    id: string
    inventory_vehicle_id: string | null
    inventory_vehicle_id_2: string | null
    formato: string | null
    folder_name: string | null
  }

  const vehicleId =
    opts.vehicleId?.trim() || row.inventory_vehicle_id?.trim() || null

  // Descargar del bucket privado y subir a reels-v2 público
  const { data: blob, error: dlErr } = await supabase.storage
    .from(RAW_FULL_VIDEOS_BUCKET)
    .download(videoPath)
  if (dlErr || !blob) {
    throw new Error(`No se pudo leer el video: ${dlErr?.message ?? 'sin datos'}`)
  }
  const buffer = Buffer.from(await blob.arrayBuffer())

  const meta = {
    _v2_full_raw_publish: true,
    sourceBucket: RAW_FULL_VIDEOS_BUCKET,
    sourcePath: videoPath,
    folderId,
    formato: row.formato,
    vehicleId2: row.inventory_vehicle_id_2,
  } as unknown as Json

  const { data: job, error: jobErr } = await supabase
    .from('video_jobs_v2')
    .insert({
      flow_type: 'raw_full',
      status: 'completed',
      raw_video_paths: [videoPath],
      inventory_vehicle_id: vehicleId,
      job_name: row.folder_name || row.formato || 'Video en bruto',
      current_step: 'Video en bruto listo para publicar',
      progress_percentage: 100,
      social_publish_stage: 'programado',
      selected_clips: meta,
      final_video_url: null,
    })
    .select('id')
    .single()

  if (jobErr || !job) {
    throw new Error(`Error creando job de publicación: ${jobErr?.message ?? 'desconocido'}`)
  }

  const jobId = job.id
  const storagePath = finalReelStoragePath(jobId)
  const { error: upErr } = await supabase.storage.from(REELS_FINAL_BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
    cacheControl: '31536000',
  })
  if (upErr) {
    await supabase.from('video_jobs_v2').delete().eq('id', jobId)
    throw new Error(`Error subiendo video público: ${upErr.message}`)
  }

  const publicUrl = finalReelPublicUrl(jobId)
  await supabase
    .from('video_jobs_v2')
    .update({
      final_video_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  const { data: queueRow, error: qErr } = await supabase
    .from('video_publishing_queue')
    .insert({
      video_id: jobId,
      vehicle_id: vehicleId,
      caption,
      scheduled_at: scheduled.toISOString(),
      platforms: opts.platforms,
      status: 'pending',
    })
    .select('id')
    .single()

  if (qErr || !queueRow) {
    throw new Error(`Error en cola: ${qErr?.message ?? 'desconocido'}`)
  }

  await foldersDb(supabase)
    .update({ caption, updated_at: new Date().toISOString() })
    .eq('id', folderId)

  return { queueId: queueRow.id, jobId }
}
