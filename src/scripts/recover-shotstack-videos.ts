/**
 * One-time: migra reels con URL temporal de Shotstack → Supabase Storage (reels/{jobId}.mp4).
 *
 * Uso:
 *   npx tsx src/scripts/recover-shotstack-videos.ts
 *   npx tsx src/scripts/recover-shotstack-videos.ts --dry-run
 *   npx tsx src/scripts/recover-shotstack-videos.ts --ids d5048955-f107-4f8c-a5b7-d76dbaa782ac,c93e85cf-a7c6-4156-be23-e8ed0909d888
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'
import {
  downloadShotstackVideoAndStoreFinalReel,
  finalReelStoragePath,
} from '../lib/videos/storage'

const SUPABASE_REEL_PREFIX = '/storage/v1/object/public/raw-videos-v2/reels/'

function assertEnv(): { apiKey: string; statusBaseUrl: string } {
  const apiKey = process.env.SHOTSTACK_API_KEY?.trim()
  const baseUrl = process.env.SHOTSTACK_BASE_URL?.trim()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!apiKey) throw new Error('Falta SHOTSTACK_API_KEY en .env')
  if (!baseUrl) throw new Error('Falta SHOTSTACK_BASE_URL en .env')
  if (!supabaseUrl) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en .env')
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env')

  return { apiKey, statusBaseUrl: baseUrl.replace(/\/$/, '') }
}

function isTemporaryShotstackUrl(url: string | null | undefined): boolean {
  const u = url?.trim() ?? ''
  if (!u) return false
  if (u.includes(SUPABASE_REEL_PREFIX)) return false
  return u.includes('shotstack') || u.includes('amazonaws.com')
}

function shotstackServeStageFromEditBase(statusBaseUrl: string): 'v1' | 'stage' {
  return statusBaseUrl.includes('/stage/') ? 'stage' : 'v1'
}

function parseOwnerFromTempUrl(tempUrl: string): string | null {
  try {
    const parts = new URL(tempUrl).pathname.split('/').filter(Boolean)
    return parts[0] ?? null
  } catch {
    return null
  }
}

function buildShotstackCdnUrl(owner: string, renderId: string, stage: 'v1' | 'stage'): string {
  return `https://cdn.shotstack.io/au/${stage}/${owner}/${renderId}.mp4`
}

async function urlIsDownloadable(url: string): Promise<boolean> {
  const res = await fetch(url, { method: 'HEAD' })
  return res.ok
}

/** Serve API: URL permanente en CDN (la que muestra el dashboard de Shotstack). */
async function getShotstackCdnUrlFromServeApi(
  renderId: string,
  apiKey: string,
  stage: 'v1' | 'stage'
): Promise<string | null> {
  const res = await fetch(`https://api.shotstack.io/serve/${stage}/assets/render/${renderId}`, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return null

  const json = (await res.json()) as {
    data?: Array<{ attributes?: { url?: string; status?: string } }>
  }
  for (const item of json.data ?? []) {
    const url = item.attributes?.url?.trim()
    if (item.attributes?.status === 'ready' && url) return url
  }
  return null
}

/** Prefiere CDN (permanente); la URL S3 temporal expira a las 24 h. */
async function resolveShotstackDownloadUrl(
  renderId: string,
  apiKey: string,
  statusBaseUrl: string,
  fallbackUrl?: string | null
): Promise<string | null> {
  const stage = shotstackServeStageFromEditBase(statusBaseUrl)

  const cdnFromServe = await getShotstackCdnUrlFromServeApi(renderId, apiKey, stage)
  if (cdnFromServe) {
    console.log('  Fuente: Shotstack Serve API (CDN)')
    return cdnFromServe
  }

  const res = await fetch(`${statusBaseUrl}/${renderId}`, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shotstack status HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as {
    response?: { status?: string; url?: string; owner?: string }
  }
  if (json?.response?.status !== 'done') return null

  const tempUrl = json.response.url?.trim() ?? fallbackUrl?.trim() ?? null
  const owner = json.response.owner?.trim() ?? (tempUrl ? parseOwnerFromTempUrl(tempUrl) : null)

  if (owner) {
    const cdnUrl = buildShotstackCdnUrl(owner, renderId, stage)
    if (await urlIsDownloadable(cdnUrl)) {
      console.log('  Fuente: CDN construida (owner + renderId)')
      return cdnUrl
    }
  }

  if (tempUrl && (await urlIsDownloadable(tempUrl))) {
    console.log('  Fuente: URL temporal S3 (aún válida)')
    return tempUrl
  }

  return null
}

function parseArgs(argv: string[]): { dryRun: boolean; jobIds: string[] } {
  const dryRun = argv.includes('--dry-run')
  const idsArg = argv.find((a) => a.startsWith('--ids='))
  const jobIds = idsArg
    ? idsArg
        .slice('--ids='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  return { dryRun, jobIds }
}

async function main() {
  const { dryRun, jobIds } = parseArgs(process.argv.slice(2))
  const { apiKey, statusBaseUrl } = assertEnv()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let query = supabase
    .from('video_jobs_v2')
    .select('id, job_name, final_video_url, creatomate_render_id')
    .eq('status', 'completed')
    .not('final_video_url', 'is', null)
    .order('created_at', { ascending: false })

  if (jobIds.length > 0) {
    query = query.in('id', jobIds)
  }

  const { data: rows, error } = await query
  if (error) throw new Error(`Error leyendo jobs: ${error.message}`)

  const jobs = (rows ?? []).filter((j) => isTemporaryShotstackUrl(j.final_video_url))
  if (jobs.length === 0) {
    console.log('No hay jobs con URL temporal de Shotstack pendientes de migrar.')
    return
  }

  console.log(
    `${dryRun ? '[DRY-RUN] ' : ''}Encontrados ${jobs.length} job(s) para recuperar:\n` +
      jobs
        .map((j) => `  - ${j.id}${j.job_name ? ` (${j.job_name})` : ''}`)
        .join('\n')
  )

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const job of jobs) {
    const label = job.job_name ? `${job.id} (${job.job_name})` : job.id
    try {
      console.log(`\n→ ${label}`)

      const renderId = job.creatomate_render_id?.trim()
      if (!renderId) {
        console.log('  Sin creatomate_render_id (render Shotstack), saltando')
        skipped++
        continue
      }

      let sourceUrl: string | null = null
      try {
        sourceUrl = await resolveShotstackDownloadUrl(
          renderId,
          apiKey,
          statusBaseUrl,
          job.final_video_url
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`  API Shotstack falló: ${msg}`)
      }

      if (!sourceUrl) {
        console.log('  Render no disponible en Shotstack, saltando')
        skipped++
        continue
      }

      const targetPath = finalReelStoragePath(job.id)
      console.log(`  Origen: ${sourceUrl}`)
      console.log(`  Destino: raw-videos-v2/${targetPath}`)

      if (dryRun) {
        console.log('  [DRY-RUN] no descarga / no sube / no actualiza DB')
        ok++
        continue
      }

      const permanentUrl = await downloadShotstackVideoAndStoreFinalReel(sourceUrl, job.id)

      const { error: updateErr } = await supabase
        .from('video_jobs_v2')
        .update({ final_video_url: permanentUrl })
        .eq('id', job.id)

      if (updateErr) throw new Error(updateErr.message)

      console.log(`  OK → ${permanentUrl}`)
      ok++
    } catch (err) {
      failed++
      console.error(`  ERROR: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nResumen: ${ok} ok, ${skipped} omitidos, ${failed} error(es).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
