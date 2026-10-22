/**
 * 3D del modo cine: letras de cromo extruidas (three.js) que llegan desde el fondo, giran despacio y reflejan una luz
 * que las cruza, como el título de un comercial de autos. Más partículas de luz flotando para dar profundidad.
 */
import { ThreeCanvas } from '@remotion/three'
import React from 'react'
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelTheme } from '../../plan/types'
import { usePalette } from '../../reel/palette'
import { StudioEnvironment, Text3D, type FontKey } from '../../three/Text3D'
import { clamp } from '../anim'

/** Unidades de escena por píxel con la cámara de abajo (fov 35 a 14 de distancia, lienzo de 1920 de alto). */
const UNITS_PER_PX = (2 * Math.tan((17.5 * Math.PI) / 180) * 14) / 1920

/**
 * Texto de cromo en 3D. `y` es la altura en píxeles del centro del texto; `enter` y `exit` van de 0 a 1.
 * Entra desde atrás y de lado, se asienta y sigue girando apenas mientras una luz lo recorre.
 */
export const Chrome3D: React.FC<{
  text: string
  font: FontKey
  theme: ReelTheme
  y: number
  enter: number
  exit: number
  size?: number
  maxWidthPx?: number
}> = ({ text, font, theme, y, enter, exit, size = 1.25, maxWidthPx = 940 }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width, height } = useVideoConfig()
  const { accent } = usePalette()
  const t = frame / fps
  const offroad = theme === 'offroad'
  // Luz que cruza las letras de izquierda a derecha durante el gráfico (reflejo que corre por el cromo).
  const sweep = interpolate(frame, [0, durationInFrames], [-7, 7])
  const sceneY = (height / 2 - y) * UNITS_PER_PX
  const turn = (1 - enter) * -0.75 + 0.1 - t * 0.035

  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0, 14] }} gl={{ antialias: true }}>
      <StudioEnvironment />
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 4, 8]} intensity={2.4} />
      <directionalLight position={[-3, -1, 6]} intensity={0.8} />
      <pointLight position={[sweep, sceneY + 1.2, 3]} intensity={160} distance={12} color="#ffffff" />
      {/* Luz de acento desde abajo: tiñe los cantos con el color de la marca. */}
      <pointLight position={[0, sceneY - 2.4, 2.2]} intensity={40} distance={8} color={accent} />
      <group
        position={[0, sceneY, (1 - enter) * -5]}
        rotation={[0.05 + Math.sin(t * 0.9) * 0.025 + exit * 0.4, turn, 0]}
        scale={Math.max(0.001, (0.85 + 0.15 * enter) * (1 - exit * 0.4))}
      >
        <Text3D
          text={text.toUpperCase()}
          font={font}
          faceColor={offroad ? '#F4ECE0' : '#FFFFFF'}
          sideColor={offroad ? '#5A2508' : '#2A2A30'}
          metalness={0.78}
          roughness={0.2}
          size={size}
          depth={0.42}
          maxWidth={maxWidthPx * UNITS_PER_PX}
        />
      </group>
    </ThreeCanvas>
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
