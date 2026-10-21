/**
 * Gráficos del diseño "camioneta" (tema offroad). Cada tipo del catálogo tiene su versión aquí; el
 * plan de Gemini es el mismo, solo cambia cómo se dibuja (Reel.tsx elige según el tema).
 *
 * Movimiento sobrio, como la referencia: todo entra limpio (sube un poco y aparece en ~0.25 s) y se
 * queda quieto. Nada de rebotes, sacudidas ni escalas exageradas: eso le quita lo robusto.
 */
import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from 'remotion'
import type { Brand, TimelineGraphic } from '../../plan/types'
import { zoomProgress, zoomTransform } from '../../reel/zoom'
import { formatSpecNumber } from '../../theme'
import { clamp, splitEmphasis, useEnterExit } from '../anim'
import { CornerFrame, FONT_CAPTION, FONT_LABEL, MudSplatter, OFFROAD, RustyText, Tag, TreadBackground } from './kit'

const captionShadow = '0 5px 0 rgba(0,0,0,0.35), 0 8px 22px rgba(0,0,0,0.8)'
const graphicNumber = (g: TimelineGraphic) => Number(g.id.match(/\d+/)?.[0] ?? 1)

/** Entrada sobria: 0 → 1 en `dur` cuadros, frenando al final, sin pasarse. */
function reveal(frame: number, delay: number, dur = 8): number {
  return interpolate(frame - delay, [0, dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
}

/** Estilo común de entrada: aparece subiendo un poco. */
const rise = (t: number, distance = 26): React.CSSProperties => ({ opacity: t, transform: `translateY(${(1 - t) * distance}px)` })

/** Gancho: barro en los bordes, la pregunta completa (clave en naranja) y el adjetivo rústico encima. */
export const OffroadHook: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, width, height, exit } = useEnterExit(10)
  const words = splitEmphasis(g.text)
  const big = g.subtext?.trim()

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)' }} />
      <MudSplatter frame={frame} width={width} height={height} fade={exit} />
      {big ? (
        <div style={{ position: 'absolute', top: height * 0.2, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...rise(reveal(frame, 16, 9), 30) }}>
          <RustyText text={big} size={big.length > 9 ? 116 : 156} />
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: height * 0.6,
          left: 60,
          right: 60,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 22px',
          ...rise(reveal(frame, 0, 7)),
        }}
      >
        {words.map(({ word, strong }, i) => (
          <span key={i} style={{ fontFamily: FONT_CAPTION, fontSize: 100, lineHeight: 1.05, textTransform: 'uppercase', color: strong ? OFFROAD.accent : '#fff', textShadow: captionShadow }}>
            {word}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/** Presentación: marca en blanco, modelo rústico grande y la versión/año debajo, entrando en ese orden. */
export const OffroadTitle: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, height, exit } = useEnterExit(10)
  const model = g.text
  const size = model.length <= 6 ? 190 : model.length <= 8 ? 150 : model.length <= 10 ? 120 : 100

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 45%)' }} />
      <div style={{ position: 'absolute', top: height * 0.09, left: 70, right: 70 }}>
        {g.subtext ? (
          <div style={{ fontFamily: FONT_LABEL, fontWeight: 900, fontSize: 40, letterSpacing: 10, color: '#fff', textTransform: 'uppercase', textShadow: captionShadow, marginBottom: 14, ...rise(reveal(frame, 0, 7), 16) }}>
            {g.subtext}
          </div>
        ) : null}
        <div style={rise(reveal(frame, 3, 9), 34)}>
          <RustyText text={model} size={size} />
        </div>
        {g.badge ? (
          <div style={{ marginTop: 26, ...rise(reveal(frame, 11, 8)) }}>
            <RustyText text={g.badge} size={Math.round(size * 0.55)} />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

const PEOPLE = /ocupante|pasajer|persona|asiento/i

const Person: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="6.5" r="4" fill={OFFROAD.accent} />
    <path d="M4 22v-3c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5v3z" fill={OFFROAD.accent} />
  </svg>
)

/** Dato héroe: número rústico grande que cuenta, la palabra debajo y, si son ocupantes, una fila de personas. */
export const OffroadCounter: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, height, exit } = useEnterExit(10)
  const value = g.value ?? 0
  const decimals = Number.isInteger(value) ? 0 : 1
  const countEnd = Math.round(fps * 0.6)
  const count = interpolate(frame, [0, countEnd], [0, value], { ...clamp, easing: Easing.out(Easing.cubic) })
  // Unidad corta ("L", "KG", "HP") va pegada al número; una palabra ("DIÉSEL", "OCUPANTES") va debajo.
  const shortUnit = g.unit && g.unit.length <= 3 ? ` ${g.unit}` : ''
  const word = g.unit && g.unit.length > 3 ? g.unit : (g.subtext ?? g.text)
  const number = `${g.prefix ?? ''}${formatSpecNumber(count, decimals)}${shortUnit}`
  const finalLength = `${g.prefix ?? ''}${formatSpecNumber(value, decimals)}${shortUnit}`.length
  const people = PEOPLE.test(`${g.unit ?? ''} ${g.text} ${g.subtext ?? ''}`) && value >= 1 && value <= 9 ? Math.round(value) : 0
  const right = graphicNumber(g) % 2 === 1
  const low = g.placement === 'abajo'

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: `linear-gradient(${low ? 0 : 180}deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%)` }} />
      <div
        style={{
          position: 'absolute',
          top: low ? height * 0.58 : height * 0.09,
          left: 70,
          right: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: right ? 'flex-end' : 'flex-start',
        }}
      >
        <div style={rise(reveal(frame, 0, 8), 34)}>
          <RustyText text={number} size={finalLength <= 4 ? 230 : finalLength <= 7 ? 170 : 120} />
        </div>
        {word ? (
          <div style={{ marginTop: 14, ...rise(reveal(frame, 8, 8)) }}>
            <RustyText text={word} size={word.length <= 8 ? 96 : 70} />
          </div>
        ) : null}
        {people ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {Array.from({ length: people }, (_, i) => (
              <div key={i} style={{ opacity: reveal(frame, 12 + i * 2, 6), filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }}>
                <Person size={78} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

/** Característica señalada: esquinas naranjas sobre el objeto (el clip ya hizo zoom) y etiqueta tipo escáner. */
export const OffroadCallout: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, durationInFrames, width, height, exit } = useEnterExit(8)
  const z = g.zoom ? zoomTransform(g.zoom, zoomProgress(frame, durationInFrames, fps), frame / durationInFrames) : null
  const label = `K-SI SCAN · ${String(graphicNumber(g)).padStart(2, '0')}`
  const box = z ? { x: z.point.x, y: z.point.y, w: Math.max(240, z.radius * 2.3), h: Math.max(220, z.radius * 2.1) } : null
  // Del lado que eligió la línea de tiempo (cardAtTop): los subtítulos van al lado contrario.
  const above = g.cardAtTop ?? true
  const tagTop = box
    ? above
      ? Math.max(height * 0.08, box.y - box.h / 2 - 170)
      : Math.min(height * 0.8, box.y + box.h / 2 + 46)
    : above
      ? height * 0.12
      : height * 0.6
  const tagCenter = box ? Math.min(Math.max(box.x, 330), width - 330) : width / 2

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      {box ? <CornerFrame x={box.x} y={box.y} w={box.w} h={box.h} progress={reveal(frame, 4, 9)} /> : null}
      <div style={{ position: 'absolute', top: tagTop, left: tagCenter, transform: 'translateX(-50%)' }}>
        <Tag text={g.text} label={label} progress={reveal(frame, 8, 10)} size={46} />
      </div>
    </AbsoluteFill>
  )
}

/** Listas y fichas: etiquetas que aparecen una tras otra, escalonadas ("EQUIPOS", "HERRAMIENTAS", "CARGA"). */
export const OffroadList: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, durationInFrames, height, exit } = useEnterExit(8)
  const items = (g.items ?? []).slice(0, 5)
  const per = Math.max(6, Math.min(14, Math.floor((durationInFrames * 0.5) / Math.max(1, items.length))))

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 55%)' }} />
      <div style={{ position: 'absolute', top: height * 0.1, left: 80, right: 80, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 40 }}>
        {g.type === 'feature_list' && g.text ? (
          <div style={{ fontFamily: FONT_CAPTION, fontSize: 70, color: '#fff', textTransform: 'uppercase', textShadow: captionShadow, ...rise(reveal(frame, 0, 7), 16) }}>{g.text}</div>
        ) : null}
        {items.map((item, i) => (
          <Tag key={i} text={item} progress={reveal(frame, 6 + i * per, 10)} size={48} style={{ marginLeft: i % 2 ? 110 : 0 }} />
        ))}
      </div>
    </AbsoluteFill>
  )
}

