/**
 * One-time: copia a Supabase (bucket `reels-v2`) los videos que siguen en el almacenamiento de
 * Creatomate (Backblaze) y actualiza `final_video_url`. Creatomate ya no se usa: si la cuenta
 * vence, esos videos desaparecen.
 *
 * - video_jobs_v2  → reels-v2/{jobId}.mp4           (misma ruta que los reels nuevos)
 * - noticiero_jobs → reels-v2/noticiero/{jobId}.mp4
 *
 * Idempotente: lo que ya apunta a Supabase no se toca. Guarda un respaldo JSON con las URLs viejas.
 *
 * Uso (desde la raíz del repo, con .env.local o .env):
 *   npx tsx src/scripts/migrar-reels-creatomate.ts --dry-run   # solo revisa qué sigue disponible
 *   npx tsx src/scripts/migrar-reels-creatomate.ts
 *   npx tsx src/scripts/migrar-reels-creatomate.ts --ids=<id1>,<id2>
 */
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

import { createClient } from '@supabase/supabase-js'
import { finalReelStoragePath, storeRemoteVideoInReelsBucket } from '../lib/videos/storage'

type Table = 'video_jobs_v2' | 'noticiero_jobs'
type Row = { table: Table; id: string; name: string; stage: string; url: string }

const TABLES: Array<{ table: Table; storagePath: (id: string) => string }> = [
  { table: 'video_jobs_v2', storagePath: finalReelStoragePath },
  { table: 'noticiero_jobs', storagePath: (id) => `noticiero/${id}.mp4` },
]

function isCreatomateUrl(url: string): boolean {
  return /backblazeb2\.com|creatomate/i.test(url)
}

async function checkAvailable(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return `HTTP ${res.status}`
    return null
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

function parseArgs(argv: string[]): { dryRun: boolean; ids: string[] } {
  const idsArg = argv.find((a) => a.startsWith('--ids='))
  return {
    dryRun: argv.includes('--dry-run'),
    ids: idsArg ? idsArg.slice('--ids='.length).split(',').map((s) => s.trim()).filter(Boolean) : [],
  }
}

async function main() {
  const { dryRun, ids } = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local / .env')
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const rows: Row[] = []
  for (const { table } of TABLES) {
    let query = supabase
      .from(table)
      .select('id, job_name, social_publish_stage, final_video_url')
      .not('final_video_url', 'is', null)
      .order('created_at', { ascending: true })
    if (ids.length > 0) query = query.in('id', ids)
    const { data, error } = await query
    if (error) throw new Error(`Error leyendo ${table}: ${error.message}`)
    for (const r of (data ?? []) as unknown as Array<Record<string, string | null>>) {
      const url = r.final_video_url?.trim() ?? ''
      if (!isCreatomateUrl(url)) continue
      rows.push({
        table,
        id: r.id!,
        name: r.job_name ?? '(sin nombre)',
        stage: r.social_publish_stage ?? '-',
        url,
      })
    }
  }

  if (rows.length === 0) {
    console.log('No quedan videos en Creatomate. Nada que migrar.')
    return
  }
  console.log(`${dryRun ? '[DRY-RUN] ' : ''}${rows.length} video(s) en Creatomate:\n`)

  const backup: Array<Row & { newUrl?: string }> = []
  const unavailable: Row[] = []
  let ok = 0
  let failed = 0

  for (const [i, row] of rows.entries()) {
    const label = `[${i + 1}/${rows.length}] ${row.table} ${row.id.slice(0, 8)} ${row.name} (${row.stage})`
    const problem = await checkAvailable(row.url)
    if (problem) {
      console.log(`✗ ${label}\n    ya no está disponible en Creatomate: ${problem}`)
      unavailable.push(row)
      continue
    }
    if (dryRun) {
      console.log(`✓ ${label}\n    disponible`)
      ok++
      continue
    }

    try {
      const storagePath = TABLES.find((t) => t.table === row.table)!.storagePath(row.id)
      const newUrl = await storeRemoteVideoInReelsBucket(row.url, storagePath)
      const { error } = await supabase.from(row.table).update({ final_video_url: newUrl }).eq('id', row.id)
      if (error) throw new Error(`video copiado pero no se actualizó la base: ${error.message}`)
      backup.push({ ...row, newUrl })
      console.log(`✓ ${label}\n    → ${newUrl}`)
      ok++
    } catch (err) {
      failed++
      console.error(`✗ ${label}\n    ERROR: ${err instanceof Error ? err.message : err}`)
    }
  }

  if (backup.length > 0) {
    const file = path.resolve(process.cwd(), `migracion-creatomate-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`)
    writeFileSync(file, JSON.stringify(backup, null, 2))
    console.log(`\nRespaldo de las URLs viejas: ${file}`)
  }

  console.log(
    `\nResumen: ${ok} ${dryRun ? 'disponibles' : 'migrados'}, ${unavailable.length} ya no disponibles, ${failed} con error.`
  )
  if (unavailable.length > 0) {
    console.log('Los no disponibles hay que regenerarlos desde sus clips:')
    for (const r of unavailable) console.log(`  - ${r.table} ${r.id} ${r.name} (${r.stage})`)
  }
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
