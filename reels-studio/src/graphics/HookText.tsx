import React from 'react'
import { AbsoluteFill, interpolate, random } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { COLORS, extrudedShadow, FONT_DISPLAY, FONT_UI } from '../theme'
import { clamp, delayedSpring, splitEmphasis, useEnterExit } from './anim'

/** Gancho de los primeros segundos: palabras que golpean una a una; las *marcadas* van en rojo. */
export const HookText: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, width, height, enter, exit } = useEnterExit(7)
  const words = splitEmphasis(g.text)
  const step = Math.max(2, Math.min(5, Math.floor((fps * 0.9) / Math.max(1, words.length))))
  const lastHit = Math.min(frame, (words.length - 1) * step)
  const sinceHit = frame - Math.floor(lastHit / step) * step
  // Sacudida corta cada vez que entra una palabra.
  const shake = sinceHit < 5 && frame < words.length * step + 4 ? (5 - sinceHit) * 2.4 : 0
  const sx = (random(`x${Math.floor(frame)}`) - 0.5) * shake
  const sy = (random(`y${Math.floor(frame)}`) - 0.5) * shake
  const fontSize = g.text.length > 34 ? 118 : g.text.length > 22 ? 138 : 160

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 70%)', opacity: enter * (1 - exit) }} />
      <div
        style={{
          position: 'absolute',
          top: height * 0.17,
          left: 60,
          width: width - 120,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 26px',
          justifyContent: 'center',
          transform: `translate(${sx}px, ${sy}px) translateY(${exit * -120}px)`,
          opacity: 1 - exit,
          perspective: 1000,
        }}
      >
        {words.map((w, i) => {
          const s = delayedSpring(frame, fps, i * step, 10, 260)
          const shown = frame >= i * step
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: FONT_DISPLAY,
                fontSize,
                lineHeight: 1.08,
                textTransform: 'uppercase',
                color: COLORS.white,
                padding: w.strong ? '0 22px' : 0,
                background: w.strong ? COLORS.red : 'transparent',
                borderRadius: w.strong ? 18 : 0,
                boxShadow: w.strong ? `0 14px 0 ${COLORS.redDeep}` : 'none',
                textShadow: w.strong ? 'none' : extrudedShadow(12, 'rgba(0,0,0,0.9)', 120),
                transform: `scale(${interpolate(s, [0, 1], [2.2, 1])}) rotateX(${interpolate(s, [0, 1], [-60, 0])}deg) rotate(${w.strong ? -3 : 0}deg)`,
                opacity: shown ? interpolate(s, [0, 0.25], [0, 1], clamp) : 0,
              }}
            >
              {w.word}
            </span>
          )
        })}
      </div>
      {g.subtext ? (
        <div
          style={{
            position: 'absolute',
            top: height * 0.47,
            width,
            textAlign: 'center',
            fontFamily: FONT_UI,
            fontWeight: 800,
            fontSize: 46,
            color: COLORS.yellow,
            textShadow: '0 4px 14px rgba(0,0,0,0.85)',
            opacity: delayedSpring(frame, fps, words.length * step + 2) * (1 - exit),
          }}
        >
          {g.subtext}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
