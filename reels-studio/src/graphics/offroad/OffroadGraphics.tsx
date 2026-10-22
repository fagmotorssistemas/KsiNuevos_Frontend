/**
 * Gráficos del diseño "camioneta" (tema offroad). Cada tipo del catálogo tiene su versión aquí; el
 * plan del director es el mismo, solo cambia cómo se dibuja (Reel.tsx elige según el tema).
 *
 * Los títulos son metal naranja oxidado en 3D de verdad (three.js) y se arman letra por letra: caen y se asientan,
 * o se levantan al paso de una llanta 3D que cruza la pantalla. Las etiquetas del escáner entran girando en
 * perspectiva y los objetos chicos se marcan con un escáner holográfico 3D.
 */
import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from 'remotion'
import type { Brand, TimelineGraphic } from '../../plan/types'
import { zoomProgress, zoomTransform } from '../../reel/zoom'
import { formatSpecNumber } from '../../theme'
import { Letters3D, measureLetters, staggered } from '../../three/Letters3D'
import { ScanRing3D } from '../../three/ScanRing3D'
import { Stage3D, toScene, UNITS_PER_PX } from '../../three/Stage3D'
import { Tire3D } from '../../three/Tire3D'
import { clamp, splitEmphasis, useEnterExit } from '../anim'
import { CornerFrame, FONT_CAPTION, FONT_LABEL, Hazard, OFFROAD, Tag, TreadBackground } from './kit'

/** Tipografía de los títulos 3D de camioneta (la misma Russo One del título rústico de la referencia). */
const FONT_3D = 'russo' as const

const graphicNumber = (g: TimelineGraphic) => Number(g.id.match(/\d+/)?.[0] ?? 1)

