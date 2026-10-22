/**
 * Acercamiento hacia lo que el director señaló (p. ej. los mandos del volante): a qué punto de la pantalla se lleva
 * el objeto para que no choque con la tarjeta de texto ni deje bordes vacíos. El director de motion graphics recibe
 * ese destino y la escala en el guion.
 */
import type { ScreenFocus } from './types'

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
