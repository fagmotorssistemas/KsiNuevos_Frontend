import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { COLORS, FONT_UI } from '../theme'
import { delayedSpring, useEnterExit } from './anim'
import { Icon } from './Icons'

/** Datos rápidos en fichas que entran una tras otra: "2.8 DIÉSEL · AUTOMÁTICO · 4x4". */
export const SpecChips: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, height, exit } = useEnterExit(7)
  const items = g.items ?? []
  const top = g.placement === 'abajo' ? height * 0.6 : g.placement === 'centro' ? height * 0.4 : height * 0.13

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top, left: 56, display: 'flex', flexDirection: 'column', gap: 22, perspective: 1000 }}>
        {g.text ? (
          <div style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 40, color: COLORS.yellow, letterSpacing: 3, textShadow: '0 4px 12px rgba(0,0,0,0.8)', opacity: 1 - exit }}>
            {g.text.toUpperCase()}
          </div>
        ) : null}
        {items.map((item, i) => {
          const s = delayedSpring(frame, fps, i * 5, 12, 200)
          const out = interpolate(exit, [0, 1], [0, 1])
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                alignSelf: 'flex-start',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: `0 10px 0 rgba(0,0,0,0.35), 0 18px 30px rgba(0,0,0,0.35)`,
                transform: `translateX(${interpolate(s, [0, 1], [-700, 0]) - out * 900}px) rotateY(${interpolate(s, [0, 1], [-60, -8])}deg)`,
                transformOrigin: '0% 50%',
              }}
            >
              <div style={{ background: COLORS.red, padding: '0 22px', display: 'flex', alignItems: 'center' }}>
                <Icon name={g.icon ?? 'check'} size={52} strokeWidth={2.6} />
              </div>
              <div
                style={{
                  background: COLORS.white,
                  color: COLORS.ink,
                  fontFamily: FONT_UI,
                  fontWeight: 900,
                  fontSize: 58,
                  padding: '14px 32px 16px 26px',
                  textTransform: 'uppercase',
                }}
              >
                {item}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
