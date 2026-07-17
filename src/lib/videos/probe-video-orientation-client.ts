/**
 * Probe de orientación en el navegador (sin Nest / sin ffmpeg.wasm).
 *
 * - Dimensiones: `<video>` reporta tamaño de *display* (tras aplicar rotate).
 * - Tag rotate / matriz: se lee del contenedor MP4/MOV.
 * - Combinados → coded size + rotationDeg para planReelOrientation / Shotstack.
 */

import {
  buildClipOrientationMeta,
  normalizeRotationDegrees,
  type ClipOrientationMeta,
  type VideoStreamProbe,
} from '@/lib/videos/video-orientation'

const HEAD_BYTES = 3 * 1024 * 1024
const TAIL_BYTES = 2 * 1024 * 1024

function readU32(view: DataView, offset: number, le = false): number {
  return le ? view.getUint32(offset, true) : view.getUint32(offset, false)
}

function readI32(view: DataView, offset: number, le = false): number {
  return le ? view.getInt32(offset, true) : view.getInt32(offset, false)
}

function boxTypeAt(u8: Uint8Array, offset: number): string {
  return String.fromCharCode(u8[offset]!, u8[offset + 1]!, u8[offset + 2]!, u8[offset + 3]!)
}

/** Busca tag ASCII `rotate` + número (−90…270) en un buffer de moov. */
function scanRotateAscii(u8: Uint8Array): number | null {
  const needle = [0x72, 0x6f, 0x74, 0x61, 0x74, 0x65] // rotate
  for (let i = 0; i < u8.length - 8; i++) {
    let ok = true
    for (let j = 0; j < needle.length; j++) {
      if (u8[i + j] !== needle[j]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const slice = u8.subarray(i, Math.min(i + 48, u8.length))
    const text = Array.from(slice)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ' '))
      .join('')
    const m = text.match(/rotate[^0-9\-]*(-?\d{1,3})/i)
    if (!m) continue
    const n = Number(m[1])
    if (!Number.isFinite(n)) continue
    const norm = normalizeRotationDegrees(n)
    if (norm === 0 || norm === 90 || norm === 180 || norm === 270) return n
  }
  return null
}

/**
 * Matriz tkhd (16.16). Ángulo ≈ lo que reportan players / tags.rotate.
 * Positivo Shotstack = horario; aquí devolvemos grados de metadato estilo QuickTime.
 */
function rotationFromTkhdMatrix(a: number, b: number, c: number, d: number): number {
  const A = a / 65536
  const B = b / 65536
  const angle = Math.round((Math.atan2(B, A) * 180) / Math.PI)
  return normalizeRotationDegrees(angle)
}

function parseTkhdRotation(view: DataView, contentStart: number, contentSize: number): number | null {
  if (contentSize < 84) return null
  const version = view.getUint8(contentStart)
  // v0: +8 timestamps; v1: +16. Luego track_id(4)+reserved(4)+duration(4|8)+reserved(8)+layer…
  const afterHdr = version === 1 ? contentStart + 1 + 3 + 8 + 8 + 4 + 4 + 8 + 8 : contentStart + 1 + 3 + 4 + 4 + 4 + 4 + 4 + 8
  // layer(2)+alt(2)+volume(2)+reserved(2) = 8 → matrix @ afterHdr+8
  const matrixAt = afterHdr + 8
  if (matrixAt + 36 > contentStart + contentSize) return null
  const a = readI32(view, matrixAt)
  const b = readI32(view, matrixAt + 4)
  const c = readI32(view, matrixAt + 12)
  const d = readI32(view, matrixAt + 16)
  const deg = rotationFromTkhdMatrix(a, b, c, d)
  return deg === 0 ? 0 : deg
}

function findRotationInBuffer(buf: ArrayBuffer): number | null {
  const u8 = new Uint8Array(buf)
  const view = new DataView(buf)
  let bestFromMatrix: number | null = null
  const fromAscii = scanRotateAscii(u8)
  if (fromAscii != null && normalizeRotationDegrees(fromAscii) !== 0) {
    return fromAscii
  }

  let offset = 0
  while (offset + 8 <= u8.length) {
    let size = readU32(view, offset)
    const type = boxTypeAt(u8, offset + 4)
    let header = 8
    if (size === 1) {
      if (offset + 16 > u8.length) break
      const high = readU32(view, offset + 8)
      const low = readU32(view, offset + 12)
      if (high !== 0) break
      size = low
      header = 16
    } else if (size === 0) {
      size = u8.length - offset
    }
    if (size < header || offset + size > u8.length) break
    const contentStart = offset + header
    const contentSize = size - header

    if (
      type === 'moov' ||
      type === 'trak' ||
      type === 'mdia' ||
      type === 'minf' ||
      type === 'stbl' ||
      type === 'udta' ||
      type === 'meta' ||
      type === 'ilst'
    ) {
      const nested = findRotationInBuffer(buf.slice(contentStart, contentStart + contentSize))
      if (nested != null && normalizeRotationDegrees(nested) !== 0) return nested
      if (nested === 0 && bestFromMatrix == null) bestFromMatrix = 0
    } else if (type === 'tkhd') {
      const deg = parseTkhdRotation(view, contentStart, contentSize)
      if (deg != null && deg !== 0) return deg
      if (deg === 0) bestFromMatrix = 0
    }

    offset += size
  }

  return fromAscii ?? bestFromMatrix
}

