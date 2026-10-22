/**
 * Brillo sobre el auto: una banda de luz cruza la pantalla en diagonal (como el reflejo que recorre la
 * carrocería en un comercial) y deja un destello breve en el centro. Es solo luz: no tapa nada.
 */
import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import type { ReelTheme, TimelineGraphic } from '../plan/types'
import { clamp, useEnterExit } from './anim'

/** Banda diagonal de luz (ancho en % de la pantalla) con su borde izquierdo en `x` (fracción del ancho). */
const band = (x: number, widthPct: number): React.CSSProperties => ({
  position: 'absolute',
  top: '-25%',
  height: '150%',
  left: `${x * 100}%`,
  width: `${widthPct}%`,
  transform: 'rotate(16deg)',
})

export const Brillo: React.FC<{ g: TimelineGraphic; theme: ReelTheme }> = ({ theme }) => {
  const { frame, durationInFrames, width, height } = useEnterExit(1)
  const t = frame / durationInFrames
  const x = interpolate(t, [0, 1], [-0.5, 1.2], { ...clamp, easing: Easing.inOut(Easing.quad) })
  const glint = interpolate(t, [0.35, 0.5, 0.7], [0, 1, 0], clamp)
  // Camionetas: luz un poco más cálida, como sol de tarde.
  const light = theme === 'offroad' ? '255, 225, 185' : '255, 255, 255'

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Dos capas: un halo ancho que realza (overlay) y un filo de luz angosto que se ve hasta en autos blancos (screen). */}
      <AbsoluteFill style={{ mixBlendMode: 'overlay' }}>
        <div style={{ ...band(x, 30), background: `linear-gradient(90deg, rgba(${light},0) 0%, rgba(${light},0.7) 50%, rgba(${light},0) 100%)`, filter: 'blur(14px)' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
        <div style={{ ...band(x + 0.1, 7), background: `linear-gradient(90deg, rgba(${light},0) 0%, rgba(${light},0.55) 50%, rgba(${light},0) 100%)`, filter: 'blur(5px)' }} />
      </AbsoluteFill>
      {/* Destello: estrella fina de 4 puntas donde la banda cruza el centro. */}
      <div
        style={{
          position: 'absolute',
          left: width * 0.52 - 160,
          top: height * 0.46 - 160,
          width: 320,
          height: 320,
          opacity: glint,
          transform: `scale(${0.6 + glint * 0.5}) rotate(${frame * 1.5}deg)`,
          mixBlendMode: 'screen',
          background: `radial-gradient(circle, rgba(${light},0.95) 0%, rgba(${light},0.35) 10%, rgba(${light},0) 32%),
            linear-gradient(90deg, rgba(${light},0) 0%, rgba(${light},0.8) 50%, rgba(${light},0) 100%) center / 100% 3px no-repeat,
            linear-gradient(0deg, rgba(${light},0) 0%, rgba(${light},0.8) 50%, rgba(${light},0) 100%) center / 3px 100% no-repeat`,
        }}
      />
    </AbsoluteFill>
  )
}
