/**
 * 3D del modo cine: letras de cromo extruidas (three.js) que llegan una por una desde el fondo, se asientan y siguen
 * girando apenas mientras una luz las cruza, como el título de un comercial de autos. Más partículas de luz flotando
 * para dar profundidad.
 */
import React from 'react'
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelTheme } from '../../plan/types'
import { Letters3D, staggered } from '../../three/Letters3D'
import { Stage3D, UNITS_PER_PX } from '../../three/Stage3D'
import type { FontKey } from '../../three/Text3D'
import { clamp } from '../anim'

export { UNITS_PER_PX }

/**
 * Texto de cromo en 3D. `y` es la altura en píxeles del centro del texto; las letras empiezan a llegar en el cuadro
 * `delay`, una cada 3 cuadros; `exit` va de 0 a 1.
 */
export const Chrome3D: React.FC<{
  text: string
  font: FontKey
  theme: ReelTheme
  y: number
  delay: number
  exit: number
  size?: number
  maxWidthPx?: number
}> = ({ text, font, theme, y, delay, exit, size = 1.25, maxWidthPx = 940 }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, height } = useVideoConfig()
  const t = frame / fps
  const enter = enter3d(frame, delay, 30)
  // Luz que cruza las letras de izquierda a derecha durante el gráfico (reflejo que corre por el cromo).
  const sweep = interpolate(frame, [0, durationInFrames], [-7, 7])
  const sceneY = (height / 2 - y) * UNITS_PER_PX
  const turn = (1 - enter) * -0.35 + 0.1 - t * 0.035
  const letter = staggered(frame, delay, 3, 20)

  return (
    <Stage3D sweep={[sweep, sceneY + 1.2]}>
      <group
        position={[0, sceneY, 0]}
        rotation={[0.05 + Math.sin(t * 0.9) * 0.025 + exit * 0.4, turn, 0]}
        scale={Math.max(0.001, 1 - exit * 0.4)}
      >
        <Letters3D
          text={text}
          font={font}
          finish={theme === 'offroad' ? 'rust' : 'chrome'}
          entrance="depth"
          progress={letter}
          size={size}
          maxWidth={maxWidthPx * UNITS_PER_PX}
        />
      </group>
    </Stage3D>
  )
}

/** Partículas de luz que flotan hacia arriba (polvo en el aire de un estudio). `strength` 0–1. */
export const Particles: React.FC<{ seed: string; strength?: number; warm?: boolean }> = ({ seed, strength = 1, warm = false }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const color = warm ? '255, 190, 120' : '255, 255, 255'
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: strength }}>
      {Array.from({ length: 28 }, (_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`)
        const size = 3 + r('s') * 7
        const speed = 0.4 + r('v') * 1.2
        const x = r('x') * width + Math.sin(frame / (30 + r('w') * 40) + r('p') * 6) * 24
        const y = height * (0.15 + r('y') * 0.75) - ((frame * speed) % (height * 0.6))
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(frame / (12 + r('t') * 18) + r('q') * 6))
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y < 0 ? y + height * 0.6 : y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `rgba(${color}, ${0.55 * twinkle})`,
              boxShadow: `0 0 ${size * 3}px rgba(${color}, ${0.5 * twinkle})`,
              filter: size > 7 ? 'blur(1.5px)' : undefined,
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}

/** Entrada de 0 a 1 en `dur` cuadros, frenando al final (para el 3D). */
export function enter3d(frame: number, delay: number, dur: number): number {
  return interpolate(frame - delay, [0, dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
}
