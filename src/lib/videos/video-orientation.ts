/** Lógica compartida: orientación vertical para Reels (9:16). */

export type VideoStreamProbe = {
  codedWidth: number
  codedHeight: number
  /** Grados de rotación en metadatos (0, 90, 180, 270 o -90). */
  rotationDeg: number
}

export type ReelOrientationPlan = {
  /** Hay que re-codificar o al menos limpiar metadatos. */
  required: boolean
  /**
   * - `reencode`: aplicar vfFilter (transpose) + quitar rotate.
   * - `strip_meta`: píxeles ya verticales pero quedó rotate/-90 → solo limpiar tag (sin voltear).
   * - `none`: no hacer nada.
   */
  mode: 'none' | 'reencode' | 'strip_meta'
  /** Filtro `-vf` (incluye scale). Vacío si strip_meta o none. */
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
 * El tag indica cuánto gira el reproductor; en píxeles aplicamos el filtro equivalente.
 * Nota: ffprobe a veces reporta -90 → se normaliza a 270°.
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
 * Plan para Reels: Shotstack no aplica `rotate` del MP4/MOV.
 *
 * Casos:
 * 1) Píxeles apaisados + rotate 90/270 → transpose + quitar tag.
 * 2) Píxeles YA verticales + rotate ≠ 0 (p. ej. tras un normalize mal limpiado) → SOLO strip tag.
 * 3) Vertical sin tag → skip.
 */
export function planReelOrientation(probe: VideoStreamProbe): ReelOrientationPlan {
  const rot = normalizeRotationDegrees(probe.rotationDeg)
  const pixelsPortrait = probe.codedHeight > probe.codedWidth
  const pixelsLandscape = probe.codedWidth > probe.codedHeight

  // Caso crítico: ya vertical en píxeles pero quedó metadato (p. ej. rotate=-90).
  // Volver a hacer transpose los deja mal; solo hay que limpiar la etiqueta.
  if (rot !== 0 && pixelsPortrait) {
    return {
      required: true,
      mode: 'strip_meta',
      vfFilter: '',
      reason: `píxeles ya verticales + rotate=${rot} (solo limpiar metadato)`,
    }
  }

  const filters: string[] = []
  const reasons: string[] = []

  const metaTranspose = transposeFilterForDegrees(rot)
  if (metaTranspose && pixelsLandscape) {
    filters.push(metaTranspose)
    reasons.push(`rotate=${rot}`)
  }

  if (pixelsLandscape && !metaTranspose) {
    filters.push('transpose=1')
    reasons.push('píxeles apaisados')
  }

  if (filters.length === 0) {
    return {
      required: false,
      mode: 'none',
      vfFilter: '',
      reason: 'ya vertical sin tag de rotación',
    }
  }

  return {
    required: true,
    mode: 'reencode',
    vfFilter: `${filters.join(',')},${scaleFilterForReel()}`,
    reason: reasons.join(' + '),
  }
}

/** Repara clips verticales ya “quemados” pero de cabeza (sin tag rotate). */
export function planReelFlip180Repair(probe: VideoStreamProbe): ReelOrientationPlan {
  const rot = normalizeRotationDegrees(probe.rotationDeg)
  if (rot !== 0) {
    return { required: false, mode: 'none', vfFilter: '', reason: 'tiene tag rotate' }
  }
  if (probe.codedHeight <= probe.codedWidth) {
    return { required: false, mode: 'none', vfFilter: '', reason: 'no es vertical nativo' }
  }
  return {
    required: true,
    mode: 'reencode',
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

/**
 * Ángulo Shotstack (`transform.rotate.angle`).
 *
 * DESACTIVADO tras job Beetle 10d54aeb…: el probe del navegador mezcló
 * clips ya normalizados (píxeles verticales + tag sucio) con Honor crudos
 * y aplicó -90° solo a algunos → dañó los que estaban bien y dejó mal el resto.
 * Orientación fiable = Nest/ffmpeg (normalizeOrientation), no transform en edit.
 */
export function shotstackRotateAngleForProbe(_probe: VideoStreamProbe): number | null {
  return null
  /*
  const plan = planReelOrientation(probe)
  if (plan.mode !== 'reencode') return null
  const rot = normalizeRotationDegrees(probe.rotationDeg)
  const landscape = probe.codedWidth > probe.codedHeight
  if (!landscape) return null
  if (rot === 90) return -90
  if (rot === 270) return 90
  if (rot === 180) return 180
  return 90
  */
}

/** Metadato guardado en selected_clips (índice = orden de raw_video_paths). */
export type ClipOrientationMeta = {
  codedWidth: number
  codedHeight: number
  rotationDeg: number
  /** null = Shotstack no debe rotar este clip */
  shotstackRotateAngle: number | null
  reason: string
}

export function buildClipOrientationMeta(probe: VideoStreamProbe): ClipOrientationMeta {
  const plan = planReelOrientation(probe)
  return {
    codedWidth: probe.codedWidth,
    codedHeight: probe.codedHeight,
    rotationDeg: probe.rotationDeg,
    shotstackRotateAngle: shotstackRotateAngleForProbe(probe),
    reason: plan.reason,
  }
}

export function normalizeClipOrientationsInput(
  raw: unknown,
  clipCount: number
): ClipOrientationMeta[] | undefined {
  if (!Array.isArray(raw) || raw.length !== clipCount) return undefined
  const out: ClipOrientationMeta[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') return undefined
    const o = row as Record<string, unknown>
    const codedWidth = Number(o.codedWidth)
    const codedHeight = Number(o.codedHeight)
    const rotationDeg = Number(o.rotationDeg)
    if (
      !Number.isFinite(codedWidth) ||
      !Number.isFinite(codedHeight) ||
      codedWidth <= 0 ||
      codedHeight <= 0 ||
      !Number.isFinite(rotationDeg)
    ) {
      return undefined
    }
    let shotstackRotateAngle: number | null = null
    if (o.shotstackRotateAngle != null && o.shotstackRotateAngle !== '') {
      const a = Number(o.shotstackRotateAngle)
      if (!Number.isFinite(a)) return undefined
      shotstackRotateAngle = a
    }
    out.push({
      codedWidth,
      codedHeight,
      rotationDeg,
      shotstackRotateAngle,
      reason: typeof o.reason === 'string' ? o.reason : '',
    })
  }
  return out
}
