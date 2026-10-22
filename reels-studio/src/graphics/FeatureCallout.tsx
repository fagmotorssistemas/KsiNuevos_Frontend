import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { zoomProgress, zoomTransform } from '../reel/zoom'
import { COLORS, FONT_UI } from '../theme'
import { clamp, delayedSpring, useEnterExit } from './anim'
import { Icon } from './Icons'

/**
 * Característica señalada ("mandos en el volante"): el clip hace zoom al objeto (ClipLayer),
 * aquí se dibuja el anillo de enfoque sobre él, la línea y la tarjeta 3D con ícono.
 */
export const FeatureCallout: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, durationInFrames, width, height, enter, exit } = useEnterExit()
  const z = g.zoom ? zoomTransform(g.zoom, zoomProgress(frame, durationInFrames, fps), frame / durationInFrames) : null
  const ringIn = delayedSpring(frame, fps, 10)
  const lineIn = interpolate(frame, [12, 30], [0, 1], clamp)
  const subIn = delayedSpring(frame, fps, 14)
  const visible = 1 - exit

  const cardTop = g.cardAtTop ? height * 0.1 : height * 0.64
  const cardHeight = 250
  const anchor = { x: width / 2, y: g.cardAtTop ? cardTop + cardHeight : cardTop }
  const ringR = z ? Math.min(250, Math.max(80, z.radius * 1.15)) : 0
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 1.6) * 0.03

  let line: { x1: number; y1: number; x2: number; y2: number; len: number } | null = null
  if (z) {
    const dx = z.point.x - anchor.x
    const dy = z.point.y - anchor.y
    const dist = Math.hypot(dx, dy)
    if (dist > ringR + 40) {
      // La línea termina en el borde del anillo, no en su centro.
      const end = { x: z.point.x - (dx / dist) * ringR, y: z.point.y - (dy / dist) * ringR }
      line = { x1: anchor.x, y1: anchor.y, x2: end.x, y2: end.y, len: dist - ringR }
    }
  }

  return (
    <AbsoluteFill style={{ opacity: visible }}>
      {z ? (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
          {line ? (
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={COLORS.white}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={line.len}
              strokeDashoffset={line.len * (1 - lineIn)}
              style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.6))' }}
            />
          ) : null}
          <g transform={`translate(${z.point.x} ${z.point.y}) scale(${ringIn * pulse})`}>
            <circle r={ringR} fill="none" stroke={COLORS.white} strokeWidth={7} />
            <circle r={ringR + 16} fill="none" stroke={COLORS.red} strokeWidth={5} strokeDasharray="28 18" transform={`rotate(${frame * 3})`} />
            {/* Marcas de mira tipo "objetivo fijado" */}
            {[0, 90, 180, 270].map((a) => (
              <path
                key={a}
                d={`M ${ringR + 30} 0 L ${ringR + 64} 0`}
                stroke={COLORS.yellow}
                strokeWidth={9}
                strokeLinecap="round"
                transform={`rotate(${a})`}
              />
            ))}
          </g>
        </svg>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: cardTop,
          left: 64,
          right: 64,
          height: cardHeight,
          perspective: 1200,
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 34,
            padding: '0 40px',
            borderRadius: 36,
            background: COLORS.glass,
            border: '3px solid rgba(255,255,255,0.18)',
            boxShadow: `0 24px 0 ${COLORS.redDeep}, 0 40px 60px rgba(0,0,0,0.55)`,
            transform: `rotateX(${interpolate(enter, [0, 1], [g.cardAtTop ? 55 : -55, 6])}deg) rotateY(${interpolate(enter, [0, 1], [-18, -8])}deg)`,
            opacity: interpolate(enter, [0, 0.5], [0, 1], clamp),
            transformOrigin: g.cardAtTop ? '50% 0%' : '50% 100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 170,
              height: 170,
              borderRadius: 40,
              background: `linear-gradient(145deg, ${COLORS.red}, ${COLORS.redDeep})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.35), 0 12px 24px rgba(0,0,0,0.4)',
              transform: `rotate(${interpolate(enter, [0, 1], [-10, 0])}deg) scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
            }}
          >
            {g.icon ? <Icon name={g.icon} size={112} strokeWidth={1.9} /> : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT_UI,
                fontWeight: 900,
                fontSize: g.text.length > 18 ? 54 : 66,
                lineHeight: 1.02,
                color: COLORS.white,
                textTransform: 'uppercase',
              }}
            >
              {g.text}
            </div>
            {g.subtext ? (
              <div
                style={{
                  fontFamily: FONT_UI,
                  fontWeight: 800,
                  fontSize: 36,
                  color: COLORS.yellow,
                  opacity: subIn,
                  transform: `translateX(${interpolate(subIn, [0, 1], [40, 0])}px)`,
                }}
              >
                {g.subtext}
              </div>
            ) : null}
          </div>
          {/* Brillo que cruza la tarjeta */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 160,
              left: interpolate(frame, [12, 48], [-200, width], clamp),
              background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.28), transparent)',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  )
}
