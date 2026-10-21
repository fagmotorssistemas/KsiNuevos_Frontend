import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { COLORS, extrudedShadow, FONT_DISPLAY, FONT_UI, formatSpecNumber } from '../theme'
import { clamp, delayedSpring, useEnterExit } from './anim'
import { Icon } from './Icons'

/** Dato numérico grande que cuenta hacia arriba: "128.000 KM", "2.8 L", "200 HP". */
export const SpecCounter: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, width, height, enter, exit } = useEnterExit(8)
  const value = g.value ?? 0
  const decimals = Number.isInteger(value) ? 0 : 1
  const count = interpolate(frame, [2, Math.round(fps * 0.9)], [0, value], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  })
  const number = `${g.prefix ?? ''}${formatSpecNumber(count, decimals)}`
  const finalLen = `${g.prefix ?? ''}${formatSpecNumber(value, decimals)}`.length
  const fontSize = Math.min(330, 1500 / Math.max(3, finalLen))
  const labelIn = delayedSpring(frame, fps, 3)
  const unitIn = delayedSpring(frame, fps, Math.round(fps * 0.75), 10, 220)
  const subIn = delayedSpring(frame, fps, Math.round(fps * 0.9))
  const landed = frame >= Math.round(fps * 0.9)
  const thump = landed ? interpolate(frame - Math.round(fps * 0.9), [0, 4, 10], [1, 1.08, 1], clamp) : 1
  const visible = enter * (1 - exit)

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 120% 50% at 50% 45%, rgba(0,0,0,0.78), rgba(0,0,0,0.15) 80%)', opacity: visible }} />
      {/* Líneas de velocidad girando detrás del número */}
      <AbsoluteFill
        style={{
          opacity: visible * 0.22,
          background: `repeating-conic-gradient(from ${frame * 1.5}deg at 50% 45%, rgba(255,255,255,0.9) 0deg 2deg, transparent 2deg 14deg)`,
          maskImage: 'radial-gradient(circle at 50% 45%, transparent 18%, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 45%, transparent 18%, black 30%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: height * 0.24,
          width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 1 - exit,
          perspective: 1400,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '14px 34px',
            borderRadius: 999,
            background: COLORS.red,
            boxShadow: `0 10px 0 ${COLORS.redDeep}`,
            transform: `translateY(${interpolate(labelIn, [0, 1], [-50, 0])}px) scale(${labelIn})`,
          }}
        >
          {g.icon ? <Icon name={g.icon} size={58} strokeWidth={2.2} /> : null}
          <span style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 50, color: COLORS.white, letterSpacing: 4 }}>
            {g.text.toUpperCase()}
          </span>
        </div>
        <div
          style={{
            marginTop: 30,
            display: 'flex',
            alignItems: 'baseline',
            gap: 22,
            transform: `rotateX(${interpolate(enter, [0, 1], [70, 12])}deg) rotateY(${interpolate(enter, [0, 1], [-30, -10])}deg) scale(${interpolate(enter, [0, 1], [0.5, 1]) * thump})`,
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize,
              lineHeight: 1,
              color: COLORS.white,
              textShadow: extrudedShadow(22, COLORS.redDeep, 120),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {number}
          </span>
          {g.unit ? (
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: fontSize * 0.42,
                color: COLORS.red,
                textShadow: extrudedShadow(10, '#fff', 120),
                transform: `scale(${unitIn}) rotate(${interpolate(unitIn, [0, 1], [-30, 0])}deg)`,
                display: 'inline-block',
              }}
            >
              {g.unit.toUpperCase()}
            </span>
          ) : null}
        </div>
        {g.subtext ? (
          <div
            style={{
              marginTop: 46,
              fontFamily: FONT_UI,
              fontWeight: 800,
              fontSize: 48,
              color: COLORS.white,
              textShadow: '0 6px 18px rgba(0,0,0,0.8)',
              opacity: subIn,
              transform: `translateY(${interpolate(subIn, [0, 1], [30, 0])}px)`,
              textAlign: 'center',
              padding: '0 80px',
            }}
          >
            {g.subtext}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
