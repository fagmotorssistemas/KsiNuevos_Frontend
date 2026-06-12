/**
 * Copia reels de raw-videos-v2/reels/ → bucket público reels-v2/ y actualiza final_video_url.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'
import { finalReelPublicUrl, finalReelStoragePath } from '../lib/videos/storage'

const LEGACY_PREFIX = '/storage/v1/object/public/raw-videos-v2/reels/'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: jobs, error } = await supabase
    .from('video_jobs_v2')
    .select('id, job_name, final_video_url')
    .eq('status', 'completed')
    .not('final_video_url', 'is', null)
    .like('final_video_url', `%${LEGACY_PREFIX}%`)

  if (error) throw new Error(error.message)
  if (!jobs?.length) {
    console.log('No hay jobs con URL legacy en raw-videos-v2/reels/.')
    return
  }

  console.log(`Migrando ${jobs.length} reel(s) a bucket público reels-v2…`)

  for (const job of jobs) {
    const label = job.job_name ? `${job.id} (${job.job_name})` : job.id
    const legacyPath = `reels/${job.id}.mp4`
    const targetPath = finalReelStoragePath(job.id)

    console.log(`\n→ ${label}`)

    const { data: blob, error: dlErr } = await supabase.storage
      .from('raw-videos-v2')
      .download(legacyPath)

    if (dlErr || !blob) {
      console.error(`  ERROR descargando ${legacyPath}: ${dlErr?.message ?? 'sin datos'}`)
      continue
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const { error: upErr } = await supabase.storage.from('reels-v2').upload(targetPath, buffer, {
      contentType: 'video/mp4',
      upsert: true,
      cacheControl: '31536000',
    })
    if (upErr) {
      console.error(`  ERROR subiendo a reels-v2: ${upErr.message}`)
      continue
    }

    const publicUrl = finalReelPublicUrl(job.id)
    const { error: updateErr } = await supabase
      .from('video_jobs_v2')
      .update({ final_video_url: publicUrl })
      .eq('id', job.id)

    if (updateErr) {
      console.error(`  ERROR actualizando DB: ${updateErr.message}`)
      continue
    }

    console.log(`  OK → ${publicUrl}`)
  }

  console.log('\nListo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
