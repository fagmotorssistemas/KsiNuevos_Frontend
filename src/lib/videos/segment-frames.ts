/**
 * Cuadros para el editor (Claude no recibe video): una imagen chica por segmento del mapa,
 * tomada a mitad del segmento y etiquetada con su segment_id. Así Claude juzga cada toma
 * (encuadre, energía, qué parte del auto se ve) con pocos tokens.
 *
 * ffmpeg salta directo al segundo pedido sobre la URL firmada (sin descargar el clip entero).
 * Si ffmpeg no está disponible o falla, devuelve [] y el análisis sigue solo con texto.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { resolveFfmpegBinaries } from '@/lib/videos/resolve-ffmpeg-path'
import type { Segment } from './segmenter'

const execFileAsync = promisify(execFile)

/** Tope de cuadros por Reel (cada uno ≈110 tokens a 384 px). */
const MAX_FRAMES = 40
/** Lado mayor del cuadro en px. */
const FRAME_LONG_SIDE_PX = 384
/** Segmentos más largos que esto (p. ej. B-roll) llevan 2 cuadros en vez de 1. */
const TWO_FRAMES_MIN_SEC = 6
const FRAME_TIMEOUT_MS = 25_000
const CONCURRENCY = 4

export interface SegmentFrame {
  segment_id: string
  clip_index: number
  /** Segundo dentro del clip original. */
  sec: number
  /** JPEG en base64. */
  data: string
}

function frameTimesForSegment(seg: Segment): number[] {
  const start = seg.start_s
  const dur = Math.max(0, seg.end_s - seg.start_s)
  if (dur >= TWO_FRAMES_MIN_SEC) return [start + dur / 3, start + (2 * dur) / 3]
  return [start + dur / 2]
}

/** Si hay más pedidos que el tope, toma una muestra pareja conservando el orden. */
function sampleEvenly<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  const step = items.length / max
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)]!)
}

async function grabFrameJpeg(ffmpeg: string, url: string, sec: number): Promise<Buffer> {
  const side = FRAME_LONG_SIDE_PX
  const { stdout } = await execFileAsync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', sec.toFixed(2),
      '-i', url,
      '-frames:v', '1',
      '-vf', `scale='if(gt(iw,ih),${side},-2)':'if(gt(iw,ih),-2,${side})'`,
      '-q:v', '6',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ],
    { encoding: 'buffer', timeout: FRAME_TIMEOUT_MS, maxBuffer: 5 * 1024 * 1024 }
  )
  if (!stdout || stdout.length === 0) throw new Error('ffmpeg no devolvió imagen')
  return stdout
}

/**
 * @param clipUrls URL firmada de cada clip, indexada por clip_index.
 */
export async function extractSegmentFrames(
  segments: Segment[],
  clipUrls: string[],
  jobId: string
): Promise<SegmentFrame[]> {
  const binaries = await resolveFfmpegBinaries()
  if (!binaries) {
    console.warn(`[VideoV2Pipeline][${jobId}][Frames] Sin ffmpeg en el servidor: análisis solo con texto`)
    return []
  }

  const requests = sampleEvenly(
    segments
      .filter((s) => clipUrls[s.clip_index])
      .flatMap((s) => frameTimesForSegment(s).map((sec) => ({ seg: s, sec }))),
    MAX_FRAMES
  )

  const frames: (SegmentFrame | null)[] = new Array(requests.length).fill(null)
  let next = 0
  let failed = 0
  const worker = async () => {
    while (next < requests.length) {
      const i = next++
      const { seg, sec } = requests[i]!
      try {
        const jpeg = await grabFrameJpeg(binaries.ffmpeg, clipUrls[seg.clip_index]!, sec)
        frames[i] = {
          segment_id: seg.segment_id,
          clip_index: seg.clip_index,
          sec: Number(sec.toFixed(2)),
          data: jpeg.toString('base64'),
        }
      } catch (err) {
        failed++
        if (failed === 1) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(`[VideoV2Pipeline][${jobId}][Frames] No se pudo sacar un cuadro (${seg.segment_id} t=${sec.toFixed(2)}s): ${msg}`)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, requests.length) }, worker))

  const ok = frames.filter((f): f is SegmentFrame => f != null)
  console.log(
    `[VideoV2Pipeline][${jobId}][Frames] ${ok.length}/${requests.length} cuadros de ${FRAME_LONG_SIDE_PX}px` +
      (failed > 0 ? ` (${failed} fallaron)` : '')
  )
  return ok
}
