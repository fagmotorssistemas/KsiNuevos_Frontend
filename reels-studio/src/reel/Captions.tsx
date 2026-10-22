import React from 'react'
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { CaptionStyle } from '../plan/schema'
import type { CaptionLine, CaptionWord, Placement, ReelLook, ReelTheme } from '../plan/types'
import { usePalette } from './palette'
import { COLORS, FONT_CONDENSED, FONT_DISPLAY, FONT_HEAVY, FONT_RACE, FONT_SOCIAL, FONT_SPEED, FONT_UI, PALETTES } from '../theme'

const Y_BY_PLACEMENT: Record<Placement, number> = { arriba: 0.2, centro: 0.5, abajo: 0.72 }
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

type WordState = { w: CaptionWord; text: string; active: boolean; spoken: boolean; since: number }
type LineProps = { words: WordState[]; local: number; fps: number; lineIndex: number }

/**
 * Subtítulos: el director elige un estilo por Reel (tipografía + animación) para que no todos se vean
 * iguales; todos usan los colores de la marca (rojo, amarillo, blanco).
 */
export const Captions: React.FC<{ lines: CaptionLine[]; style?: CaptionStyle; theme?: ReelTheme; look?: ReelLook }> = ({
  lines,
  style = 'impacto',
  theme = 'ksi',
  look = 'social',
}) => {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const lineIndex = lines.findIndex((l) => frame >= l.fromFrame && frame < l.toFrame)
  if (lineIndex === -1) return null
  const line = lines[lineIndex]
  const local = frame - line.fromFrame
  const words: WordState[] = line.words.map((w) => ({
    w,
    text: w.text.replace(/[.,;:…]+$/, '').toUpperCase(),
    active: frame >= w.fromFrame && frame < Math.max(w.toFrame, w.fromFrame + 4),
    spoken: frame >= w.fromFrame,
    since: frame - w.fromFrame,
  }))
  const props: LineProps = { words, local, fps, lineIndex }
  // `palabra` es una sola palabra gigante: va al centro salvo que abajo haya algo importante.
  const y = style === 'palabra' && line.placement === 'abajo' ? 0.62 : Y_BY_PLACEMENT[line.placement]
  // El diseño camioneta tiene un solo estilo de subtítulo, el de la referencia. En modo cine, cada estilo
  // conserva su tipografía (para que no todos los Reels se vean iguales) pero se dibuja sobrio.
  const Style = theme === 'offroad' ? Offroad : look === 'cine' ? CINE_STYLES[style] : (STYLES[style] ?? Impacto)

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: height * y, left: 50, right: 50, transform: 'translateY(-50%)' }}>
        <Style {...props} />
      </div>
    </AbsoluteFill>
  )
}

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }

