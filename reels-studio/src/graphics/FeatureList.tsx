import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { COLORS, extrudedShadow, FONT_DISPLAY, FONT_UI } from '../theme'
import { delayedSpring, useEnterExit } from './anim'
import { Icon } from './Icons'

/** Lista de equipamiento o beneficios que se va marcando con check. */
export const FeatureList: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, durationInFrames, width, height, enter, exit } = useEnterExit()
  const items = g.items ?? []
  // Los elementos se reparten en ~la mitad del tiempo en pantalla, uno por uno.
  const stagger = Math.max(10, Math.min(24, Math.floor((durationInFrames * 0.5) / Math.max(1, items.length))))

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.72) 35%, rgba(0,0,0,0.72) 75%, rgba(0,0,0,0.2))', opacity: enter * (1 - exit) }} />
      <div
        style={{
          position: 'absolute',
          top: height * 0.22,
          left: 70,
          width: width - 140,
          perspective: 1300,
          opacity: 1 - exit,
          transform: `translateY(${exit * -80}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: g.text.length > 14 ? 100 : 128,
            lineHeight: 1,
            color: COLORS.white,
            textShadow: extrudedShadow(14, COLORS.redDeep, 120),
            transform: `rotateY(${interpolate(enter, [0, 1], [-20, -6])}deg) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
            opacity: enter,
            transformOrigin: '0% 50%',
            textTransform: 'uppercase',
          }}
        >
          {g.text}
        </div>
        <div style={{ height: 12, width: interpolate(enter, [0, 1], [0, 300]), background: COLORS.red, borderRadius: 6, margin: '26px 0 40px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {items.map((item, i) => {
            const s = delayedSpring(frame, fps, 10 + i * stagger)
            const tick = delayedSpring(frame, fps, 16 + i * stagger)
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                  transform: `rotateX(${interpolate(s, [0, 1], [-35, 0])}deg) translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                  transformOrigin: '50% 0%',
                  opacity: s,
                }}
              >
                <div
                  style={{
                    width: 92,
                    height: 92,
                    flexShrink: 0,
                    borderRadius: 24,
                    background: COLORS.red,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 8px 0 ${COLORS.redDeep}`,
                    transform: `scale(${interpolate(tick, [0, 1], [0.7, 1])})`,
                  }}
                >
                  <Icon name="check" size={64} strokeWidth={3.2} />
                </div>
                <div style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 60, color: COLORS.white, textTransform: 'uppercase', lineHeight: 1.05 }}>
                  {item}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
