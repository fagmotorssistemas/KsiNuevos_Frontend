/**
 * Piezas 2D del diseño "camioneta" (tema offroad), calcado del formato de referencia de la Ranger: etiquetas tipo
 * escáner, franja de peligro, esquinas naranjas y huella de llanta. Los títulos de metal, la llanta y el escáner
 * holográfico son 3D (src/three).
 */
import React from 'react'
import { interpolate } from 'remotion'
import { FONT_DISPLAY, FONT_SPEED, FONT_UI, PALETTES } from '../../theme'

export const OFFROAD = {
  ...PALETTES.offroad,
  panel: 'rgba(16, 13, 10, 0.84)',
}
export const FONT_CAPTION = FONT_DISPLAY
export const FONT_TAG = FONT_SPEED
export const FONT_LABEL = FONT_UI

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Esquinas en L fuera de una caja (look de escáner). */
const Corners: React.FC<{ size: number; inset: number; color: string; stroke: number }> = ({ size, inset, color, stroke }) => (
  <>
    {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
      <span
        key={c}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          [c[0] === 't' ? 'top' : 'bottom']: -inset,
          [c[1] === 'l' ? 'left' : 'right']: -inset,
          borderTop: c[0] === 't' ? `${stroke}px solid ${color}` : undefined,
          borderBottom: c[0] === 'b' ? `${stroke}px solid ${color}` : undefined,
          borderLeft: c[1] === 'l' ? `${stroke}px solid ${color}` : undefined,
          borderRight: c[1] === 'r' ? `${stroke}px solid ${color}` : undefined,
        }}
      />
    ))}
  </>
)

/** Franja de peligro naranja y negra (cinta de obra), como debajo de "TRABAJO EXIGENTE" en la referencia. */
export const Hazard: React.FC<{ progress: number; height: number }> = ({ progress, height }) => (
  <div
    style={{
      marginTop: 10,
      height,
      borderRadius: 4,
      background: `repeating-linear-gradient(-45deg, ${OFFROAD.accent} 0 ${height * 0.7}px, #111 ${height * 0.7}px ${height * 1.4}px)`,
      clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
      border: '2px solid rgba(0,0,0,0.6)',
    }}
  />
)

/** Etiqueta tipo escáner: caja oscura con borde naranja que se despliega de izquierda a derecha y se queda quieta. */
export const Tag: React.FC<{ text: string; label?: string; progress: number; size?: number; hazard?: boolean; style?: React.CSSProperties }> = ({
  text,
  label,
  progress,
  size = 44,
  hazard = false,
  style,
}) => {
  const reveal = interpolate(progress, [0, 1], [0, 100], clamp)
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      {label ? (
        <div
          style={{
            fontFamily: FONT_LABEL,
            fontWeight: 900,
            fontSize: Math.round(size * 0.4),
            letterSpacing: 4,
            color: OFFROAD.accent,
            marginBottom: 8,
            opacity: interpolate(progress, [0.4, 1], [0, 1], clamp),
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          background: OFFROAD.panel,
          border: `3px solid ${OFFROAD.accent}`,
          borderRadius: 6,
          padding: `${Math.round(size * 0.24)}px ${Math.round(size * 0.5)}px`,
          clipPath: `inset(-30px ${100 - reveal}% -30px -30px)`,
          boxShadow: '0 10px 26px rgba(0,0,0,0.5)',
        }}
      >
        <Corners size={Math.round(size * 0.45)} inset={Math.round(size * 0.22)} color={OFFROAD.accent} stroke={4} />
        <span
          style={{
            fontFamily: FONT_TAG,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: 1.5,
            color: '#fff',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </span>
      </div>
      {hazard ? <Hazard progress={interpolate(progress, [0.3, 1], [0, 1], clamp)} height={Math.round(size * 0.32)} /> : null}
    </div>
  )
}

/** Esquinas naranjas que enmarcan lo que se señala (pantalla, volante, palanca). */
export const CornerFrame: React.FC<{ x: number; y: number; w: number; h: number; progress: number }> = ({ x, y, w, h, progress }) => {
  const grow = interpolate(progress, [0, 1], [1.12, 1], clamp)
  const arm = Math.min(w, h) * 0.26
  const half = { w: (w / 2) * grow, h: (h / 2) * grow }
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
  return (
    <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: interpolate(progress, [0, 0.4], [0, 1], clamp) }} width="100%" height="100%">
      {corners.map(([sx, sy], i) => {
        const cx = x + sx * half.w
        const cy = y + sy * half.h
        return (
          <path
            key={i}
            d={`M ${cx - sx * arm} ${cy} L ${cx} ${cy} L ${cx} ${cy - sy * arm}`}
            fill="none"
            stroke={OFFROAD.accent}
            strokeWidth={8}
            strokeLinecap="square"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.6))' }}
          />
        )
      })}
    </svg>
  )
}

/** Fondo del cierre: dos huellas de llanta (chevrones) sobre negro, avanzando hacia abajo. */
export const TreadBackground: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  const step = 120
  const offset = (frame * 4) % step
  const rows = Math.ceil(height / step) + 2
  const track = (cx: number) =>
    Array.from({ length: rows }, (_, i) => {
      const y = i * step - step + offset
      return <path key={`${cx}-${i}`} d={`M ${cx - 130} ${y} L ${cx} ${y + 70} L ${cx + 130} ${y}`} fill="none" stroke="#2C2C2C" strokeWidth={40} strokeLinejoin="miter" />
    })
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, background: '#121212' }}>
      {track(width * 0.27)}
      {track(width * 0.73)}
      <rect width={width} height={height} fill="url(#vig)" />
      <defs>
        <radialGradient id="vig" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
        </radialGradient>
      </defs>
    </svg>
  )
}
