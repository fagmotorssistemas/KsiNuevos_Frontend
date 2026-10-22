/**
 * Lenguaje "modo cine" (estética de comercial de autos): franjas negras, grano de película, tipografía
 * condensada grande con textos pequeños muy espaciados, líneas finas de acento y entradas de enfoque
 * (de borroso a nítido). Nada de rebotes, cajas de color ni iconitos.
 */
import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ReelTheme } from '../../plan/types'
import { FONT_CONDENSED, FONT_DISPLAY, FONT_UI } from '../../theme'

/** Alto de cada franja negra (arriba y abajo), como fracción del alto del cuadro. */
export const LETTERBOX = 0.075
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Tipografía por diseño: general con letra alta y elegante; camionetas con letra más gruesa. */
export const CINE_TYPE: Record<ReelTheme, { display: string; displayScale: number; label: string }> = {
  ksi: { display: FONT_CONDENSED, displayScale: 1, label: FONT_UI },
  offroad: { display: FONT_DISPLAY, displayScale: 0.86, label: FONT_UI },
}

/** 0 → 1 en `dur` cuadros, frenando al final (sin pasarse). */
export function ease(frame: number, delay: number, dur = 14): number {
  return interpolate(frame - delay, [0, dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
}

/** Entrada de cine: de borroso a nítido, con un leve acercamiento. */
export function focusIn(t: number, opts: { blur?: number; scale?: number; rise?: number } = {}): React.CSSProperties {
  const { blur = 12, scale = 1.05, rise = 0 } = opts
  return {
    opacity: t,
    filter: t < 1 ? `blur(${((1 - t) * blur).toFixed(2)}px)` : undefined,
    transform: `translateY(${(1 - t) * rise}px) scale(${1 + (scale - 1) * (1 - t)})`,
  }
}

/** Línea fina de acento que se dibuja de un lado al otro. */
export const AccentLine: React.FC<{ t: number; width: number; color: string; thickness?: number; align?: 'left' | 'center' | 'right' }> = ({
  t,
  width,
  color,
  thickness = 5,
  align = 'left',
}) => (
  <div
    style={{
      width,
      height: thickness,
      background: color,
      transformOrigin: align === 'center' ? 'center' : align,
      transform: `scaleX(${t})`,
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
    }}
  />
)

/** Desgaste sutil (manchas oscuras) para que la letra grande de camionetas se vea impresa sobre metal. */
const WORN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' seed='11'/>" +
    "<feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 2.6 -1.6'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}")`

/** Texto de título: blanco limpio (general) o blanco gastado tipo metal (camionetas). */
export const CineText: React.FC<{ text: string; size: number; family: string; worn?: boolean; color?: string; spacing?: number; style?: React.CSSProperties }> = ({
  text,
  size,
  family,
  worn = false,
  color = '#FFFFFF',
  spacing = 0.02,
  style,
}) => (
  <span
    style={{
      display: 'inline-block',
      fontFamily: family,
      fontSize: size,
      lineHeight: 0.92,
      letterSpacing: `${spacing}em`,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      filter: 'drop-shadow(0 6px 22px rgba(0,0,0,0.55))',
      ...(worn
        ? {
            color: 'transparent',
            backgroundImage: `${WORN}, linear-gradient(180deg, ${color} 0%, #D9D9D9 100%)`,
            backgroundSize: '260px 260px, 100% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }
        : { color }),
      ...style,
    }}
  >
    {text}
  </span>
)

/** Texto pequeño muy espaciado (marca, etiquetas, créditos). */
export const CineLabel: React.FC<{ text: string; size?: number; color?: string; spacing?: number; style?: React.CSSProperties }> = ({
  text,
  size = 34,
  color = 'rgba(255,255,255,0.88)',
  spacing = 0.42,
  style,
}) => (
  <span
    style={{
      fontFamily: FONT_UI,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: `${spacing}em`,
      textTransform: 'uppercase',
      color,
      whiteSpace: 'nowrap',
      textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      ...style,
    }}
  >
    {text}
  </span>
)

/** Esquinas finas que enmarcan lo que se señala. */
export const CineCorners: React.FC<{ x: number; y: number; w: number; h: number; t: number; color: string; stroke: number }> = ({ x, y, w, h, t, color, stroke }) => {
  const grow = 1 + 0.08 * (1 - t)
  const arm = Math.min(w, h) * 0.22
  const hw = (w / 2) * grow
  const hh = (h / 2) * grow
  return (
    <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: t }} width="100%" height="100%">
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy], i) => {
        const cx = x + sx * hw
        const cy = y + sy * hh
        return (
          <path
            key={i}
            d={`M ${cx - sx * arm} ${cy} L ${cx} ${cy} L ${cx} ${cy - sy * arm}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="square"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.5))' }}
          />
        )
      })}
    </svg>
  )
}

/** Grano de película: ruido que cambia en cada cuadro, muy suave. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const seed = frame % 7
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.09 }}>
      <filter id={`grain${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
    </svg>
  )
}

/** Apertura: en el primer instante las franjas casi se tocan y se abren como un telón (0.3 s). */
const OPEN_FRAMES = 8
const OPEN_FROM = 0.3

/**
 * Marco de cine encima de todo: viñeta, grano, franjas negras y el logo en blanco dentro de la franja de
 * arriba (se oculta en el cierre, que ya lo muestra grande).
 */
export const CineFrame: React.FC<{ logoSrc: string; showLogo: boolean; watermark?: string }> = ({ logoSrc, showLogo, watermark }) => {
  const frame = useCurrentFrame()
  const { height } = useVideoConfig()
  const finalBar = Math.round(height * LETTERBOX)
  const bar = Math.round(height * interpolate(frame, [0, OPEN_FRAMES], [OPEN_FROM, LETTERBOX], { ...clamp, easing: Easing.inOut(Easing.cubic) }))
  const settled = ease(frame, OPEN_FRAMES - 2, 8)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />
      <Grain />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: bar, background: '#000' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: bar, background: '#000' }} />
      {showLogo ? (
        <Img
          src={staticFile(logoSrc)}
          style={{ position: 'absolute', top: finalBar / 2 - 15, right: 56, height: 30, filter: 'brightness(0) invert(1)', opacity: 0.85 * settled }}
        />
      ) : null}
      {watermark ? (
        <div style={{ position: 'absolute', top: finalBar / 2 - 14, left: 50, fontFamily: FONT_UI, fontWeight: 800, fontSize: 24, letterSpacing: 4, color: 'rgba(255,255,255,0.55)', opacity: settled }}>
          {watermark}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