/** Karaoke clásico: la palabra que suena crece en amarillo; cifras y beneficios en bloque rojo. */
const Impacto: React.FC<LineProps> = ({ words, local, fps }) => {
  const pop = spring({ frame: local, fps, config: { damping: 20, stiffness: 150, mass: 0.8 } })
  return (
    <div
      style={{
        ...row,
        gap: '10px 38px',
        transform: `scale(${interpolate(pop, [0, 1], [0.93, 1])}) perspective(900px) rotateX(${interpolate(pop, [0, 1], [12, 0])}deg)`,
        opacity: interpolate(pop, [0, 0.35], [0, 1], clamp),
      }}
    >
      {words.map(({ w, text, active, spoken, since }, i) => {
        const wordPop = spring({ frame: since, fps, config: { damping: 18, stiffness: 160, mass: 0.7 } })
        const scale = active ? interpolate(wordPop, [0, 1], [1.0, 1.05]) : 1
        const base: React.CSSProperties = { fontFamily: FONT_UI, fontWeight: 900, lineHeight: 1.05 }
        return w.emphasis ? (
          <span
            key={i}
            style={{
              ...base,
              fontSize: 84,
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
        ) : (
          <span
            key={i}
            style={{
              ...base,
              fontSize: 80,
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
  )
}

/** Deportivo: letra inclinada que entra en barrido desde la derecha, con estela roja bajo la palabra activa. */
const Velocidad: React.FC<LineProps> = ({ words, fps }) => (
  <div style={{ ...row, gap: '8px 30px', transform: 'skewX(-12deg)' }}>
    {words.map(({ w, text, active, spoken, since }, i) => {
      const enter = spring({ frame: since, fps, config: { damping: 24, stiffness: 260, mass: 0.6 } })
      const streak = interpolate(since, [0, 5], [0, 1], clamp)
      return (
        <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: FONT_SPEED,
              fontSize: 80,
              lineHeight: 1.1,
              color: w.emphasis ? COLORS.white : active ? COLORS.yellow : COLORS.white,
              background: w.emphasis ? COLORS.red : undefined,
              padding: w.emphasis ? '0 16px' : undefined,
              WebkitTextStroke: w.emphasis ? undefined : '8px #000',
              paintOrder: 'stroke fill',
              textShadow: '0 6px 16px rgba(0,0,0,0.6)',
              transform: `translateX(${spoken ? interpolate(enter, [0, 1], [140, 0]) : 140}px)`,
              filter: spoken ? `blur(${interpolate(since, [0, 4], [6, 0], clamp)}px)` : undefined,
              opacity: spoken ? interpolate(enter, [0, 0.3], [0, 1], clamp) : 0,
            }}
          >
            {text}
          </span>
          {active && !w.emphasis ? (
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -6,
                height: 9,
                background: COLORS.red,
                transformOrigin: 'right',
                transform: `scaleX(${streak})`,
                boxShadow: '0 0 14px rgba(232,28,42,0.8)',
              }}
            />
          ) : null}
        </span>
      )
    })}
  </div>
)

/** Sedán: letra alta y espaciada que sube suave palabra a palabra; una línea roja crece debajo. */
const Elegante: React.FC<LineProps> = ({ words, local, fps }) => {
  const bar = interpolate(local, [0, 14], [0, 1], { ...clamp })
  return (
    <div style={{ ...row, flexDirection: 'column' }}>
      <div style={{ ...row, gap: '0 34px' }}>
        {words.map(({ w, text, active, spoken, since }, i) => {
          const rise = spring({ frame: since, fps, config: { damping: 26, stiffness: 120, mass: 0.9 } })
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_CONDENSED,
                fontSize: 116,
                letterSpacing: 6,
                lineHeight: 1,
                color: w.emphasis || active ? COLORS.yellow : COLORS.white,
                textShadow: '0 6px 26px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)',
                transform: `translateY(${spoken ? interpolate(rise, [0, 1], [34, 0]) : 34}px)`,
                opacity: spoken ? interpolate(rise, [0, 0.6], [0, 1], clamp) : 0.25,
                borderBottom: w.emphasis && spoken ? `8px solid ${COLORS.red}` : '8px solid transparent',
              }}
            >
              {text}
            </span>
          )
        })}
      </div>
      <div style={{ width: 420 * bar, height: 6, background: COLORS.red, marginTop: 14, borderRadius: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }} />
    </div>
  )
}

/** Camioneta: bloque rojo inclinado que cae como un sello; letra pesada, la activa en amarillo. */
const Robusto: React.FC<LineProps> = ({ words, local, fps, lineIndex }) => {
  const stamp = spring({ frame: local, fps, config: { damping: 11, stiffness: 220, mass: 0.9 } })
  const shake = local < 6 ? (6 - local) * 1.2 : 0
  const sx = (random(`rx${lineIndex}-${local}`) - 0.5) * shake
  return (
    <div style={{ ...row }}>
      <div
        style={{
          ...row,
          gap: '6px 26px',
          background: COLORS.red,
          padding: '14px 34px 20px',
          borderRadius: 8,
          transform: `translateX(${sx}px) scale(${interpolate(stamp, [0, 1], [1.4, 1])}) rotate(${interpolate(stamp, [0, 1], [-6, -3])}deg)`,
          opacity: interpolate(stamp, [0, 0.25], [0, 1], clamp),
          boxShadow: `0 12px 0 ${COLORS.redDeep}, 0 24px 40px rgba(0,0,0,0.5)`,
        }}
      >
        {words.map(({ w, text, active, spoken }, i) => (
          <span
            key={i}
            style={{
              fontFamily: FONT_HEAVY,
              fontSize: 82,
              lineHeight: 1.05,
              color: w.emphasis || active ? COLORS.yellow : COLORS.white,
              WebkitTextStroke: '6px #000',
              paintOrder: 'stroke fill',
              opacity: spoken ? 1 : 0.5,
            }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Redes: caja amarilla que salta de palabra en palabra; cifras y beneficios en caja roja. */
const Caja: React.FC<LineProps> = ({ words, local, fps }) => {
  const pop = spring({ frame: local, fps, config: { damping: 18, stiffness: 200, mass: 0.7 } })
  return (
    <div style={{ ...row, gap: '12px 14px', transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`, opacity: interpolate(pop, [0, 0.3], [0, 1], clamp) }}>
      {words.map(({ w, text, active, spoken, since }, i) => {
        const boxPop = spring({ frame: since, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } })
        const boxed = active || (w.emphasis && spoken)
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT_SOCIAL,
              fontWeight: 800,
              fontSize: 74,
              lineHeight: 1.1,
              padding: '2px 18px 6px',
              borderRadius: 16,
              color: boxed && !w.emphasis ? COLORS.ink : COLORS.white,
              background: boxed ? (w.emphasis ? COLORS.red : COLORS.yellow) : 'transparent',
              WebkitTextStroke: boxed ? undefined : '7px #000',
              paintOrder: 'stroke fill',
              transform: `scale(${boxed ? interpolate(boxPop, [0, 1], [0.8, 1.06]) : 1}) rotate(${boxed ? (i % 2 ? 2 : -2) : 0}deg)`,
              boxShadow: boxed ? '0 10px 24px rgba(0,0,0,0.45)' : undefined,
            }}
          >
            {text}
          </span>
        )
      })}
    </div>
  )
}

/** Alta energía: una palabra gigante a la vez que rebota, alternando blanco y amarillo; las clave en rojo. */
const Palabra: React.FC<LineProps> = ({ words, local, fps, lineIndex }) => {
  const bounce = spring({ frame: local, fps, config: { damping: 9, stiffness: 240, mass: 0.7 } })
  const tilt = (random(`tilt${lineIndex}`) - 0.5) * 8
  return (
    <div style={{ ...row }}>
      {words.map(({ w, text }, i) => (
        <span
          key={i}
          style={{
            fontFamily: FONT_RACE,
            fontWeight: 700,
            fontSize: text.length > 9 ? 150 : 196,
            lineHeight: 0.95,
            color: w.emphasis ? COLORS.red : lineIndex % 2 ? COLORS.yellow : COLORS.white,
            WebkitTextStroke: w.emphasis ? '8px #fff' : '10px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 12px 30px rgba(0,0,0,0.6)',
            transform: `scale(${interpolate(bounce, [0, 1], [0.4, 1])}) rotate(${tilt}deg)`,
            opacity: interpolate(bounce, [0, 0.2], [0, 1], clamp),
          }}
        >
          {text}
        </span>
      ))}
    </div>
  )
}

const SHORT_WORD = /^(EL|LA|LOS|LAS|UN|UNA|DE|DEL|Y|O|EN|CON|POR|PARA|QUE|SU|SUS|ES|AL|LO|SE|TU|MI)$/

/**
 * Camioneta: la frase entera aparece de una vez (sube un poco, sin rebote), letra condensada blanca limpia
 * (sin sombra ni borde) y una palabra en naranja (la clave o la más larga). Sobrio, como la referencia.
 */
const Offroad: React.FC<LineProps> = ({ words, local }) => {
  const marked = words.some(({ w }) => w.emphasis)
  const longest = marked
    ? -1
    : words.reduce((best, cur, i) => (!SHORT_WORD.test(cur.text) && cur.text.length > (words[best]?.text.length ?? 0) ? i : best), -1)
  return (
    <div style={{ ...row, gap: '6px 24px', opacity: interpolate(local, [0, 5], [0, 1], clamp), transform: `translateY(${interpolate(local, [0, 5], [18, 0], clamp)}px)` }}>
      {words.map(({ w, text }, i) => (
        <span
          key={i}
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 90,
            lineHeight: 1.05,
            color: w.emphasis || i === longest ? PALETTES.offroad.accent : COLORS.white,
          }}
        >
          {text}
        </span>
      ))}
    </div>
  )
}

/** Modo cine: la tipografía de cada estilo, sin cajas, contornos ni rebotes. */
const CINE_FONT: Record<CaptionStyle, { family: string; weight: number; size: number; spacing: number }> = {
  impacto: { family: FONT_UI, weight: 800, size: 66, spacing: 0.02 },
  velocidad: { family: FONT_SPEED, weight: 400, size: 62, spacing: 0.03 },
  elegante: { family: FONT_CONDENSED, weight: 400, size: 90, spacing: 0.08 },
  robusto: { family: FONT_HEAVY, weight: 400, size: 60, spacing: 0.02 },
  caja: { family: FONT_SOCIAL, weight: 800, size: 64, spacing: 0.01 },
  palabra: { family: FONT_RACE, weight: 700, size: 104, spacing: 0.04 },
}

/** Modo cine: la frase entera aparece de borroso a nítido; blanca, con la palabra clave en el acento. */
function cineStyle(style: CaptionStyle): React.FC<LineProps> {
  const font = CINE_FONT[style]
  const CineLine: React.FC<LineProps> = ({ words, local }) => {
    const { accent } = usePalette()
    const t = interpolate(local, [0, 6], [0, 1], clamp)
    return (
      <div style={{ ...row, gap: `4px ${Math.round(font.size * 0.3)}px`, opacity: t, filter: t < 1 ? `blur(${(1 - t) * 5}px)` : undefined }}>
        {words.map(({ w, text }, i) => (
          <span
            key={i}
            style={{
              fontFamily: font.family,
              fontWeight: font.weight,
              fontSize: font.size,
              letterSpacing: `${font.spacing}em`,
              lineHeight: 1.08,
              color: w.emphasis ? accent : COLORS.white,
            }}
          >
            {text}
          </span>
        ))}
      </div>
    )
  }
  return CineLine
}

const CINE_STYLES = Object.fromEntries(
  (['impacto', 'velocidad', 'elegante', 'robusto', 'caja', 'palabra'] as const).map((s) => [s, cineStyle(s)])
) as Record<CaptionStyle, React.FC<LineProps>>

const STYLES: Record<CaptionStyle, React.FC<LineProps>> = {
  impacto: Impacto,
  velocidad: Velocidad,
  elegante: Elegante,
  robusto: Robusto,
  caja: Caja,
  palabra: Palabra,
}
