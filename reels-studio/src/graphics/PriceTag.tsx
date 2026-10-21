import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { COLORS, extrudedShadow, FONT_DISPLAY, FONT_UI } from '../theme'
import { delayedSpring, useEnterExit } from './anim'

/** Etiqueta de precio que cae y se balancea; debajo, financiamiento u oferta. */
export const PriceTag: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, width, height, enter, exit } = useEnterExit()
  const t = frame / fps
  // Péndulo amortiguado, suave.
  const swing = Math.sin(t * 5) * 8 * Math.exp(-t * 2)
  const subIn = delayedSpring(frame, fps, 12)

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: interpolate(enter, [0, 1], [height * 0.16 - 220, height * 0.16]),
          opacity: enter * (1 - exit),
          left: width / 2 - 380,
          width: 760,
          transform: `rotate(${swing}deg) translateY(${exit * -120}px)`,
          transformOrigin: '50% -120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ width: 6, height: 120, background: 'rgba(255,255,255,0.85)', marginTop: -120 }} />
        <div
          style={{
            position: 'relative',
            width: '100%',
            padding: '70px 40px 54px',
            borderRadius: 40,
            background: `linear-gradient(160deg, ${COLORS.red}, ${COLORS.redDeep})`,
            boxShadow: `0 26px 0 #4a050a, 0 50px 80px rgba(0,0,0,0.6)`,
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'absolute', top: 22, left: '50%', width: 34, height: 34, marginLeft: -17, borderRadius: 17, background: COLORS.ink, border: '5px solid #fff' }} />
          <div style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 44, color: COLORS.yellow, letterSpacing: 6 }}>
            {(g.subtext ?? 'PRECIO').toUpperCase()}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: g.text.length > 9 ? 150 : 190, lineHeight: 1.05, color: COLORS.white, textShadow: extrudedShadow(14, '#4a050a', 120) }}>
            {g.text}
          </div>
        </div>
        {g.items?.length ? (
          <div style={{ display: 'flex', gap: 16, marginTop: 52, flexWrap: 'wrap', justifyContent: 'center' }}>
            {g.items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: COLORS.white,
                  color: COLORS.ink,
                  fontFamily: FONT_UI,
                  fontWeight: 900,
                  fontSize: 40,
                  padding: '12px 26px',
                  borderRadius: 999,
                  transform: `scale(${delayedSpring(frame, fps, 14 + i * 4)})`,
                  opacity: subIn,
                }}
              >
                {item.toUpperCase()}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}