/** Entrada sobria: 0 → 1 en `dur` cuadros, frenando al final, sin pasarse. */
function reveal(frame: number, delay: number, dur = 8): number {
  return interpolate(frame - delay, [0, dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
}

/** Estilo común de entrada: aparece subiendo un poco. */
const rise = (t: number, distance = 26): React.CSSProperties => ({ opacity: t, transform: `translateY(${(1 - t) * distance}px)` })

/** Etiqueta que entra girando sobre su borde de arriba, como un cartel que cae y queda colgado. */
const swing = (t: number): React.CSSProperties => ({
  transformOrigin: '50% 0%',
  transform: `perspective(900px) rotateX(${(-82 * (1 - Easing.out(Easing.back(1.4))(t))).toFixed(2)}deg)`,
})

/** Alto de mayúscula en px de un texto 3D de tamaño `size` (para ubicar lo que va debajo). */
const capPx = (text: string, size: number, maxWidthPx = Infinity) => measureLetters(text, FONT_3D, size, maxWidthPx * UNITS_PER_PX).cap / UNITS_PER_PX

/** Luz que recorre el metal de izquierda a derecha durante el gráfico. */
const sweepAt = (frame: number, durationInFrames: number, sceneY: number): [number, number] => [interpolate(frame, [0, durationInFrames], [-6, 6]), sceneY + 1.2]

/** Llanta que entra rodando desde un costado y frena en (x, y); después gira como en un exhibidor. */
const ParkedTire: React.FC<{ frame: number; delay: number; fromRight: boolean; x: number; y: number; r: number; width: number; height: number }> = ({
  frame,
  delay,
  fromRight,
  x,
  y,
  r,
  width,
  height,
}) => {
  const roll = interpolate(frame - delay, [0, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const startX = fromRight ? width + r + 40 : -r - 40
  const cx = interpolate(roll, [0, 1], [startX, x])
  const [sx, sy] = toScene(cx, y, width, height)
  const settled = Math.max(0, frame - delay - 18) / 30
  return (
    <Tire3D
      radius={r * UNITS_PER_PX}
      angle={((cx - startX) / r) * (fromRight ? -1 : 1)}
      position={[sx, sy, 0.6]}
      rotation={[0.08, (fromRight ? 0.45 : -0.45) + Math.sin(settled * 1.6) * 0.25, 0]}
    />
  )
}

/** Gancho: la pregunta completa (clave en naranja) y, encima, el adjetivo en metal 3D que cae letra por letra. */
export const OffroadHook: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, durationInFrames, width, height, exit } = useEnterExit(10)
  const words = splitEmphasis(g.text)
  const big = g.subtext?.trim()
  const bigY = height * 0.2 + capPx(big ?? 'H', 0.95, 960) / 2
  const [, bigSceneY] = toScene(0, bigY, width, height)

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)' }} />
      {big ? (
        <Stage3D sweep={sweepAt(frame, durationInFrames, bigSceneY)}>
          <group position={[0, bigSceneY, 0]} rotation={[0.06, Math.sin(frame / 40) * 0.08, 0]}>
            <Letters3D text={big} font={FONT_3D} finish="rust" entrance="drop" progress={staggered(frame, 10, 2, 13, big)} size={0.95} maxWidth={960 * UNITS_PER_PX} />
          </group>
        </Stage3D>
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
          <span key={i} style={{ fontFamily: FONT_CAPTION, fontSize: 100, lineHeight: 1.05, textTransform: 'uppercase', color: strong ? OFFROAD.accent : '#fff' }}>
            {word}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/**
 * Presentación: marca en blanco y el modelo en metal 3D. Una llanta 3D cruza rodando por delante de las letras y
 * cada letra se levanta a su paso; después cae la versión/año.
 */
export const OffroadTitle: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, durationInFrames, width, height, exit } = useEnterExit(10)
  const top = height * 0.09
  const modelSize = 1.1
  const modelCap = capPx(g.text, modelSize, 960)
  const modelY = top + (g.subtext ? 70 : 0) + modelCap / 2
  const [, modelSceneY] = toScene(0, modelY, width, height)
  const badgeY = modelY + modelCap / 2 + 40 + capPx(g.badge ?? 'H', 0.6, 900) / 2
  const [, badgeSceneY] = toScene(0, badgeY, width, height)

  // La llanta rueda a velocidad constante de izquierda a derecha; cada letra se levanta cuando la llanta la pasa.
  const r = Math.max(110, modelCap * 0.72)
  const startPx = -r - 40
  const endPx = width + r + 40
  const rollFrames = 26
  const speed = (endPx - startPx) / rollFrames
  const tireDelay = 2
  const tirePx = startPx + speed * (frame - tireDelay)
  const [tireSceneX] = toScene(tirePx, 0, width, height)
  const tireVisible = frame >= tireDelay && tirePx < endPx
  const letter = (_: number, x: number) => {
    // `x` es el centro de la letra en escena: se levanta en los 8 cuadros siguientes a que la llanta la cruza.
    const passPx = x / UNITS_PER_PX + width / 2
    const passFrame = tireDelay + (passPx - startPx) / speed
    return (frame - passFrame) / 8
  }
  const badgeDelay = tireDelay + rollFrames - 6

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)' }} />
      {g.subtext ? (
        <div style={{ position: 'absolute', top, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_LABEL, fontWeight: 900, fontSize: 40, letterSpacing: 10, color: '#fff', textTransform: 'uppercase', ...rise(reveal(frame, 0, 7), 16) }}>
          {g.subtext}
        </div>
      ) : null}
      <Stage3D sweep={sweepAt(frame, durationInFrames, modelSceneY)}>
        <group position={[0, modelSceneY, 0]} rotation={[0.05, Math.sin(frame / 45) * 0.07, 0]}>
          <Letters3D text={g.text} font={FONT_3D} finish="rust" entrance="flip" progress={letter} size={modelSize} maxWidth={960 * UNITS_PER_PX} />
        </group>
        {g.badge ? (
          <group position={[0, badgeSceneY, 0]}>
            <Letters3D text={g.badge} font={FONT_3D} finish="rust" entrance="flip" progress={staggered(frame, badgeDelay, 2, 10, g.badge)} size={0.6} maxWidth={900 * UNITS_PER_PX} />
          </group>
        ) : null}
        {tireVisible ? (
          <Tire3D radius={r * UNITS_PER_PX} angle={(tirePx - startPx) / r} position={[tireSceneX, modelSceneY - (modelCap * 0.12) * UNITS_PER_PX, 0.9]} rotation={[0.06, -0.38, 0]} />
        ) : null}
      </Stage3D>
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

/** Datos de tracción o de llantas: llevan una llanta 3D al lado de la cifra. */
const TRACTION = /4x4|4wd|awd|tracci|llanta|neum|\baros?\b|\brin(es)?\b|todo ?terreno|off ?road/i

/**
 * Dato héroe: cifra de metal 3D que cuenta mientras sus dígitos caen, la palabra debajo y, si son ocupantes, una
 * fila de personas. Si el dato es de tracción o de llantas, entra rodando una llanta 3D del otro lado.
 */
export const OffroadCounter: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, durationInFrames, width, height, exit } = useEnterExit(10)
  const value = g.value ?? 0
  const decimals = Number.isInteger(value) ? 0 : 1
  const countEnd = Math.round(fps * 0.6)
  const count = interpolate(frame, [0, countEnd], [0, value], { ...clamp, easing: Easing.out(Easing.cubic) })
  // Unidad corta ("L", "KG", "HP") va pegada al número; una palabra ("DIÉSEL", "OCUPANTES") va debajo.
  // "X4" va pegado (4X4); el resto lleva un espacio.
  const shortUnit = g.unit && g.unit.length <= 3 ? `${/^x\d/i.test(g.unit) ? '' : ' '}${g.unit}` : ''
  const word = g.unit && g.unit.length > 3 ? g.unit : (g.subtext ?? g.text)
  const number = `${g.prefix ?? ''}${formatSpecNumber(count, decimals)}${shortUnit}`
  const final = `${g.prefix ?? ''}${formatSpecNumber(value, decimals)}${shortUnit}`
  const people = PEOPLE.test(`${g.unit ?? ''} ${g.text} ${g.subtext ?? ''}`) && value >= 1 && value <= 9 ? Math.round(value) : 0
  const tire = TRACTION.test(`${g.unit ?? ''} ${g.text} ${g.subtext ?? ''} ${g.prefix ?? ''}`)
  const right = graphicNumber(g) % 2 === 1
  const low = g.placement === 'abajo'

  const tireR = 150
  const maxPx = tire ? width - 140 - tireR * 2 - 40 : width - 140
  // El tamaño sale de la cifra final, así no cambia mientras cuenta.
  const base = final.length <= 4 ? 1.3 : final.length <= 7 ? 1.05 : 0.8
  const numberSize = base * Math.min(1, (maxPx * UNITS_PER_PX) / measureLetters(final, FONT_3D, base).width)
  const numberCap = capPx(final, numberSize)
  const wordSize = word && word.length <= 8 ? 0.62 : 0.46
  const wordCap = word ? capPx(word, wordSize, maxPx) : 0
  const top = low ? height * 0.58 : height * 0.09
  const numberY = top + numberCap / 2
  const wordY = top + numberCap + 34 + wordCap / 2
  const edgeX = right ? width - 70 : 70
  const [edgeSceneX, numberSceneY] = toScene(edgeX, numberY, width, height)
  const [, wordSceneY] = toScene(0, wordY, width, height)
  const align = right ? 'right' : 'left'

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <AbsoluteFill style={{ background: `linear-gradient(${low ? 0 : 180}deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%)` }} />
      <Stage3D sweep={sweepAt(frame, durationInFrames, numberSceneY)}>
        <group position={[edgeSceneX, numberSceneY, 0]} rotation={[0.05, (right ? -1 : 1) * (0.12 + Math.sin(frame / 40) * 0.05), 0]}>
          <Letters3D text={number} font={FONT_3D} finish="rust" entrance="drop" progress={() => frame / 12} size={numberSize} align={align} />
        </group>
        {word ? (
          <group position={[edgeSceneX, wordSceneY, 0]}>
            <Letters3D text={word} font={FONT_3D} finish="rust" entrance="flip" progress={staggered(frame, 8, 2, 10, word)} size={wordSize} maxWidth={maxPx * UNITS_PER_PX} align={align} />
          </group>
        ) : null}
        {tire ? <ParkedTire frame={frame} delay={4} fromRight={!right} x={right ? 70 + tireR : width - 70 - tireR} y={numberY + 20} r={tireR} width={width} height={height} /> : null}
      </Stage3D>
      {people ? (
        <div style={{ position: 'absolute', top: top + numberCap + 34 + wordCap + 28, left: 70, right: 70, display: 'flex', gap: 8, justifyContent: right ? 'flex-end' : 'flex-start' }}>
          {Array.from({ length: people }, (_, i) => (
            <div key={i} style={{ opacity: reveal(frame, 14 + i * 2, 6), transform: `translateY(${(1 - reveal(frame, 14 + i * 2, 6)) * -30}px)` }}>
              <Person size={78} />
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

/**
 * Característica señalada (el clip ya hizo zoom): un objeto chico (botón, palanca) lleva el escáner holográfico 3D;
 * uno grande (pantalla, tablero) lleva esquinas naranjas y una línea de escaneo que lo recorre. Arriba o abajo, la
 * etiqueta tipo escáner entra girando.
 */
export const OffroadCallout: React.FC<{ g: TimelineGraphic }> = ({ g }) => {
  const { frame, fps, durationInFrames, width, height, exit } = useEnterExit(8)
  const z = g.zoom ? zoomTransform(g.zoom, zoomProgress(frame, durationInFrames, fps), frame / durationInFrames) : null
  const label = `${String(graphicNumber(g)).padStart(2, '0')} K-SI SCAN`
  const box = z ? { x: z.point.x, y: z.point.y, w: Math.max(240, z.radius * 2.3), h: Math.max(220, z.radius * 2.1) } : null
  // Objeto chico en el cuadro original (botón, palanca): anillo que gira; grande (pantalla, tablero): esquinas.
  const small = g.sourceFocus ? Math.max(g.sourceFocus.w, g.sourceFocus.h) < 0.2 : false
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
      {box && z && small ? <ScanRing3D x={box.x} y={box.y} r={Math.min(230, Math.max(90, z.radius * 1.1))} progress={reveal(frame, 4, 12)} /> : null}
      {box && !small ? <CornerFrame x={box.x} y={box.y} w={box.w} h={box.h} progress={reveal(frame, 4, 9)} /> : null}
      {box && !small ? <ScanLine x={box.x} y={box.y} w={box.w} h={box.h} progress={interpolate(frame, [8, 30], [0, 1], clamp)} /> : null}
      <div style={{ position: 'absolute', top: tagTop, left: tagCenter, transform: 'translateX(-50%)' }}>
        <div style={swing(reveal(frame, 8, 12))}>
          <Tag text={g.text} label={label} progress={reveal(frame, 8, 10)} size={46} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** Línea de escaneo naranja que baja una vez por el recuadro, dejando un brillo detrás. */
const ScanLine: React.FC<{ x: number; y: number; w: number; h: number; progress: number }> = ({ x, y, w, h, progress }) => {
  if (progress <= 0 || progress >= 1) return null
  const lineY = y - h / 2 + h * progress
  const fade = interpolate(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0], clamp)
  return (
    <div style={{ position: 'absolute', left: x - w / 2, width: w, top: y - h / 2, height: h, overflow: 'hidden', opacity: fade, mixBlendMode: 'screen' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: lineY - (y - h / 2) - 90, height: 90, background: `linear-gradient(180deg, rgba(242,122,26,0) 0%, rgba(242,122,26,0.35) 100%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: lineY - (y - h / 2) - 2, height: 4, background: '#FFB066', boxShadow: `0 0 18px 4px ${OFFROAD.accent}` }} />
    </div>
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
          <div style={{ fontFamily: FONT_CAPTION, fontSize: 70, color: '#fff', textTransform: 'uppercase', ...rise(reveal(frame, 0, 7), 16) }}>{g.text}</div>
        ) : null}
        {items.map((item, i) => (
          <div key={i} style={{ marginLeft: i % 2 ? 110 : 0, ...swing(reveal(frame, 6 + i * per, 12)) }}>
            <Tag text={item} progress={reveal(frame, 6 + i * per, 10)} size={48} hazard={g.type === 'spec_chips'} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/**
 * Cierre: "COMENTA" en metal 3D que cae letra por letra y una caja de comentario que se escribe sola. Al final, la
 * placa de K-SI: una llanta 3D entra rodando y se queda girando, y "K-SI NUEVOS" cae debajo.
 */
export const OffroadCta: React.FC<{ g: TimelineGraphic; brand: Brand }> = ({ g, brand }) => {
  const { frame, durationInFrames, width, height } = useEnterExit(1)
  const keyword = g.text.replace(/^comenta\s+/i, '').replace(/["“”']/g, '').toUpperCase()
  const endFrames = Math.min(66, Math.round(durationInFrames * 0.45))
  const endAt = durationInFrames - endFrames

  if (frame >= endAt) {
    const local = frame - endAt
    const tireY = height * 0.27
    const nameY = height * 0.47
    const [, nameSceneY] = toScene(0, nameY, width, height)
    return (
      <AbsoluteFill style={{ opacity: reveal(local, 0, 6) }}>
        <TreadBackground frame={frame} width={width} height={height} />
        <Stage3D sweep={sweepAt(local, endFrames, nameSceneY)}>
          <ParkedTire frame={local} delay={0} fromRight={false} x={width / 2} y={tireY} r={200} width={width} height={height} />
          <group position={[0, nameSceneY, 0]}>
            <Letters3D text="K-SI NUEVOS" font={FONT_3D} finish="rust" entrance="drop" progress={staggered(local, 12, 2, 12, 'K-SI NUEVOS')} size={0.8} maxWidth={900 * UNITS_PER_PX} />
          </group>
        </Stage3D>
        <div style={{ position: 'absolute', top: nameY + 90, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
          <div style={{ width: 560 }}>
            <Hazard progress={reveal(local, 26, 12)} height={26} />
          </div>
          <div style={{ fontFamily: FONT_LABEL, fontWeight: 900, fontSize: 44, letterSpacing: 12, color: OFFROAD.accent, ...rise(reveal(local, 30, 8), 16) }}>CUENCA · ECUADOR</div>
          <div style={{ fontFamily: FONT_LABEL, fontWeight: 900, fontSize: 48, letterSpacing: 2, color: '#fff', ...rise(reveal(local, 34, 8), 16) }}>COMENTA “{keyword}”</div>
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: '12px 20px', ...rise(reveal(local, 38, 8), 16) }}>
            <Img src={staticFile(brand.logoSrc)} style={{ width: 230, display: 'block' }} />
          </div>
        </div>
      </AbsoluteFill>
    )
  }

  const typed = keyword.slice(0, Math.max(0, Math.floor((frame - 16) / 2.5)))
  const cursorOn = Math.floor(frame / 8) % 2 === 0
  const top = height * 0.08
  const titleCap = capPx('COMENTA', 1.05, 900)
  const [, titleSceneY] = toScene(0, top + titleCap / 2, width, height)

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)' }} />
      <Stage3D sweep={sweepAt(frame, endAt, titleSceneY)}>
        <group position={[0, titleSceneY, 0]} rotation={[0.05, Math.sin(frame / 40) * 0.08, 0]}>
          <Letters3D text="COMENTA" font={FONT_3D} finish="rust" entrance="drop" progress={staggered(frame, 0, 2, 13)} size={1.05} maxWidth={900 * UNITS_PER_PX} />
        </group>
      </Stage3D>
      <div style={{ position: 'absolute', top: top + titleCap + 60, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
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
            ...rise(reveal(frame, 10, 8), 40),
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
