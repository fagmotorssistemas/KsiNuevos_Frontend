/**
 * Escáner holográfico 3D sobre un objeto chico (un botón del volante, la palanca): anillos de luz naranja que giran
 * en ejes distintos como un giroscopio, un anillo punteado de frente y un halo suave (el brillo se suma a la imagen).
 */
import React, { useMemo } from 'react'
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import * as THREE from 'three'
import { usePalette } from '../reel/palette'
import { Stage3D, toScene, UNITS_PER_PX } from './Stage3D'

const DASHES = 18

/** `x`, `y`, `r` en píxeles del video; `progress` 0 → 1 es la entrada (los anillos llegan grandes y se cierran). */
export const ScanRing3D: React.FC<{ x: number; y: number; r: number; progress: number }> = ({ x, y, r, progress }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const { accent } = usePalette()
  const [sx, sy] = toScene(x, y, width, height)
  const radius = r * UNITS_PER_PX
  const t = frame / 30
  const open = interpolate(progress, [0, 1], [1.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const alpha = interpolate(progress, [0, 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const geo = useMemo(
    () => ({
      ring: new THREE.TorusGeometry(1, 0.022, 10, 96),
      glow: new THREE.TorusGeometry(1, 0.09, 10, 96),
      dash: new THREE.TorusGeometry(1.18, 0.018, 6, 8, ((Math.PI * 2) / DASHES) * 0.55),
      core: new THREE.SphereGeometry(0.06, 16, 16),
    }),
    []
  )
  const mat = useMemo(() => {
    const glow = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    return { accent: glow(accent, 1), halo: glow(accent, 0.22), white: glow('#ffffff', 0.9) }
  }, [accent])
  mat.accent.opacity = alpha
  mat.halo.opacity = 0.22 * alpha
  mat.white.opacity = 0.9 * alpha

  return (
    <Stage3D bare style={{ mixBlendMode: 'screen' }}>
      <group position={[sx, sy, 0]} scale={radius * open}>
        {/* Dos órbitas inclinadas que giran en sentidos contrarios: le dan volumen al escáner. */}
        <group rotation={[1.15, t * 1.4, 0]}>
          <mesh geometry={geo.ring} material={mat.accent} />
          <mesh geometry={geo.glow} material={mat.halo} />
        </group>
        <group rotation={[-0.5, -t * 1.1 + 1, 0.9]}>
          <mesh geometry={geo.ring} material={mat.accent} scale={0.86} />
          <mesh geometry={geo.glow} material={mat.halo} scale={0.86} />
        </group>
        {/* Anillo punteado de frente que gira despacio, y el anillo blanco fino que marca el objeto. */}
        <group rotation={[0, 0, -t * 0.8]}>
          {Array.from({ length: DASHES }, (_, k) => (
            <mesh key={k} geometry={geo.dash} material={mat.accent} rotation={[0, 0, (k / DASHES) * Math.PI * 2]} />
          ))}
        </group>
        <mesh geometry={geo.ring} material={mat.white} scale={1.04} />
        <mesh geometry={geo.core} material={mat.accent} />
      </group>
    </Stage3D>
  )
}
