import { ThreeCanvas } from '@remotion/three'
import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { StudioEnvironment, Text3D } from '../three/Text3D'
import { COLORS, FONT_UI } from '../theme'
import { clamp, delayedSpring, useEnterExit } from './anim'

/** Presentación del vehículo: modelo en 3D metálico, marca arriba y año en bloque rojo. */
export const Title3D: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, durationInFrames, width, height, enter, exit } = useEnterExit(16)
  const brandIn = delayedSpring(frame, fps, 4)
  const badgeIn = delayedSpring(frame, fps, 14)
  const t = frame / fps
  const sweepX = interpolate(frame, [0, durationInFrames], [-7, 7])
  const visible = enter * (1 - exit)

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 130% 42% at 50% 40%, rgba(0,0,0,0.7), rgba(0,0,0,0) 72%)',
          opacity: visible,
        }}
      />
      {/* Destello rojo detrás del modelo */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.385,
          left: 0,
          width,
          height: 16,
          background: `linear-gradient(90deg, transparent, ${COLORS.red}, transparent)`,
          transform: `scaleX(${interpolate(frame, [0, 12], [0, 1.4], clamp)})`,
          filter: 'blur(6px)',
          opacity: visible * 0.9,
        }}
      />
      {g.subtext ? (
        <div
          style={{
            position: 'absolute',
            top: height * 0.255,
            width: '100%',
            textAlign: 'center',
            fontFamily: FONT_UI,
            fontWeight: 900,
            fontSize: 64,
            letterSpacing: interpolate(brandIn, [0, 1], [40, 16]),
            color: COLORS.white,
            textShadow: '0 6px 20px rgba(0,0,0,0.7)',
            opacity: brandIn * (1 - exit),
            transform: `translateY(${interpolate(brandIn, [0, 1], [-60, 0])}px)`,
          }}
        >
          {g.subtext.toUpperCase()}
        </div>
      ) : null}
      <ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0, 14] }} gl={{ antialias: true }}>
        <StudioEnvironment />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 7]} intensity={2.4} />
        <pointLight position={[sweepX, 1.6, 3.2]} intensity={70} distance={14} />
        <group
          position={[0, 0.9, 0]}
          rotation={[0.06 + Math.cos(t * 1.1) * 0.02 + exit * 0.5, (1 - enter) * -0.9 + Math.sin(t * 1.2) * 0.06, 0]}
          scale={Math.max(0.001, (0.75 + 0.25 * enter) * (1 - exit * 0.6))}
        >
          <Text3D
            text={g.text.toUpperCase()}
            faceColor="#f5f5f5"
            sideColor={COLORS.red}
            size={1.3}
            depth={0.5}
            maxWidth={4.6}
            position={[0, 0, (1 - enter) * -3]}
          />
          {g.badge ? (
            <group position={[0, -1.25, 0.3]} rotation={[(1 - badgeIn) * -0.8, 0, 0]} scale={Math.max(0.001, badgeIn)}>
              <mesh position={[0, 0, -0.12]}>
                <boxGeometry args={[Math.max(1.6, g.badge.length * 0.42), 0.85, 0.28]} />
                <meshStandardMaterial color={COLORS.red} metalness={0.45} roughness={0.3} />
              </mesh>
              <Text3D text={g.badge.toUpperCase()} faceColor="#ffffff" sideColor="#d9d9d9" size={0.52} depth={0.12} maxWidth={2.6} position={[0, 0, 0.1]} />
            </group>
          ) : null}
        </group>
      </ThreeCanvas>
    </AbsoluteFill>
  )
}
