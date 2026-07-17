/**
 * Sondea rotate/dimensión de clips recientes en Storage (solo lectura).
 * Uso: node --env-file=.env scripts/probe-clip-rotation.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

const execFileAsync = promisify(execFile)
const BUCKET = 'raw-videos-v2'

function findWingetFfmpeg() {
  const localApp = process.env.LOCALAPPDATA
  if (!localApp) return null
  const packagesDir = path.join(localApp, 'Microsoft', 'WinGet', 'Packages')
  if (!existsSync(packagesDir)) return null
  for (const entry of readdirSync(packagesDir)) {
    if (!/ffmpeg/i.test(entry)) continue
    const walk = (dir, depth = 0) => {
      if (depth > 5) return null
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isFile() && e.name.toLowerCase() === 'ffprobe.exe') return full
        if (e.isDirectory()) {
          const f = walk(full, depth + 1)
          if (f) return f
        }
      }
      return null
    }
    const found = walk(path.join(packagesDir, entry))
    if (found) return found
  }
  return null
}

async function resolveFfprobe() {
  try {
    const { stdout } = await execFileAsync('where.exe', ['ffprobe'], { windowsHide: true })
    const line = stdout.trim().split(/\r?\n/)[0]
    if (line && existsSync(line)) return line
  } catch {
    /* fall through */
  }
  return findWingetFfmpeg()
}

async function probe(ffprobe, url) {
  const { stdout } = await execFileAsync(
    ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-show_entries',
      'stream_tags=rotate',
      '-show_entries',
      'stream_side_data=rotation',
      '-of',
      'json',
      url,
    ],
    { timeout: 120000, maxBuffer: 4 * 1024 * 1024 }
  )
  const parsed = JSON.parse(stdout)
  const stream = parsed.streams?.[0] ?? {}
  let rotation = 0
  if (stream.tags?.rotate != null) rotation = Number(stream.tags.rotate) || 0
  if (Array.isArray(stream.side_data_list)) {
    for (const sd of stream.side_data_list) {
      if (typeof sd.rotation === 'number') {
        rotation = sd.rotation
        break
      }
    }
  }
  return {
    width: stream.width ?? null,
    height: stream.height ?? null,
    rotation,
  }
}

const JOBS = [
  {
    name: 'Jeep (hoy, reel normalizado)',
    id: '092220e1-d1b3-40be-8335-54a18c41ea44',
    samples: [0, 1, 9],
  },
  {
    name: 'Rav4 DJI (hoy)',
    id: 'ac888f27-5945-44ed-b16f-4899474ef4d8',
    samples: [0, 2, 8],
  },
  {
    name: 'Fortuner DJI (ayer)',
    id: '114485bd-1868-4924-a72c-1c84b2b995c6',
    samples: [0, 1, 5],
  },
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan env Supabase')

  const ffprobe = await resolveFfprobe()
  if (!ffprobe) throw new Error('ffprobe no encontrado')
  console.log('ffprobe:', ffprobe)

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  for (const job of JOBS) {
    const { data: row, error } = await supabase
      .from('video_jobs_v2')
      .select('id, job_name, raw_video_paths, created_at')
      .eq('id', job.id)
      .maybeSingle()
    if (error || !row) {
      console.log(`\n[${job.name}] ERROR`, error?.message ?? 'no row')
      continue
    }
    const paths = row.raw_video_paths ?? []
    console.log(`\n=== ${job.name} ===`)
    console.log(`${row.job_name} | clips=${paths.length} | ${row.created_at}`)

    for (const idx of job.samples) {
      const p = paths[idx]
      if (!p) continue
      const { data: signed, error: sErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p, 120)
      if (sErr || !signed?.signedUrl) {
        console.log(`  clip_${idx}: signedUrl fail`, sErr?.message)
        continue
      }
      try {
        const info = await probe(ffprobe, signed.signedUrl)
        const needs =
          info.rotation !== 0 ||
          (info.width && info.height && info.width > info.height)
        console.log(
          `  clip_${idx}: ${info.width}x${info.height} rotate=${info.rotation}` +
            (needs ? ' → NECESITA_AJUSTE' : ' → OK') +
            ` | ${p.split('/').pop()}`
        )
      } catch (e) {
        console.log(`  clip_${idx}: probe fail`, e instanceof Error ? e.message : e)
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
