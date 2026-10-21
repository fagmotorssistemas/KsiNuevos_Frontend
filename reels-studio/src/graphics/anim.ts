import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Entrada con resorte y salida acelerada; se usa dentro del <Sequence> de cada gráfico. */
export function useEnterExit(exitFrames = 8) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width, height } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 160, mass: 0.7 } })
  const exit = interpolate(frame, [durationInFrames - exitFrames, durationInFrames], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  })
  return { frame, fps, durationInFrames, width, height, enter, exit }
}

/** Resorte que empieza `delay` cuadros después. */
export function delayedSpring(frame: number, fps: number, delay: number, damping = 13, stiffness = 170) {
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.7 } })
}

/** Separa "¿BUSCAS UN *SUV* A DIÉSEL?" en palabras, marcando las que van entre asteriscos. */
export function splitEmphasis(text: string): Array<{ word: string; strong: boolean }> {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w.replace(/\*/g, ''), strong: w.includes('*') }))
}
