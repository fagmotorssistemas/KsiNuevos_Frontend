/**
 * Escenario 3D común (three.js): lienzo del tamaño del video con la cámara fija de siempre (fov 35 a 14 de
 * distancia), reflejos de estudio y luces. A esa distancia 1 px del video equivale a UNITS_PER_PX unidades en el
 * plano z = 0, así los gráficos ubican las piezas 3D en píxeles igual que el resto de la pantalla.
 */
import { ThreeCanvas } from '@remotion/three'
import React from 'react'
import { useVideoConfig } from 'remotion'
import { usePalette } from '../reel/palette'
import { StudioEnvironment } from './Text3D'

/** Unidades de escena por píxel con la cámara de abajo (lienzo de 1920 de alto). */
export const UNITS_PER_PX = (2 * Math.tan((17.5 * Math.PI) / 180) * 14) / 1920

/** Píxeles del video (desde arriba a la izquierda) → coordenadas de escena en el plano z = 0. */
export function toScene(x: number, y: number, width: number, height: number): [number, number] {
  return [(x - width / 2) * UNITS_PER_PX, (height / 2 - y) * UNITS_PER_PX]
}

/**
 * `sweep`: posición en escena de la luz que recorre las piezas (el reflejo que corre por el metal).
 * `bare`: sin reflejos ni luces (para piezas que brillan solas, como el escáner holográfico).
 * `accentLight`: luz del color de la marca desde abajo (se apaga donde tiñe de más, como el caucho de la llanta).
 */
export const Stage3D: React.FC<{ children: React.ReactNode; sweep?: [number, number]; bare?: boolean; accentLight?: boolean; style?: React.CSSProperties }> = ({
  children,
  sweep,
  bare = false,
  accentLight = true,
  style,
}) => {
  const { width, height } = useVideoConfig()
  const { accent } = usePalette()
  return (
    <ThreeCanvas width={width} height={height} style={style} camera={{ fov: 35, position: [0, 0, 14] }} gl={{ antialias: true }}>
      {bare ? null : (
        <>
          <StudioEnvironment />
          <ambientLight intensity={0.85} />
          <directionalLight position={[2, 4, 8]} intensity={2.4} />
          <directionalLight position={[-3, -1, 6]} intensity={0.8} />
          {sweep ? <pointLight position={[sweep[0], sweep[1], 3]} intensity={160} distance={12} color="#ffffff" /> : null}
          {/* Luz de acento desde abajo: tiñe los cantos con el color de la marca. */}
          {accentLight ? <pointLight position={[0, (sweep?.[1] ?? 0) - 2.4, 2.2]} intensity={40} distance={8} color={accent} /> : null}
        </>
      )}
      {children}
    </ThreeCanvas>
  )
}
