/**
 * Gráficos en "modo cine" (por defecto en todos los Reels). Mismo plan del director, otra forma de dibujarlo:
 * como los títulos de un comercial de autos. Camionetas usan letra más gruesa, gastada, y acento naranja.
 */
import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from 'remotion'
import type { HookStyle } from '../../plan/schema'
import type { Brand, ReelTheme, TimelineGraphic } from '../../plan/types'
import { usePalette } from '../../reel/palette'
import { zoomProgress, zoomTransform } from '../../reel/zoom'
import { formatSpecNumber, FONT_UI } from '../../theme'
import { clamp, splitEmphasis, useEnterExit } from '../anim'
import { Icon } from '../Icons'
import { TreadBackground } from '../offroad/kit'
import { Chrome3D, enter3d, Particles } from './Cine3D'
import { AccentLine, CineCorners, CineLabel, CineText, ease, focusIn, LETTERBOX, useCineType } from './kit'

type Props = { g: TimelineGraphic; theme: ReelTheme }

const safeTop = (height: number) => height * LETTERBOX + 60
const safeBottom = (height: number) => height * (1 - LETTERBOX) - 60

/** Cuadro en que entra cada palabra del gancho y cuánto tarda en asentarse, según el estilo. */
const HOOK_TIMING: Record<HookStyle, { stagger: number; dur: number }> = {
  enfoque: { stagger: 0, dur: 16 },
  golpe: { stagger: 5, dur: 6 },
  revelado: { stagger: 3, dur: 12 },
  cruce: { stagger: 3, dur: 10 },
}

/** Entrada de una palabra del gancho según el estilo que eligió el director. */
function hookWordStyle(style: HookStyle, t: number, i: number, width: number): React.CSSProperties {
  switch (style) {
    case 'golpe':
      // Cae de golpe: aparece grande y desenfocada y se clava en su lugar.
      return {
        opacity: t > 0 ? 1 : 0,
        transform: `scale(${interpolate(t, [0, 1], [1.9, 1])})`,
        filter: t < 1 ? `blur(${((1 - t) * 10).toFixed(2)}px)` : undefined,
      }
    case 'revelado':
      // Sube desde detrás de una línea (máscara): el contenedor de la palabra recorta.
      return { transform: `translateY(${((1 - t) * 105).toFixed(2)}%)` }
    case 'cruce': {
      // Las palabras entran alternadas desde los dos lados, con desenfoque de movimiento.
      const dir = i % 2 === 0 ? -1 : 1
      return {
        opacity: t,
        transform: `translateX(${((1 - t) * dir * width * 0.55).toFixed(1)}px)`,
        filter: t < 1 ? `blur(${((1 - t) * 18).toFixed(2)}px)` : undefined,
      }
    }
    default:
      return {}
  }
}

/** Temblor de cámara que se apaga solo: un sacudón por cada palabra que cae en el estilo "golpe". */
function slamShake(frame: number, starts: number[]): string {
  let amp = 0
  for (const s of starts) {
    const d = frame - s
    if (d >= 0 && d < 9) amp = Math.max(amp, 16 * (1 - d / 9))
  }
  return amp ? `translate(${(Math.sin(frame * 2.3) * amp).toFixed(1)}px, ${(Math.cos(frame * 3.1) * amp * 0.6).toFixed(1)}px)` : 'none'
}

/**
 * Gancho: la frase centrada con la palabra clave en el color de acento y una línea fina. Cómo entra lo decide el
 * director: `enfoque` (de borroso a nítido), `golpe` (palabra por palabra, clavándose con un sacudón), `revelado`
 * (sube desde detrás de la línea) o `cruce` (entra desde los dos lados).
 */
