/**
 * Zoom hacia lo que el director señaló (p. ej. los mandos del volante). El clip y el gráfico
 * usan exactamente estas funciones, así el anillo del señalador cae siempre sobre el objeto.
 */
import { Easing, interpolate } from 'remotion'
import type { ScreenFocus, ZoomSpec } from '../plan/types'

/** 0 → 1 (entra en ~0.55s), se mantiene, y vuelve a 0 en los últimos ~0.35s. */
export function zoomProgress(frame: number, durationInFrames: number, fps: number): number {
  const inF = Math.round(fps * 0.55)
  const outF = Math.round(fps * 0.35)
  const enter = interpolate(frame, [0, inF], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.9, 0.2, 1),
  })
  const exit = interpolate(frame, [durationInFrames - outF, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
  return Math.min(enter, exit)
}

/** Dónde está el objeto en el cuadro sin zoom, en `along` (0 = inicio, 1 = fin del gráfico). */
function focusAt(z: ZoomSpec, along: number): ScreenFocus {
  if (!z.focusEnd) return z.focus
  const k = Math.min(1, Math.max(0, along))
  const lerp = (a: number, b: number) => a + (b - a) * k
  return {
    cx: lerp(z.focus.cx, z.focusEnd.cx),
    cy: lerp(z.focus.cy, z.focusEnd.cy),
    w: lerp(z.focus.w, z.focusEnd.w),
    h: lerp(z.focus.h, z.focusEnd.h),
  }
}

/**
 * Transformación (origen arriba-izquierda) y posición actual del objeto en pantalla.
 * Si la cámara se mueve, el objeto se sigue y queda fijo en `target`.
 */
export function zoomTransform(z: ZoomSpec, progress: number, along: number) {
  const f = focusAt(z, along)
  const s = 1 + (z.scale - 1) * progress
  const px = f.cx + (z.target.x - f.cx) * progress
  const py = f.cy + (z.target.y - f.cy) * progress
  return {
    scale: s,
    translateX: px - f.cx * s,
    translateY: py - f.cy * s,
    point: { x: px, y: py },
    radius: (Math.max(f.w, f.h) / 2) * s,
  }
}

/**
 * Elige a dónde llevar el objeto: lejos de la tarjeta de texto y sin dejar bordes vacíos.
 * Con escala S, el destino debe quedar entre p·S − W·(S−1) y p·S para la posición
 * inicial y final del objeto (si la cámara se mueve).
 */
export function chooseZoomTarget(
  focus: ScreenFocus,
  focusEnd: ScreenFocus | undefined,
  scale: number,
  cardAtTop: boolean,
  width: number,
  height: number
): { x: number; y: number } {
  const want = { x: width / 2, y: cardAtTop ? height * 0.6 : height * 0.4 }
  const end = focusEnd ?? focus
  const clamp = (v: number, p0: number, p1: number, size: number) => {
    const lo = Math.max(p0, p1) * scale - size * (scale - 1)
    const hi = Math.min(p0, p1) * scale
    // Si el movimiento es tan grande que no hay rango válido, se prioriza no dejar bordes al final.
    if (lo > hi) return Math.min(p1 * scale, Math.max(p1 * scale - size * (scale - 1), v))
    return Math.min(hi, Math.max(lo, v))
  }
  return { x: clamp(want.x, focus.cx, end.cx, width), y: clamp(want.y, focus.cy, end.cy, height) }
}