/** Cierre: "COMENTA" rústico + caja de comentario que se escribe sola; al final, firma con huella de llanta. */
export const OffroadCta: React.FC<{ g: TimelineGraphic; brand: Brand }> = ({ g, brand }) => {
  const { frame, durationInFrames, width, height } = useEnterExit(1)
  const keyword = g.text.replace(/^comenta\s+/i, '').replace(/["“”']/g, '').toUpperCase()
  const endFrames = Math.min(60, Math.round(durationInFrames * 0.4))
  const endAt = durationInFrames - endFrames

  if (frame >= endAt) {
    const local = frame - endAt
    return (
      <AbsoluteFill style={{ opacity: reveal(local, 0, 6) }}>
        <TreadBackground frame={frame} width={width} height={height} />
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <Tag text="K-SI NUEVOS" progress={reveal(local, 2, 12)} size={88} />
          <div style={{ fontFamily: FONT_LABEL, fontWeight: 900, fontSize: 44, letterSpacing: 12, color: OFFROAD.accent, ...rise(reveal(local, 10, 8), 16) }}>CUENCA · ECUADOR</div>
          <div style={{ fontFamily: FONT_LABEL, fontWeight: 900, fontSize: 48, letterSpacing: 2, color: '#fff', ...rise(reveal(local, 14, 8), 16) }}>COMENTA “{keyword}”</div>
          <div style={{ marginTop: 30, background: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: '12px 20px', ...rise(reveal(local, 18, 8), 16) }}>
            <Img src={staticFile(brand.logoSrc)} style={{ width: 230, display: 'block' }} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    )
  }

  const typed = keyword.slice(0, Math.max(0, Math.floor((frame - 14) / 2.5)))
  const cursorOn = Math.floor(frame / 8) % 2 === 0

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)' }} />
      <div style={{ position: 'absolute', top: height * 0.08, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 46 }}>
        <div style={rise(reveal(frame, 0, 8), 34)}>
          <RustyText text="COMENTA" size={150} />
        </div>
        <div
          style={{
            width: 860,
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            background: '#fff',
            borderRadius: 28,
            padding: '22px 30px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            ...rise(reveal(frame, 6, 8), 40),
          }}
        >
          <div style={{ width: 92, height: 92, borderRadius: 999, background: OFFROAD.accent, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width={56} height={56} viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" fill="#fff" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" fill="#fff" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={{ fontFamily: FONT_LABEL, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: '#9A9A9A' }}>TU COMENTARIO</span>
            <span style={{ fontFamily: FONT_LABEL, fontWeight: 900, fontSize: keyword.length > 18 ? 44 : 58, lineHeight: 1.05, color: '#141414', whiteSpace: 'nowrap' }}>
              {typed}
              <span style={{ display: 'inline-block', width: 6, height: 54, marginLeft: 4, verticalAlign: 'middle', background: OFFROAD.accent, opacity: cursorOn ? 1 : 0 }} />
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