export const CineHook: React.FC<Props & { style?: HookStyle }> = ({ g, theme, style = 'enfoque' }) => {
  const { frame, width, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = useCineType(theme)
  const words = splitEmphasis(g.text)
  const sub = g.subtext?.trim()
  // En camionetas el "subtext" es un adjetivo de una palabra ("IMPONENTE"): va grande, debajo.
  const bigSub = theme === 'offroad' && sub && !/\s/.test(sub)
  const size = Math.round((g.text.length > 30 ? 104 : g.text.length > 20 ? 124 : 144) * type.displayScale)
  const { stagger, dur } = HOOK_TIMING[style]
  const starts = words.map((_, i) => i * stagger)
  const textDone = (starts[starts.length - 1] ?? 0) + dur
  // En "revelado" la línea se dibuja primero y el texto sube desde ella; en los demás, la línea cierra la frase.
  const lineAt = style === 'revelado' ? 0 : Math.max(10, textDone - 6)
  const subAt = Math.max(14, textDone)

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 45% at 50% 42%, rgba(0,0,0,0.5), rgba(0,0,0,0) 75%)' }} />
      <Particles seed={g.id} strength={0.55} warm={theme === 'offroad'} />
      <div
        style={{
          position: 'absolute',
          top: height * 0.3,
          left: 70,
          right: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          transform: style === 'golpe' ? slamShake(frame, starts) : undefined,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: `0 ${Math.round(size * 0.26)}px`,
            textAlign: 'center',
            ...(style === 'enfoque' ? focusIn(ease(frame, 0, dur)) : {}),
          }}
        >
          {words.map(({ word, strong }, i) => {
            const t = ease(frame, starts[i], dur)
            const text = <CineText text={word} size={size} family={type.display} worn={theme === 'offroad'} color={strong ? accent : '#FFFFFF'} />
            if (style === 'enfoque') return <React.Fragment key={i}>{text}</React.Fragment>
            return (
              <span key={i} style={{ display: 'inline-block', overflow: style === 'revelado' ? 'hidden' : 'visible', paddingTop: style === 'revelado' ? 6 : 0 }}>
                <span style={{ display: 'inline-block', ...hookWordStyle(style, t, i, width) }}>{text}</span>
              </span>
            )
          })}
        </div>
        <AccentLine t={ease(frame, lineAt, style === 'revelado' ? 8 : 14)} width={style === 'revelado' ? 260 : 180} color={accent} align="center" />
        {sub ? (
          bigSub ? (
            <div style={focusIn(ease(frame, subAt, 16), { scale: 1.08 })}>
              <CineText text={sub} size={Math.round(190 * type.displayScale)} family={type.display} worn color={accent} />
            </div>
          ) : (
            <div style={focusIn(ease(frame, subAt, 14), { blur: 6, scale: 1 })}>
              <CineLabel text={sub} />
            </div>
          )
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

/**
 * Presentación: el modelo en letras de cromo 3D que llegan desde el fondo, giran despacio y reflejan una luz que las
 * cruza; marca espaciada encima, versión/año entre líneas de acento debajo, y partículas de luz flotando.
 */
export const CineTitle: React.FC<Props> = ({ g, theme }) => {
  const { frame, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = useCineType(theme)
  const titleY = height * 0.64

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 38%, rgba(0,0,0,0) 56%)' }} />
      <Particles seed={g.id} strength={0.85} warm={theme === 'offroad'} />
      {g.subtext ? (
        <div style={{ position: 'absolute', top: titleY - 200, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...focusIn(ease(frame, 6, 14), { blur: 6, scale: 1 }) }}>
          <CineLabel text={g.subtext} size={38} spacing={0.55} />
        </div>
      ) : null}
      <Chrome3D text={g.text} font={type.font3d} theme={theme} y={titleY} enter={enter3d(frame, 0, 24)} exit={exit} />
      {g.badge ? (
        <div style={{ position: 'absolute', top: titleY + 140, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, opacity: ease(frame, 16, 12) }}>
          <AccentLine t={ease(frame, 16, 14)} width={90} color={accent} align="right" />
          <CineLabel text={g.badge} size={40} color={accent} spacing={0.3} />
          <AccentLine t={ease(frame, 16, 14)} width={90} color={accent} align="left" />
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

/** Tope "redondo" del medidor: un poco más que el valor, para que la aguja no quede pegada al final. */
function gaugeMax(value: number): number {
  const target = value * 1.25
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, target)))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= target) ?? 10
  return step * magnitude
}

/**
 * Medidor: arco de 240° con marcas finas; la aguja barre hasta el valor mientras el número cuenta al centro.
 * Para potencia, torque, velocidad o cilindrada.
 */
const CineGauge: React.FC<Props> = ({ g, theme }) => {
  const { frame, fps, width, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = useCineType(theme)
  const value = g.value ?? 0
  const max = gaugeMax(value)
  const decimals = Number.isInteger(value) ? 0 : 1
  const sweep = interpolate(frame, [6, 6 + Math.round(fps * 0.9)], [0, value / max], { ...clamp, easing: Easing.out(Easing.cubic) })
  const R = 300
  const cx = width / 2
  const cy = (g.placement === 'abajo' ? height * 0.62 : height * 0.4) + 20
  const START = -210 // grados (0 = derecha); el arco va de -210° a 30°
  const SPAN = 240
  const angle = (START + SPAN * sweep) * (Math.PI / 180)
  const point = (deg: number, r: number) => ({ x: cx + Math.cos((deg * Math.PI) / 180) * r, y: cy + Math.sin((deg * Math.PI) / 180) * r })
  const arc = (from: number, to: number, r: number) => {
    const a = point(from, r)
    const b = point(to, r)
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
  }
  const appear = ease(frame, 0, 12)
  const ticks = Array.from({ length: 25 }, (_, i) => START + (SPAN * i) / 24)

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${(cy / height) * 100}%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0) 55%)` }} />
      {/* Disco de vidrio oscuro: separa el medidor de lo que haya detrás (p. ej. el tablero del auto). */}
      <div
        style={{
          position: 'absolute',
          left: cx - R - 50,
          top: cy - R - 50,
          width: (R + 50) * 2,
          height: (R + 50) * 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(8,8,10,0.62) 0%, rgba(8,8,10,0.5) 70%, rgba(8,8,10,0) 100%)',
          backdropFilter: 'blur(10px)',
          opacity: appear,
        }}
      />
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: appear, transform: `scale(${1 + (1 - appear) * 0.06})`, transformOrigin: `${cx}px ${cy}px` }}>
        <path d={arc(START, START + SPAN, R)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={10} strokeLinecap="round" />
        {sweep > 0.002 ? (
          <path d={arc(START, START + SPAN * sweep, R)} fill="none" stroke={accent} strokeWidth={10} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 14px ${accent})` }} />
        ) : null}
        {ticks.map((deg, i) => {
          const a = point(deg, R - 26)
          const b = point(deg, R - (i % 6 === 0 ? 62 : 44))
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={i / 24 <= sweep ? '#fff' : 'rgba(255,255,255,0.35)'} strokeWidth={i % 6 === 0 ? 5 : 3} />
        })}
        <line x1={cx} y1={cy} x2={cx + Math.cos(angle) * (R - 70)} y2={cy + Math.sin(angle) * (R - 70)} stroke={accent} strokeWidth={8} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.6))' }} />
        <circle cx={cx} cy={cy} r={18} fill="#fff" />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy + 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, ...focusIn(ease(frame, 4, 14), { blur: 6, scale: 1.04 }) }}>
          <CineText text={`${g.prefix ?? ''}${formatSpecNumber(sweep * max, decimals)}`} size={Math.round(150 * type.displayScale)} family={type.display} worn={theme === 'offroad'} />
          {g.unit ? <CineText text={g.unit} size={Math.round(64 * type.displayScale)} family={type.display} color={accent} /> : null}
        </div>
        <div style={focusIn(ease(frame, 10, 12), { blur: 6, scale: 1 })}>
          <CineLabel text={g.text} size={34} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** Dato: etiqueta espaciada, número grande que cuenta rápido y la unidad en color de acento. */
