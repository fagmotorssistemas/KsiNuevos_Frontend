import React from 'react'
import { AbsoluteFill, interpolate, spring } from 'remotion'
import type { TimelineGraphic } from '../plan/types'
import { usePalette } from '../reel/palette'
import { COLORS, FONT_UI } from '../theme'
import { clamp, splitEmphasis, useEnterExit } from './anim'
import { Icon } from './Icons'

/**
 * Sticker de interacción ("Comenta", "Guárdalo", "¿Lo prefieres en rojo?"): burbuja pequeña que
 * convive con los subtítulos, entra con rebote y late como un botón para invitar a tocar.
 */
export const Sticker: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, height, exit } = useEnterExit(8)
  const palette = usePalette()
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 200, mass: 0.7 } })
  const wiggle = frame > 12 ? Math.sin(frame / 2.6) * 2.2 * Math.max(0, 1 - (frame % 30) / 12) : 0
  const pulse = (frame % 24) / 24
  // Arriba: sobre la cabeza del asesor (debajo de la barra de progreso). Abajo: entre la cara y los subtítulos.
  const top = g.placement === 'abajo' ? height * 0.55 : height * 0.12

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: COLORS.white,
            borderRadius: 999,
            padding: '14px 40px 14px 14px',
            transform: `scale(${interpolate(pop, [0, 1], [0.3, 1]) * (1 - exit * 0.4)}) rotate(${-4 + wiggle}deg)`,
            opacity: interpolate(pop, [0, 0.25], [0, 1], clamp) * (1 - exit),
            boxShadow: `0 9px 0 ${palette.highlight}, 0 22px 40px rgba(0,0,0,0.45)`,
            maxWidth: 980,
          }}
        >
          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                border: `6px solid ${palette.accent}`,
                transform: `scale(${1 + pulse * 0.6})`,
                opacity: 0.7 * (1 - pulse),
              }}
            />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: palette.accent, display: 'grid', placeItems: 'center' }}>
              {g.icon ? <Icon name={g.icon} size={46} color={COLORS.white} strokeWidth={2.4} /> : null}
            </div>
          </div>
          <span style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: g.text.length > 22 ? 40 : 46, lineHeight: 1.05, color: COLORS.ink, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {splitEmphasis(g.text).map(({ word, strong }, i) => (
              <span key={i} style={{ color: strong ? palette.accent : COLORS.ink }}>
                {i > 0 ? ' ' : ''}
                {word}
              </span>
            ))}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
