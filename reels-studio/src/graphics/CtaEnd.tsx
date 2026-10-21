import { ThreeCanvas } from '@remotion/three'
import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile } from 'remotion'
import type { Brand, TimelineGraphic } from '../plan/types'
import { StudioEnvironment, Text3D } from '../three/Text3D'
import { COLORS, FONT_UI } from '../theme'
import { clamp, delayedSpring, useEnterExit } from './anim'

/** Cierre: "COMENTA <PALABRA>" en 3D, promesa de respuesta y logo de K-Si. */
export const CtaEnd: React.FC<{ g: TimelineGraphic; brand: Brand }> = ({ g, brand }) => {
  const { frame, fps, width, height, enter } = useEnterExit(1)
  const t = frame / fps
  const labelIn = delayedSpring(frame, fps, 2)
  const subIn = delayedSpring(frame, fps, 12)
  const logoIn = delayedSpring(frame, fps, 18)
  const bounce = Math.abs(Math.sin(t * Math.PI * 2.2)) * 26
  const keyword = g.text.replace(/^comenta\s+/i, '').replace(/["“”']/g, '')

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backdropFilter: `blur(${interpolate(enter, [0, 1], [0, 14])}px)`,
          background: `radial-gradient(ellipse 120% 70% at 50% 42%, rgba(20,0,2,${0.55 * enter}), rgba(0,0,0,${0.85 * enter}))`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: height * 0.24,
          width,
          textAlign: 'center',
          fontFamily: FONT_UI,
          fontWeight: 900,
          fontSize: 86,
          letterSpacing: 12,
          color: COLORS.white,
          transform: `scale(${interpolate(labelIn, [0, 1], [1.8, 1])})`,
          opacity: interpolate(labelIn, [0, 0.3], [0, 1], clamp),
        }}
      >
        COMENTA
      </div>
      <ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0, 14] }} gl={{ antialias: true }}>
        <StudioEnvironment />
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 5, 7]} intensity={2.4} />
        <pointLight position={[Math.sin(t * 2) * 5, 1, 3]} intensity={60} distance={14} />
        <group
          position={[0, 1.15, 0]}
          rotation={[0.08, (1 - enter) * 1.6 + Math.sin(t * 1.8) * 0.12, Math.sin(t * 1.1) * 0.03]}
          scale={Math.max(0.001, 0.4 + 0.6 * enter)}
        >
          <Text3D text={keyword.toUpperCase()} faceColor={COLORS.red} sideColor="#ffffff" size={1.25} depth={0.5} maxWidth={4.5} metalness={0.35} roughness={0.3} />
        </group>
      </ThreeCanvas>
      {g.subtext ? (
        <div
          style={{
            position: 'absolute',
            top: height * 0.5,
            left: 80,
            right: 80,
            textAlign: 'center',
            fontFamily: FONT_UI,
            fontWeight: 800,
            fontSize: 50,
            lineHeight: 1.2,
            color: COLORS.white,
            opacity: subIn,
            transform: `translateY(${interpolate(subIn, [0, 1], [40, 0])}px)`,
          }}
        >
          {g.subtext}
        </div>
      ) : null}
      {/* Flecha hacia los comentarios */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.6 + bounce,
          width,
          display: 'flex',
          justifyContent: 'center',
          opacity: subIn,
        }}
      >
        <svg width={120} height={120} viewBox="0 0 24 24" fill="none" stroke={COLORS.yellow} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8l6 6 6-6M6 13l6 6 6-6" />
        </svg>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.12,
          width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          opacity: logoIn,
          transform: `translateY(${interpolate(logoIn, [0, 1], [60, 0])}px)`,
        }}
      >
        <div style={{ background: COLORS.white, borderRadius: 28, padding: '26px 44px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <Img src={staticFile(brand.logoSrc)} style={{ width: 520, display: 'block' }} />
        </div>
        {brand.whatsapp ? (
          <div style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 44, color: COLORS.white, background: '#1FAF52', padding: '12px 32px', borderRadius: 999 }}>
            WhatsApp {brand.whatsapp}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
