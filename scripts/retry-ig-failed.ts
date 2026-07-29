/**
 * Reintenta solo Instagram en colas fallidas (FB ya publicado).
 * Uso: npx tsx scripts/retry-ig-failed.ts
 * Secuencial + pausa para no saturar Meta ni el servidor.
 */
import { createClient } from '@supabase/supabase-js'
import { executePublishForQueueRow } from '../src/lib/videos/publishing-service'

function loadEnvFile(path: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    if (!fs.existsSync(path)) return
    for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      const key = m[1].trim()
      let value = m[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    /* ignore */
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const DELAY_MS = 12_000 // pausa entre videos (IG tarda en procesar)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function listQueueIds(): Promise<Array<{ id: string; job_name: string | null }>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: failedQueues, error } = await supabase
    .from('video_publishing_queue')
    .select('id, video_id, status, video_jobs_v2(job_name)')
    .eq('status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  const out: Array<{ id: string; job_name: string | null }> = []
  for (const q of failedQueues ?? []) {
    const { data: results } = await supabase
      .from('video_publishing_results')
      .select('platform, status')
      .eq('queue_id', q.id)

    const ig = results?.find((r) => r.platform === 'instagram')
    const fb = results?.find((r) => r.platform === 'facebook')
    if (ig?.status === 'failed' && fb?.status === 'published') {
      const join = q.video_jobs_v2 as { job_name: string | null } | { job_name: string | null }[] | null
      const jobName = Array.isArray(join) ? join[0]?.job_name ?? null : join?.job_name ?? null
      out.push({ id: q.id, job_name: jobName })
    }
  }
  return out
}

async function main() {
  const rows = await listQueueIds()
  console.log(`Pendientes IG: ${rows.length}`)
  if (rows.length === 0) {
    console.log('Nada que subir.')
    return
  }

  let ok = 0
  let fail = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    console.log(`\n[${i + 1}/${rows.length}] ${row.job_name ?? row.id}`)
    try {
      const result = await executePublishForQueueRow(row.id, {
        onlyPlatforms: ['instagram'],
      })
      if (result.queueFinalStatus === 'published' && result.errors.length === 0) {
        ok++
        console.log('  OK → published')
      } else if (result.errors.some((e) => e.startsWith('instagram:'))) {
        fail++
        console.log('  FAIL', result.errors.join(' | '))
      } else if (result.queueFinalStatus === 'published') {
        ok++
        console.log('  OK (cola publicada)', result.errors)
      } else {
        fail++
        console.log('  FAIL status=', result.queueFinalStatus, result.errors)
      }
    } catch (e) {
      fail++
      console.log('  ERROR', e instanceof Error ? e.message : e)
    }

    if (i < rows.length - 1) {
      console.log(`  Esperando ${DELAY_MS / 1000}s…`)
      await sleep(DELAY_MS)
    }
  }

  console.log(`\nListo. OK=${ok} FAIL=${fail} TOTAL=${rows.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
