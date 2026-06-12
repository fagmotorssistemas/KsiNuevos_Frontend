/**
 * Importa un render huérfano de Shotstack → reels-v2 + restaura fila en video_jobs_v2.
 * Uso: npx tsx src/scripts/import-orphan-shotstack-render.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'
import { downloadShotstackVideoAndStoreFinalReel } from '../lib/videos/storage'

const JOB_ID = 'b2cb8bfa-37c9-4434-a100-c149e0e90f47'
const RENDER_ID = '3d07922d-646d-4404-8979-8a514f675b4a'

const RAW_PATHS = [
  `${JOB_ID}/clip_0_1781279718935_IMG_5114.mov`,
  `${JOB_ID}/clip_1_1781279719295_IMG_5115.mov`,
  `${JOB_ID}/clip_2_1781279719422_IMG_5118.mov`,
  `${JOB_ID}/clip_3_1781279719545_IMG_5121.mov`,
  `${JOB_ID}/clip_4_1781279719691_IMG_5125.mov`,
  `${JOB_ID}/clip_5_1781279719828_IMG_5126.mov`,
  `${JOB_ID}/clip_6_1781279720009_IMG_5128.mov`,
]

async function getShotstackCdnUrl(renderId: string): Promise<string> {
  const apiKey = process.env.SHOTSTACK_API_KEY?.trim()
  if (!apiKey) throw new Error('Falta SHOTSTACK_API_KEY')

  const res = await fetch(`https://api.shotstack.io/serve/v1/assets/render/${renderId}`, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Serve API HTTP ${res.status}`)

  const json = (await res.json()) as {
    data?: Array<{ attributes?: { url?: string; status?: string } }>
  }
  for (const item of json.data ?? []) {
    const url = item.attributes?.url?.trim()
    if (item.attributes?.status === 'ready' && url) return url
  }
  throw new Error('CDN URL no disponible en Serve API')
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: existing } = await supabase
    .from('video_jobs_v2')
    .select('id')
    .eq('id', JOB_ID)
    .maybeSingle()

  if (existing) {
    console.log(`Job ${JOB_ID} ya existe, omitiendo insert.`)
    return
  }

  const cdnUrl = await getShotstackCdnUrl(RENDER_ID)
  console.log(`Descargando desde CDN: ${cdnUrl}`)

  const finalUrl = await downloadShotstackVideoAndStoreFinalReel(cdnUrl, JOB_ID)
  console.log(`Subido a Storage: ${finalUrl}`)

  const { data, error } = await supabase
    .from('video_jobs_v2')
    .insert({
      id: JOB_ID,
      flow_type: 'multiple',
      raw_video_paths: RAW_PATHS,
      status: 'completed',
      current_step: 'Video listo (importado desde Shotstack)',
      progress_percentage: 100,
      creatomate_render_id: RENDER_ID,
      final_video_url: finalUrl,
      final_video_duration: 31.23,
      job_name: 'NEW FORTUNER 2026',
      social_publish_stage: 'generado',
      show_brand_overlays: true,
      vehicle_line_1: 'toyota',
      vehicle_line_2: 'NEW FORTUNER',
      vehicle_line_4: '2026',
      selected_clips: { _v2_pipeline_input: true },
    })
    .select('id, job_name, final_video_url')
    .single()

  if (error) throw new Error(error.message)
  console.log('Job restaurado:', data)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
