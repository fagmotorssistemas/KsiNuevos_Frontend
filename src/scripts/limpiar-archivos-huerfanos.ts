/**
 * One-time: borra de Storage los archivos de jobs de video que ya no existen. Hasta ahora borrar
 * un job solo borraba la fila; sus clips y su reel final quedaban para siempre.
 *
 * - raw-videos-v2/{jobId}/…        clips (si ningún job existente los usa)
 * - reels-v2/{jobId}.mp4           reel final
 * - music-tracks-v2/reel-vo/{jobId}/…  voz en off
 *
 * Solo toca carpetas/archivos con nombre de UUID que no son de un job ni de un perfil, y con más
 * de N días (default 7) para no pisar una subida en curso. Por defecto SOLO MUESTRA qué borraría.
 *
 * Uso (desde la raíz del repo, con .env.local o .env):
 *   npx tsx src/scripts/limpiar-archivos-huerfanos.ts              # revisar (no borra nada)
 *   npx tsx src/scripts/limpiar-archivos-huerfanos.ts --dias=30    # margen distinto
 *   npx tsx src/scripts/limpiar-archivos-huerfanos.ts --borrar     # borra (no se puede deshacer)
 */
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const RAW_BUCKET = 'raw-videos-v2'
const REELS_BUCKET = 'reels-v2'
const MUSIC_BUCKET = 'music-tracks-v2'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type StorageFile = { bucket: string; path: string; bytes: number; createdAt: string }
type Candidate = { bucket: string; owner: string; files: StorageFile[] }

function parseArgs(argv: string[]) {
  const diasArg = argv.find((a) => a.startsWith('--dias='))
  const dias = diasArg ? Number(diasArg.slice('--dias='.length)) : 7
  if (!Number.isFinite(dias) || dias < 1) throw new Error('--dias debe ser un número ≥ 1')
  return { borrar: argv.includes('--borrar'), dias }
}

async function listAll(supabase: SupabaseClient, bucket: string, folder: string) {
  const items: Array<{ name: string; id: string | null; created_at?: string; metadata?: { size?: number } | null }> = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000, offset })
    if (error) throw new Error(`No se pudo listar ${bucket}/${folder}: ${error.message}`)
    items.push(...(data ?? []))
    if ((data ?? []).length < 1000) return items
  }
}

async function listFiles(supabase: SupabaseClient, bucket: string, folder: string): Promise<StorageFile[]> {
  return (await listAll(supabase, bucket, folder))
    .filter((item) => item.id)
    .map((item) => ({
      bucket,
      path: folder ? `${folder}/${item.name}` : item.name,
      bytes: item.metadata?.size ?? 0,
      createdAt: item.created_at ?? new Date().toISOString(),
    }))
}

async function selectAll<T>(supabase: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if ((data ?? []).length < 1000) return rows
  }
}

const gb = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`

async function main() {
  const { borrar, dias } = parseArgs(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local / .env')
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const limite = Date.now() - dias * 24 * 3600 * 1000

  // Lo que NO se toca: carpetas de jobs y de perfiles, y clips que algún job todavía referencia.
  const jobs = await selectAll<{ id: string; raw_video_paths: string[] | null }>(supabase, 'video_jobs_v2', 'id, raw_video_paths')
  const profiles = await selectAll<{ id: string }>(supabase, 'profiles', 'id')
  const protegidas = new Set([...jobs.map((j) => j.id), ...profiles.map((p) => p.id)])
  const referenciados = new Set(jobs.flatMap((j) => (j.raw_video_paths ?? []).map((p) => p.replace(/^raw-videos-v2\//, ''))))
  console.log(`${jobs.length} jobs y ${profiles.length} perfiles existentes. Margen: ${dias} días.\n`)

  const candidatos: Candidate[] = []
  const esViejo = (files: StorageFile[]) => files.length > 0 && files.every((f) => Date.parse(f.createdAt) < limite)

  for (const entry of await listAll(supabase, RAW_BUCKET, '')) {
    if (entry.id || !UUID.test(entry.name) || protegidas.has(entry.name)) continue
    const files = await listFiles(supabase, RAW_BUCKET, entry.name)
    if (files.some((f) => referenciados.has(f.path)) || !esViejo(files)) continue
    candidatos.push({ bucket: RAW_BUCKET, owner: entry.name, files })
  }
  for (const file of await listFiles(supabase, REELS_BUCKET, '')) {
    const jobId = file.path.replace(/\.mp4$/i, '')
    if (!UUID.test(jobId) || protegidas.has(jobId) || !esViejo([file])) continue
    candidatos.push({ bucket: REELS_BUCKET, owner: jobId, files: [file] })
  }
  for (const entry of await listAll(supabase, MUSIC_BUCKET, 'reel-vo')) {
    if (entry.id || !UUID.test(entry.name) || protegidas.has(entry.name)) continue
    const files = await listFiles(supabase, MUSIC_BUCKET, `reel-vo/${entry.name}`)
    if (!esViejo(files)) continue
    candidatos.push({ bucket: MUSIC_BUCKET, owner: entry.name, files })
  }

  for (const bucket of [RAW_BUCKET, REELS_BUCKET, MUSIC_BUCKET]) {
    const del = candidatos.filter((c) => c.bucket === bucket)
    const files = del.flatMap((c) => c.files)
    const fechas = files.map((f) => f.createdAt.slice(0, 10)).sort()
    console.log(
      `${bucket}: ${files.length} archivos de ${del.length} trabajos borrados, ${gb(files.reduce((s, f) => s + f.bytes, 0))}` +
        (fechas.length ? ` (del ${fechas[0]} al ${fechas[fechas.length - 1]})` : '')
    )
  }
  const total = candidatos.flatMap((c) => c.files)
  console.log(`\nTotal: ${total.length} archivos, ${gb(total.reduce((s, f) => s + f.bytes, 0))}`)

  const reporte = path.join(tmpdir(), `limpieza-huerfanos-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`)
  writeFileSync(reporte, JSON.stringify(candidatos, null, 2))
  console.log(`Lista completa: ${reporte}`)

  if (!borrar) {
    console.log('\nNo se borró nada. Para borrar, vuelve a correrlo con --borrar.')
    return
  }

  console.log('\nBorrando…')
  let borrados = 0
  for (const bucket of [RAW_BUCKET, REELS_BUCKET, MUSIC_BUCKET]) {
    const paths = candidatos.filter((c) => c.bucket === bucket).flatMap((c) => c.files.map((f) => f.path))
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) throw new Error(`Error borrando en ${bucket} (llevaba ${borrados}): ${error.message}`)
      borrados += data?.length ?? 0
      process.stdout.write(`\r  ${borrados}/${total.length}`)
    }
  }
  console.log(`\nListo: ${borrados} archivos borrados.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
