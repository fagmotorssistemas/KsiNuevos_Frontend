/**
 * Piezas del diseño "camioneta" (tema offroad), calcado del formato de referencia de la Ranger:
 * títulos naranjas rústicos con volumen, etiquetas tipo escáner, esquinas naranjas, barro y huella
 * de llanta. Todo en CSS/SVG (sin WebGL) para que renderice igual en cualquier máquina.
 */
import React from 'react'
import { interpolate, random } from 'remotion'
import { extrudedShadow, FONT_DISPLAY, FONT_SPEED, FONT_UI, PALETTES } from '../../theme'

export const OFFROAD = {
  ...PALETTES.offroad,
  rust: '#5A2508',
  shadow: '#2E1405',
  panel: 'rgba(16, 13, 10, 0.84)',
  mud: '#4A2E17',
  mudLight: '#7A5230',
  mudDark: '#2B1A0C',
}
export const FONT_RUSTY = FONT_SPEED
export const FONT_CAPTION = FONT_DISPLAY
export const FONT_TAG = FONT_SPEED
export const FONT_LABEL = FONT_UI

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Manchas y rayones de óxido (ruido SVG): solo deja ver los puntos más fuertes. */
const GRUNGE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='7'/>" +
    "<feColorMatrix values='0 0 0 0 0.22  0 0 0 0 0.09  0 0 0 0 0.02  0 0 0 2.4 -1.3'/></filter>" +
    "<filter id='r'><feTurbulence type='fractalNoise' baseFrequency='0.015 0.5' numOctaves='2' seed='3'/>" +
    "<feColorMatrix values='0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.6  0 0 0 2 -1.45'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/><rect width='100%' height='100%' filter='url(#r)'/></svg>"
)}")`
const RUST_GRADIENT = 'linear-gradient(180deg, #FFD592 0%, #FFA23A 34%, #F06F12 66%, #A9420A 100%)'

/** Título naranja rústico con volumen: capa de extrusión café debajo y cara con degradado y desgaste. */
export const RustyText: React.FC<{ text: string; size: number; style?: React.CSSProperties }> = ({ text, size, style }) => {
  const common: React.CSSProperties = {
    fontFamily: FONT_RUSTY,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: size * 0.015,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }
  return (
    <span style={{ position: 'relative', display: 'inline-block', ...style }}>
      <span style={{ ...common, color: OFFROAD.shadow, textShadow: extrudedShadow(Math.round(size / 13), OFFROAD.shadow, 125) }}>
        {text}
      </span>
      <span
        aria-hidden
        style={{
          ...common,
          position: 'absolute',
          left: 0,
          top: 0,
          color: 'transparent',
          backgroundImage: `${GRUNGE}, ${RUST_GRADIENT}`,
          backgroundSize: '220px 220px, 100% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextStroke: `${Math.max(2, size / 40)}px ${OFFROAD.rust}`,
        }}
      >
        {text}
      </span>
    </span>
  )
}

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

/** Etiqueta tipo escáner: caja oscura con borde naranja que se despliega de izquierda a derecha. */
export const Tag: React.FC<{ text: string; label?: string; progress: number; size?: number; style?: React.CSSProperties }> = ({
  text,
  label,
  progress,
  size = 44,
  style,
}) => {
  const reveal = interpolate(progress, [0, 1], [0, 100], clamp)
  const scan = interpolate(progress, [0.2, 1], [0, 100], clamp)
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
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
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
        {/* Línea de escaneo que barre la etiqueta al aparecer */}
        {scan < 100 ? (
          <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${scan}%`, width: 6, background: OFFROAD.highlight, boxShadow: `0 0 16px ${OFFROAD.accent}` }} />
        ) : null}
      </div>
    </div>
  )
}

/** Esquinas naranjas que enmarcan lo que se señala (pantalla, volante, palanca). */
export const CornerFrame: React.FC<{ x: number; y: number; w: number; h: number; progress: number }> = ({ x, y, w, h, progress }) => {
  const grow = interpolate(progress, [0, 1], [1.35, 1], clamp)
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

/** Mancha de barro irregular con gotas alrededor; `seed` la hace distinta pero estable entre renders. */
const Splat: React.FC<{ seed: string; r: number }> = ({ seed, r }) => {
  const points = 18
  const path = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2
    const spike = random(`${seed}-s${i}`) > 0.72 ? 1.25 + random(`${seed}-k${i}`) * 0.5 : 0.72 + random(`${seed}-r${i}`) * 0.3
    return `${(Math.cos(a) * r * spike).toFixed(1)},${(Math.sin(a) * r * spike).toFixed(1)}`
  })
  const drops = Array.from({ length: 7 }, (_, i) => {
    const a = random(`${seed}-da${i}`) * Math.PI * 2
    const d = r * (1.35 + random(`${seed}-dd${i}`) * 0.8)
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: r * (0.06 + random(`${seed}-dr${i}`) * 0.12) }
  })
  return (
    <g>
      <polygon points={path.join(' ')} fill={OFFROAD.mud} stroke={OFFROAD.mudDark} strokeWidth={r * 0.06} strokeLinejoin="round" />
      <ellipse cx={-r * 0.2} cy={-r * 0.25} rx={r * 0.35} ry={r * 0.22} fill={OFFROAD.mudLight} opacity={0.7} />
      {drops.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={OFFROAD.mud} />
      ))}
    </g>
  )
}

const SPLATS = [
  { x: 0.86, y: 0.12, r: 70, at: 2 },
  { x: 0.1, y: 0.5, r: 58, at: 7 },
  { x: 0.93, y: 0.66, r: 44, at: 11 },
  { x: 0.14, y: 0.86, r: 76, at: 15 },
]

/** Barro que salpica la pantalla en el gancho (entra de golpe y se desvanece al final). */
export const MudSplatter: React.FC<{ frame: number; width: number; height: number; fade: number }> = ({ frame, width, height, fade }) => (
  <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: 1 - fade }}>
    {SPLATS.map((s, i) => {
      const t = frame - s.at
      if (t < 0) return null
      const scale = interpolate(t, [0, 2, 4], [0.2, 1.12, 1], clamp)
      return (
        <g key={i} transform={`translate(${s.x * width} ${s.y * height}) scale(${scale}) rotate(${random(`rot${i}`) * 360})`}>
          <Splat seed={`mud${i}`} r={s.r * 2} />
        </g>
      )
    })}
  </svg>
)

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
