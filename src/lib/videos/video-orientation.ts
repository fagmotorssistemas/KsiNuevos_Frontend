/** Lógica compartida: orientación vertical para Reels (9:16). */

export type VideoStreamProbe = {
  codedWidth: number
  codedHeight: number
  /** Grados de rotación en metadatos (0, 90, 180, 270 o -90). */
  rotationDeg: number
}

export type ReelOrientationPlan = {
  /** Hay que re-codificar para “quemar” la orientación en los píxeles. */
  required: boolean
  /** Filtro `-vf` (incluye scale). Vacío si no hace falta tocar el clip. */
  vfFilter: string
  reason: string
}

const REEL_MAX_WIDTH = 1080

export function normalizeRotationDegrees(value: number): number {
  if (!Number.isFinite(value)) return 0
  const n = Math.round(value)
  const mod = ((n % 360) + 360) % 360
  return mod
}

/** Dimensiones visibles tras aplicar el tag de rotación (sin re-codificar píxeles). */
export function displayDimensions(probe: VideoStreamProbe): { width: number; height: number } {
  const rot = normalizeRotationDegrees(probe.rotationDeg)
  if (rot === 90 || rot === 270) {
    return { width: probe.codedHeight, height: probe.codedWidth }
  }
  return { width: probe.codedWidth, height: probe.codedHeight }
}

/**
 * Convierte el tag `rotate` del contenedor en filtro ffmpeg (con -noautorotate).
 * El tag indica cuánto gira el reproductor en sentido horario; en píxeles aplicamos lo inverso.
 */
function transposeFilterForDegrees(rotationDeg: number): string | null {
  const rot = normalizeRotationDegrees(rotationDeg)
  if (rot === 90) return 'transpose=2'
  if (rot === 270) return 'transpose=1'
  if (rot === 180) return 'hflip,vflip'
  return null
}

function scaleFilterForReel(): string {
  return `scale='min(${REEL_MAX_WIDTH},iw)':-2`
}

/**
 * Plan para Reels: Shotstack no aplica `rotate` del MP4/MOV — hay que enderezar píxeles.
 * - Metadato rotate ≠ 0 → transpose + scale + quitar tag.
 * - Píxeles apaisados sin tag → transpose=1 + scale (grabación vertical mal exportada).
 */
export function planReelOrientation(probe: VideoStreamProbe): ReelOrientationPlan {
  const rot = normalizeRotationDegrees(probe.rotationDeg)
  const filters: string[] = []
  const reasons: string[] = []

  const metaTranspose = transposeFilterForDegrees(rot)
  if (metaTranspose) {
    filters.push(metaTranspose)
    reasons.push(`rotate=${rot}`)
  }

  const afterMeta = displayDimensions(probe)
  if (afterMeta.width > afterMeta.height) {
    if (!metaTranspose) {
      filters.push('transpose=1')
      reasons.push('píxeles apaisados')
    }
  }

  if (filters.length === 0) {
    return {
      required: false,
      vfFilter: '',
      reason: 'ya vertical sin tag de rotación',
    }
  }

  return {
    required: true,
    vfFilter: `${filters.join(',')},${scaleFilterForReel()}`,
    reason: reasons.join(' + '),
  }
}

/** Repara clips verticales ya “quemados” pero de cabeza (sin tag rotate). */
export function planReelFlip180Repair(probe: VideoStreamProbe): ReelOrientationPlan {
  const rot = normalizeRotationDegrees(probe.rotationDeg)
  if (rot !== 0) {
    return { required: false, vfFilter: '', reason: 'tiene tag rotate' }
  }
  if (probe.codedHeight <= probe.codedWidth) {
    return { required: false, vfFilter: '', reason: 'no es vertical nativo' }
  }
  return {
    required: true,
    vfFilter: `hflip,vflip,${scaleFilterForReel()}`,
    reason: 'reparación 180° (invertido)',
  }
}

export function parseFfprobeVideoStream(stream: Record<string, unknown>): VideoStreamProbe | null {
  const width = Number(stream.width)
  const height = Number(stream.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  let rotationDeg = 0
  const tags = stream.tags
  if (tags && typeof tags === 'object') {
    const rotateRaw = (tags as Record<string, unknown>).rotate
    if (rotateRaw != null) {
      const n = Number(String(rotateRaw).trim())
      if (Number.isFinite(n)) rotationDeg = n
    }
  }

  const sideData = stream.side_data_list
  if (Array.isArray(sideData)) {
    for (const entry of sideData) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      if (typeof row.rotation === 'number' && Number.isFinite(row.rotation)) {
        rotationDeg = row.rotation
        break
      }
    }
  }

  return { codedWidth: width, codedHeight: height, rotationDeg }
}