async function loadContainerChunks(blob: Blob): Promise<ArrayBuffer[]> {
  if (blob.size <= HEAD_BYTES + TAIL_BYTES) {
    return [await blob.arrayBuffer()]
  }
  const head = await blob.slice(0, HEAD_BYTES).arrayBuffer()
  const tailStart = Math.max(0, blob.size - TAIL_BYTES)
  const tail = await blob.slice(tailStart).arrayBuffer()
  return [head, tail]
}

async function extractRotationFromContainer(blob: Blob): Promise<number> {
  const chunks = await loadContainerChunks(blob)
  for (const chunk of chunks) {
    const rot = findRotationInBuffer(chunk)
    if (rot != null) return rot
  }
  return 0
}

function readDisplaySizeFromVideoElement(blob: Blob): Promise<{ width: number; height: number } | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const done = (result: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
      resolve(result)
    }

    const timer = window.setTimeout(() => done(null), 12_000)

    video.onloadedmetadata = () => {
      window.clearTimeout(timer)
      const width = video.videoWidth
      const height = video.videoHeight
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        done(null)
        return
      }
      done({ width, height })
    }
    video.onerror = () => {
      window.clearTimeout(timer)
      done(null)
    }
    video.src = url
  })
}

/**
 * Inferir píxeles codificados: el `<video>` da display; con rotate 90/270 se invierte.
 */
export function probeFromDisplayAndRotation(
  displayWidth: number,
  displayHeight: number,
  rotationDeg: number
): VideoStreamProbe {
  const rot = normalizeRotationDegrees(rotationDeg)
  if (rot === 90 || rot === 270) {
    return {
      codedWidth: displayHeight,
      codedHeight: displayWidth,
      rotationDeg,
    }
  }
  return {
    codedWidth: displayWidth,
    codedHeight: displayHeight,
    rotationDeg,
  }
}

export async function probeVideoOrientationClient(blob: Blob): Promise<VideoStreamProbe | null> {
  try {
    const [rotationDeg, display] = await Promise.all([
      extractRotationFromContainer(blob),
      readDisplaySizeFromVideoElement(blob),
    ])
    if (!display) return null
    return probeFromDisplayAndRotation(display.width, display.height, rotationDeg)
  } catch (err) {
    console.warn('[probe-video-orientation]', err)
    return null
  }
}

export async function probeClipOrientationMeta(blob: Blob): Promise<ClipOrientationMeta | null> {
  const probe = await probeVideoOrientationClient(blob)
  if (!probe) return null
  return buildClipOrientationMeta(probe)
}

/** Probe de una URL firmada (clips ya en biblioteca). Usa Range cuando el servidor lo permite. */
export async function probeClipOrientationMetaFromUrl(url: string): Promise<ClipOrientationMeta | null> {
  try {
    const headRes = await fetch(url, {
      headers: { Range: `bytes=0-${HEAD_BYTES - 1}` },
    })
    if (!headRes.ok && headRes.status !== 206) {
      const full = await fetch(url)
      if (!full.ok) return null
      const blob = await full.blob()
      return probeClipOrientationMeta(blob)
    }
    const headBuf = await headRes.arrayBuffer()
    // Sin tamaño total fiable, al menos probar head; si hace falta, pedir cola con Content-Range
    const cr = headRes.headers.get('content-range')
    let blob: Blob
    if (cr) {
      const m = cr.match(/\/(\d+)\s*$/)
      const total = m ? Number(m[1]) : 0
      if (Number.isFinite(total) && total > HEAD_BYTES + TAIL_BYTES) {
        const tailRes = await fetch(url, {
          headers: { Range: `bytes=${total - TAIL_BYTES}-${total - 1}` },
        })
        const pieces: BlobPart[] = [headBuf]
        if (tailRes.ok || tailRes.status === 206) {
          pieces.push(await tailRes.arrayBuffer())
        }
        blob = new Blob(pieces, { type: 'video/mp4' })
      } else {
        blob = new Blob([headBuf], { type: 'video/mp4' })
      }
    } else {
      blob = new Blob([headBuf], { type: 'video/mp4' })
    }

    // Dimensiones: el element `<video>` necesita un archivo usable; si Range partió mal, fallback full
    const meta = await probeClipOrientationMeta(blob)
    if (meta) return meta

    const full = await fetch(url)
    if (!full.ok) return null
    return probeClipOrientationMeta(await full.blob())
  } catch (err) {
    console.warn('[probe-video-orientation] url', err)
    return null
  }
}
