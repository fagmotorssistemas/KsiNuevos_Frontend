import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Ruta de un clip relativa a reels-studio/public (así se guarda en el montaje). */
export function toPublicSrc(file: string): string {
  const rel = path.relative(path.join(ROOT, 'public'), path.resolve(file))
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`El clip debe estar dentro de reels-studio/public: ${file}`)
  return rel.split(path.sep).join('/')
}

export type ProbeResult = { width: number; height: number; durationSec: number }

/** Lee tamaño (ya rotado) y duración de un video con ffprobe. */
export function probeVideo(pathOrUrl: string): ProbeResult {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:stream_side_data=rotation:format=duration', '-of', 'json', pathOrUrl],
    { encoding: 'utf8' }
  )
  const data = JSON.parse(out) as {
    streams?: Array<{ width: number; height: number; side_data_list?: Array<{ rotation?: number }> }>
    format?: { duration?: string }
  }
  const s = data.streams?.[0]
  if (!s) throw new Error(`Sin pista de video: ${pathOrUrl}`)
  const rotation = Math.abs(s.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0)
  const rotated = rotation === 90 || rotation === 270
  return {
    width: rotated ? s.height : s.width,
    height: rotated ? s.width : s.height,
    durationSec: Number(data.format?.duration ?? 0),
  }
}
