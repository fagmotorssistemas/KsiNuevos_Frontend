/**
 * Gráficos en "modo cine" (por defecto en todos los Reels). Mismo plan del director, otra forma de dibujarlo:
 * como los títulos de un comercial de autos. Camionetas usan letra más gruesa, gastada, y acento naranja.
 */
import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from 'remotion'
import type { Brand, ReelTheme, TimelineGraphic } from '../../plan/types'
import { usePalette } from '../../reel/palette'
import { zoomProgress, zoomTransform } from '../../reel/zoom'
import { formatSpecNumber, FONT_UI } from '../../theme'
import { clamp, splitEmphasis, useEnterExit } from '../anim'
import { Icon } from '../Icons'
import { TreadBackground } from '../offroad/kit'
import { AccentLine, CINE_TYPE, CineCorners, CineLabel, CineText, ease, focusIn, LETTERBOX } from './kit'

type Props = { g: TimelineGraphic; theme: ReelTheme }

const safeTop = (height: number) => height * LETTERBOX + 60
const safeBottom = (height: number) => height * (1 - LETTERBOX) - 60

/** Gancho: la frase centrada, de borroso a nítido, con la palabra clave en el color de acento y una línea fina. */
export const CineHook: React.FC<Props> = ({ g, theme }) => {
  const { frame, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = CINE_TYPE[theme]
  const words = splitEmphasis(g.text)
  const sub = g.subtext?.trim()
  // En camionetas el "subtext" es un adjetivo de una palabra ("IMPONENTE"): va grande, debajo.
  const bigSub = theme === 'offroad' && sub && !/\s/.test(sub)
  const size = Math.round((g.text.length > 30 ? 104 : g.text.length > 20 ? 124 : 144) * type.displayScale)

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 45% at 50% 42%, rgba(0,0,0,0.5), rgba(0,0,0,0) 75%)' }} />
      <div style={{ position: 'absolute', top: height * 0.3, left: 70, right: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${Math.round(size * 0.26)}px`, textAlign: 'center', ...focusIn(ease(frame, 0, 16)) }}>
          {words.map(({ word, strong }, i) => (
            <CineText key={i} text={word} size={size} family={type.display} worn={theme === 'offroad'} color={strong ? accent : '#FFFFFF'} />
          ))}
        </div>
        <AccentLine t={ease(frame, 10, 14)} width={180} color={accent} align="center" />
        {sub ? (
          bigSub ? (
            <div style={focusIn(ease(frame, 14, 16), { scale: 1.08 })}>
              <CineText text={sub} size={Math.round(190 * type.displayScale)} family={type.display} worn color={accent} />
            </div>
          ) : (
            <div style={focusIn(ease(frame, 14, 14), { blur: 6, scale: 1 })}>
              <CineLabel text={sub} />
            </div>
          )
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

/** Presentación tipo título de película: marca espaciada, modelo enorme y versión/año con línea de acento. */
export const CineTitle: React.FC<Props> = ({ g, theme }) => {
  const { frame, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = CINE_TYPE[theme]
  const model = g.text
  const size = Math.round((model.length <= 6 ? 220 : model.length <= 9 ? 180 : model.length <= 12 ? 140 : 112) * type.displayScale)

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 32%, rgba(0,0,0,0) 50%)' }} />
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: height - safeBottom(height) + 90, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {g.subtext ? (
          <div style={focusIn(ease(frame, 0, 14), { blur: 6, scale: 1 })}>
            <CineLabel text={g.subtext} />
          </div>
        ) : null}
        <div style={{ transformOrigin: 'left bottom', ...focusIn(ease(frame, 4, 18), { scale: 1.06 }) }}>
          <CineText text={model} size={size} family={type.display} worn={theme === 'offroad'} />
        </div>
        {g.badge ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 6, opacity: ease(frame, 12, 12) }}>
            <AccentLine t={ease(frame, 12, 14)} width={110} color={accent} />
            <CineLabel text={g.badge} size={40} color={accent} spacing={0.3} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

/** Dato: etiqueta espaciada, número grande que cuenta rápido y la unidad en color de acento. */
export const CineCounter: React.FC<Props> = ({ g, theme }) => {
  const { frame, fps, height, exit } = useEnterExit(12)
  const { accent } = usePalette()
  const type = CINE_TYPE[theme]
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, transformOrigin: 'left center', ...focusIn(ease(frame, 2, 16), { scale: 1.04 }) }}>
          <CineText text={number} size={size} family={type.display} worn={theme === 'offroad'} />
          {shortUnit ? <CineText text={shortUnit} size={Math.round(size * 0.42)} family={type.display} color={accent} /> : null}
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
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 24, ...focusIn(ease(frame, 6 + i * per, 12), { blur: 6, scale: 1 }) }}>
            <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 30, letterSpacing: '0.1em', color: accent }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 54, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.6)' }}>{item}</span>
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
  const type = CINE_TYPE[theme]
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

/** Cierre tipo placa final: "COMENTA" espaciado, la palabra clave enorme, la promesa y el logo en blanco. */
export const CineCta: React.FC<Props & { brand: Brand }> = ({ g, theme, brand }) => {
  const { frame, width, height } = useEnterExit(1)
  const { accent } = usePalette()
  const type = CINE_TYPE[theme]
  const keyword = g.text.replace(/^comenta\s+/i, '').replace(/["“”']/g, '').toUpperCase()
  const size = Math.round((keyword.length <= 8 ? 200 : keyword.length <= 12 ? 160 : keyword.length <= 18 ? 120 : 96) * type.displayScale)

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
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: '0 60px', textAlign: 'center' }}>
        <div style={focusIn(ease(frame, 4, 14), { blur: 6, scale: 1 })}>
          <CineLabel text="Comenta" size={40} spacing={0.6} />
        </div>
        <div style={focusIn(ease(frame, 8, 18), { scale: 1.06 })}>
          <CineText text={keyword} size={size} family={type.display} worn={theme === 'offroad'} />
        </div>
        <AccentLine t={ease(frame, 16, 14)} width={200} color={accent} align="center" />
        {g.subtext ? (
          <div style={focusIn(ease(frame, 20, 14), { blur: 6, scale: 1 })}>
            <span style={{ fontFamily: FONT_UI, fontWeight: 600, fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>{g.subtext}</span>
          </div>
        ) : null}
        <div style={{ marginTop: 60, opacity: ease(frame, 26, 14) }}>
          <Img src={staticFile(brand.logoSrc)} style={{ width: 300, display: 'block', filter: 'brightness(0) invert(1)' }} />
        </div>
        <div style={{ opacity: ease(frame, 30, 14) }}>
          <CineLabel text="Cuenca · Ecuador" size={26} spacing={0.5} color="rgba(255,255,255,0.6)" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/** Invitación a interactuar, discreta: cápsula translúcida con ícono fino; aparece y se va con un fundido. */
export const CineSticker: React.FC<Props> = ({ g }) => {
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
