import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { CaptionLine, Placement } from '../plan/types'
import { COLORS, FONT_UI } from '../theme'

const Y_BY_PLACEMENT: Record<Placement, number> = { arriba: 0.2, centro: 0.5, abajo: 0.72 }

/** Subtítulos tipo karaoke: 1–3 palabras, la que suena crece; cifras y beneficios van en bloque rojo. */
export const Captions: React.FC<{ lines: CaptionLine[] }> = ({ lines }) => {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const line = lines.find((l) => frame >= l.fromFrame && frame < l.toFrame)
  if (!line) return null

  const local = frame - line.fromFrame
  const pop = spring({ frame: local, fps, config: { damping: 13, stiffness: 260, mass: 0.6 } })
  const top = height * Y_BY_PLACEMENT[line.placement]

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top,
          left: 60,
          right: 60,
          transform: `translateY(-50%) scale(${interpolate(pop, [0, 1], [0.78, 1])}) perspective(900px) rotateX(${interpolate(pop, [0, 1], [35, 0])}deg)`,
          opacity: interpolate(pop, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }),
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px 38px',
        }}
      >
        {line.words.map((w, i) => {
          const active = frame >= w.fromFrame && frame < Math.max(w.toFrame, w.fromFrame + 4)
          const spoken = frame >= w.fromFrame
          const wordPop = spring({ frame: frame - w.fromFrame, fps, config: { damping: 11, stiffness: 300, mass: 0.5 } })
          const scale = active ? interpolate(wordPop, [0, 1], [1.0, 1.08]) : 1
          const text = w.text.replace(/[.,;:…]+$/, '').toUpperCase()
          if (w.emphasis) {
            return (
              <span
                key={i}
                style={{
                  fontFamily: FONT_UI,
                  fontWeight: 900,
                  fontSize: 84,
                  lineHeight: 1.05,
                  color: COLORS.white,
                  background: COLORS.red,
                  padding: '4px 18px 8px',
                  borderRadius: 14,
                  transform: `scale(${spoken ? scale : 0.9}) rotate(-2deg)`,
                  opacity: spoken ? 1 : 0.55,
                  boxShadow: `0 10px 0 ${COLORS.redDeep}, 0 18px 30px rgba(0,0,0,0.45)`,
                }}
              >
                {text}
              </span>
            )
          }
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_UI,
                fontWeight: 900,
                fontSize: 80,
                lineHeight: 1.05,
                color: active ? COLORS.yellow : COLORS.white,
                transform: `scale(${scale})`,
                WebkitTextStroke: '10px #000',
                paintOrder: 'stroke fill',
                textShadow: '0 8px 18px rgba(0,0,0,0.6)',
              }}
            >
              {text}
            </span>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
