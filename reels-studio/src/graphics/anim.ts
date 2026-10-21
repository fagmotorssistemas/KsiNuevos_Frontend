import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/**
 * Entrada suave (sin rebote) y salida pausada; se usa dentro del <Sequence> de cada gráfico.
 * El equipo pidió animaciones sutiles: resortes amortiguados y salidas de ~0.5 s.
 */
export function useEnterExit(exitFrames = 14) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width, height } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 90, mass: 1 } })
  const exit = interpolate(frame, [durationInFrames - exitFrames, durationInFrames], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  })
  return { frame, fps, durationInFrames, width, height, enter, exit }
}

/** Resorte suave que empieza `delay` cuadros después. */
export function delayedSpring(frame: number, fps: number, delay: number, damping = 20, stiffness = 100) {
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.9 } })
}

/** Separa "¿BUSCAS UN *SUV* A DIÉSEL?" en palabras, marcando las que van entre asteriscos. */
export function splitEmphasis(text: string): Array<{ word: string; strong: boolean }> {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w.replace(/\*/g, ''), strong: w.includes('*') }))
}