export const CineCounter: React.FC<Props> = ({ g, theme }) => {
  if (g.variant === 'medidor' && typeof g.value === 'number' && g.value > 0) return <CineGauge g={g} theme={theme} />
  return <CineNumber g={g} theme={theme} />
}

const CineNumber: React.FC<Props> = ({ g, theme }) => {
  const { frame, fps, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = useCineType(theme)
  const value = g.value ?? 0
  const decimals = Number.isInteger(value) ? 0 : 1
  const count = interpolate(frame, [2, 2 + Math.round(fps * 0.7)], [0, value], { ...clamp, easing: Easing.out(Easing.cubic) })
  // Unidad corta ("KM", "L", "HP") va al lado del número; una palabra ("DIÉSEL", "OCUPANTES") va debajo.
  const shortUnit = g.unit && g.unit.length <= 3 ? g.unit : ''
  const wordUnit = g.unit && g.unit.length > 3 ? g.unit : ''
  const number = `${g.prefix ?? ''}${formatSpecNumber(count, decimals)}`
  // Si la etiqueta y la unidad dicen lo mismo ("Ocupantes" / "OCUPANTES"), se muestra una sola vez (abajo).
  const sameWord = wordUnit && wordUnit.toLowerCase() === g.text.trim().toLowerCase()
  const finalLength = `${g.prefix ?? ''}${formatSpecNumber(value, decimals)}${shortUnit}`.length
  const size = Math.round((finalLength <= 4 ? 250 : finalLength <= 7 ? 190 : 140) * type.displayScale)
  const low = g.placement === 'abajo'

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: `linear-gradient(${low ? 0 : 180}deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 45%)` }} />
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          ...(low ? { bottom: height - safeBottom(height) + 110 } : { top: safeTop(height) + 20 }),
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {sameWord ? null : (
          <div style={focusIn(ease(frame, 0, 12), { blur: 6, scale: 1 })}>
            <CineLabel text={g.text} />
          </div>
        )}
        {/* Profundidad: la cifra entra girada en perspectiva y sigue moviéndose apenas. */}
        <div style={{ transformOrigin: 'left center', transform: `perspective(1100px) rotateY(${(-26 * (1 - ease(frame, 2, 20)) - 7 + Math.sin(frame / 40) * 3).toFixed(2)}deg)` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, transformOrigin: 'left center', ...focusIn(ease(frame, 2, 16), { scale: 1.04 }) }}>
            <CineText text={number} size={size} family={type.display} worn={theme === 'offroad'} />
            {shortUnit ? <CineText text={shortUnit} size={Math.round(size * 0.42)} family={type.display} color={accent} /> : null}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: ease(frame, 12, 12) }}>
          <AccentLine t={ease(frame, 12, 14)} width={110} color={accent} />
          {wordUnit || g.subtext ? <CineLabel text={wordUnit || g.subtext || ''} size={36} color={wordUnit ? accent : undefined} spacing={0.3} /> : null}
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** Característica señalada: esquinas finas sobre el objeto (el clip ya hizo zoom) y un rótulo inferior sobrio. */
export const CineCallout: React.FC<Props> = ({ g, theme }) => {
  const { frame, fps, durationInFrames, width, height, exit } = useEnterExit(10)
  const { accent } = usePalette()
  const z = g.zoom ? zoomTransform(g.zoom, zoomProgress(frame, durationInFrames, fps), frame / durationInFrames) : null
  const box = z ? { x: z.point.x, y: z.point.y, w: Math.max(240, z.radius * 2.3), h: Math.max(220, z.radius * 2.1) } : null
  // Del lado que eligió la línea de tiempo (cardAtTop): los subtítulos van al lado contrario.
  const above = g.cardAtTop ?? true
  const panelTop = box
    ? above
      ? Math.max(safeTop(height), box.y - box.h / 2 - 210)
      : Math.min(safeBottom(height) - 190, box.y + box.h / 2 + 50)
    : above
      ? safeTop(height) + 40
      : height * 0.62

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      {box ? (
        <CineCorners x={box.x} y={box.y} w={box.w} h={box.h} t={ease(frame, 4, 12)} color={theme === 'offroad' ? accent : '#FFFFFF'} stroke={theme === 'offroad' ? 7 : 4} />
      ) : null}
      <div style={{ position: 'absolute', top: panelTop, left: 70, right: 70, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            background: 'rgba(8, 8, 10, 0.62)',
            backdropFilter: 'blur(8px)',
            maxWidth: width - 140,
            ...focusIn(ease(frame, 8, 14), { blur: 8, scale: 1.02 }),
            // Tarjeta con profundidad: entra volteándose y queda flotando con un leve vaivén.
            transform: `perspective(1000px) rotateX(${((above ? -1 : 1) * 40 * (1 - ease(frame, 8, 16))).toFixed(2)}deg) rotateY(${(Math.sin(frame / 36) * 4).toFixed(2)}deg) scale(${(1 + 0.02 * (1 - ease(frame, 8, 14))).toFixed(3)})`,
            boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ width: 8, background: accent }} />
          <div style={{ padding: '18px 30px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 46, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', lineHeight: 1.05 }}>{g.text}</span>
            {g.subtext ? <span style={{ fontFamily: FONT_UI, fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>{g.subtext}</span> : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** Fichas en una fila separada por líneas finas; listas numeradas 01, 02… Todo entra en cascada suave. */
export const CineList: React.FC<Props> = ({ g }) => {
  const { frame, durationInFrames, height, exit } = useEnterExit(10)
  const { accent } = usePalette()
  const items = (g.items ?? []).slice(0, 5)
  const per = Math.max(5, Math.min(12, Math.floor((durationInFrames * 0.45) / Math.max(1, items.length))))

  if (g.type === 'spec_chips') {
    return (
      <AbsoluteFill style={{ opacity: 1 - exit }}>
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%)' }} />
        <div style={{ position: 'absolute', top: safeTop(height) + 20, left: 70, right: 70, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px 26px' }}>
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <div style={{ width: 4, height: 44, background: accent, opacity: ease(frame, 4 + i * per, 8) }} /> : null}
              <div style={focusIn(ease(frame, 4 + i * per, 12), { blur: 6, scale: 1 })}>
                <CineLabel text={item} size={42} color="#fff" spacing={0.14} />
              </div>
            </React.Fragment>
          ))}
        </div>
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%)' }} />
      <div style={{ position: 'absolute', top: safeTop(height) + 20, left: 80, right: 80, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {g.text ? (
          <div style={{ marginBottom: 10, ...focusIn(ease(frame, 0, 12), { blur: 6, scale: 1 }) }}>
            <CineLabel text={g.text} />
          </div>
        ) : null}
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 24,
              ...focusIn(ease(frame, 6 + i * per, 12), { blur: 6, scale: 1 }),
              transformOrigin: 'left center',
              transform: `perspective(900px) rotateX(${(70 * (1 - ease(frame, 6 + i * per, 14))).toFixed(2)}deg)`,
            }}
          >
            <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 30, letterSpacing: '0.1em', color: accent }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 54, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff' }}>{item}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/** Precio: etiqueta espaciada y cifra grande, con los extras en una fila fina. */
export const CinePrice: React.FC<Props> = ({ g, theme }) => {
  const { frame, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = useCineType(theme)
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 45%)' }} />
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: height - safeBottom(height) + 110, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={focusIn(ease(frame, 0, 12), { blur: 6, scale: 1 })}>
          <CineLabel text={g.subtext ?? 'PRECIO'} color={accent} />
        </div>
        <div style={{ transformOrigin: 'left bottom', ...focusIn(ease(frame, 3, 16)) }}>
          <CineText text={g.text} size={Math.round(170 * type.displayScale)} family={type.display} worn={theme === 'offroad'} />
        </div>
        {g.items?.length ? (
          <div style={{ display: 'flex', gap: 30, opacity: ease(frame, 12, 12) }}>
            {g.items.map((item, i) => (
              <CineLabel key={i} text={item} size={30} spacing={0.2} />
            ))}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

/** Cierre tipo placa final: "COMENTA" espaciado, la palabra clave en cromo 3D, la promesa y el logo en blanco. */
export const CineCta: React.FC<Props & { brand: Brand }> = ({ g, theme, brand }) => {
  const { frame, width, height } = useEnterExit(1)
  const { accent } = usePalette()
  const type = useCineType(theme)
  const keyword = g.text.replace(/^comenta\s+/i, '').replace(/["“”']/g, '').toUpperCase()
  const y0 = height * 0.42

  return (
    <AbsoluteFill style={{ opacity: ease(frame, 0, 10) }}>
      {theme === 'offroad' ? (
        <AbsoluteFill style={{ background: '#050506' }}>
          <AbsoluteFill style={{ opacity: 0.6 }}>
            <TreadBackground frame={frame} width={width} height={height} />
          </AbsoluteFill>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 45%, #1A1A1D 0%, #050506 100%)' }} />
      )}
      <Particles seed={g.id} strength={0.7} warm={theme === 'offroad'} />
      <div style={{ position: 'absolute', top: y0 - 210, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...focusIn(ease(frame, 4, 14), { blur: 6, scale: 1 }) }}>
        <CineLabel text="Comenta" size={40} spacing={0.6} />
      </div>
      <Chrome3D text={keyword} font={type.font3d} theme={theme} y={y0} enter={enter3d(frame, 6, 26)} exit={0} size={1.35} />
      <div style={{ position: 'absolute', top: y0 + 150, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, textAlign: 'center' }}>
        <AccentLine t={ease(frame, 16, 14)} width={200} color={accent} align="center" />
        {g.subtext ? (
          <div style={focusIn(ease(frame, 20, 14), { blur: 6, scale: 1 })}>
            <span style={{ fontFamily: FONT_UI, fontWeight: 600, fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>{g.subtext}</span>
          </div>
        ) : null}
        <div style={{ marginTop: 50, opacity: ease(frame, 26, 14) }}>
          <Img src={staticFile(brand.logoSrc)} style={{ width: 300, display: 'block', filter: 'brightness(0) invert(1)' }} />
        </div>
        <div style={{ opacity: ease(frame, 30, 14) }}>
          <CineLabel text="Cuenca · Ecuador" size={26} spacing={0.5} color="rgba(255,255,255,0.6)" />
        </div>
      </div>
    </AbsoluteFill>
  )
}

/**
 * Encuesta: la pregunta y dos opciones como en una historia de Instagram. A mitad del gráfico se "toca" una opción
 * (anillo que se expande) y las barras se llenan con el resultado: invita a votar en los comentarios.
 */
const CinePoll: React.FC<Props> = ({ g }) => {
  const { frame, durationInFrames, height, exit } = useEnterExit(8)
  const { accent } = usePalette()
  const [a, b] = g.items ?? []
  const tapAt = Math.round(durationInFrames * 0.42)
  const voted = ease(frame, tapAt, 14)
  const ring = interpolate(frame - tapAt, [0, 12], [0, 1], clamp)
  const shares = [64, 36]
  const top = g.placement === 'abajo' ? height * 0.52 : safeTop(height) + 30

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', top, left: 120, right: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, ...focusIn(ease(frame, 0, 12), { blur: 6, scale: 1.03 }) }}>
        <div style={{ padding: '18px 30px', borderRadius: 22, background: 'rgba(10,10,12,0.62)', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
          <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 46, color: '#fff', lineHeight: 1.15 }}>
            {splitEmphasis(g.text).map(({ word, strong }, i) => (
              <span key={i} style={{ color: strong ? accent : '#fff' }}>
                {i > 0 ? ' ' : ''}
                {word}
              </span>
            ))}
          </span>
        </div>
        {[a, b].map((option, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              width: '100%',
              height: 86,
              borderRadius: 999,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              transform: `perspective(900px) rotateX(${(60 * (1 - ease(frame, 4 + i * 4, 12))).toFixed(2)}deg)`,
              opacity: ease(frame, 4 + i * 4, 10),
            }}
          >
            <div style={{ position: 'absolute', inset: 0, width: `${shares[i] * voted}%`, background: i === 0 ? accent : 'rgba(0,0,0,0.18)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px' }}>
              <span style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 36, color: i === 0 && voted > 0.5 ? '#fff' : '#111', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{option}</span>
              <span style={{ fontFamily: FONT_UI, fontWeight: 900, fontSize: 32, color: '#111', opacity: voted }}>{Math.round(shares[i] * voted)}%</span>
            </div>
            {i === 0 && ring > 0 && ring < 1 ? (
              <div style={{ position: 'absolute', left: '22%', top: '50%', width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', border: '4px solid #fff', transform: `scale(${1 + ring * 2.2})`, opacity: 1 - ring }} />
            ) : null}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/** Invitación a interactuar: encuesta si trae dos opciones; si no, cápsula translúcida con ícono fino. */
export const CineSticker: React.FC<Props> = ({ g, theme }) => {
  if ((g.items?.length ?? 0) >= 2) return <CinePoll g={g} theme={theme} />
  return <CinePill g={g} theme={theme} />
}

const CinePill: React.FC<Props> = ({ g }) => {
  const { frame, height, exit } = useEnterExit(8)
  const { accent } = usePalette()
  const top = g.placement === 'abajo' ? height * 0.56 : safeTop(height) + 10
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '16px 34px 16px 26px',
            borderRadius: 999,
            background: 'rgba(10, 10, 12, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.28)',
            ...focusIn(ease(frame, 0, 12), { blur: 6, scale: 1.03 }),
          }}
        >
          {g.icon ? <Icon name={g.icon} size={40} color="#fff" strokeWidth={1.8} /> : null}
          <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 34, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', whiteSpace: 'nowrap' }}>
            {splitEmphasis(g.text).map(({ word, strong }, i) => (
              <span key={i} style={{ color: strong ? accent : '#fff' }}>
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
