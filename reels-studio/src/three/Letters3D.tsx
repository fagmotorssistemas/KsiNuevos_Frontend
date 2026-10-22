/**
 * Letras 3D sueltas (three.js): cada letra es su propia pieza extruida, así el título se arma letra por letra
 * (caen y se asientan, se levantan al paso de una llanta o llegan desde el fondo). Dos acabados:
 * - "rust": metal naranja con degradado de sol y manchas de óxido (camionetas, como la referencia de la Ranger).
 * - "chrome": cromo blanco con cantos oscuros (el resto de los autos).
 * - "champagne": cromo pulido con cantos dorados champán (SUV, diseño elegante).
 *
 * Las geometrías se guardan por letra: una cifra que cuenta (0 → 2.500) reutiliza los mismos diez dígitos.
 */
import React, { useMemo } from 'react'
import { Easing, random } from 'remotion'
import * as THREE from 'three'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FONTS, type FontKey } from './Text3D'

export type Finish = 'rust' | 'chrome' | 'champagne'
/**
 * drop: cae desde arriba girando y rebota apenas · flip: estaba acostada y se levanta · depth: llega desde el fondo ·
 * rise: sube despacio desde abajo inclinada hacia la cámara y se endereza (la más elegante, sin rebote).
 */
export type Entrance = 'drop' | 'flip' | 'depth' | 'rise'

const DEPTH_RATIO = 0.34

type Glyph = { geometry: THREE.BufferGeometry | null; advance: number; minX: number; maxX: number }

const glyphCache = new Map<string, Glyph>()
const capCache = new Map<string, number>()

/** Degradado del acabado oxidado, de abajo hacia arriba (el mismo del título 2D de la referencia). */
const RUST_STOPS: [number, THREE.Color][] = [
  [0, new THREE.Color('#A9420A')],
  [0.34, new THREE.Color('#F06F12')],
  [0.66, new THREE.Color('#FFA23A')],
  [1, new THREE.Color('#FFD592')],
]

function rustColor(t: number, out: THREE.Color): THREE.Color {
  const k = Math.min(1, Math.max(0, t))
  for (let i = 1; i < RUST_STOPS.length; i++) {
    const [p1, c1] = RUST_STOPS[i]
    const [p0, c0] = RUST_STOPS[i - 1]
    if (k <= p1) return out.copy(c0).lerp(c1, (k - p0) / (p1 - p0))
  }
  return out.copy(RUST_STOPS[RUST_STOPS.length - 1][1])
}

/** Letra que la fuente no tiene: se intenta sin tilde; si tampoco existe, se deja como espacio. */
function resolveChar(font: FontKey, ch: string): string | null {
  const glyphs = FONTS[font].data.glyphs
  if (glyphs[ch]) return ch
  const plain = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (plain && glyphs[plain]) return plain
  if (ch === '·' && glyphs['-']) return '-'
  return null
}

function capHeight(font: FontKey, size: number): number {
  const key = `${font}|${size}`
  let cap = capCache.get(key)
  if (cap === undefined) {
    const g = new TextGeometry('H', { font: FONTS[font], size, depth: 0.01, curveSegments: 2 })
    g.computeBoundingBox()
    cap = g.boundingBox!.max.y
    g.dispose()
    capCache.set(key, cap)
  }
  return cap
}

function glyph(font: FontKey, size: number, ch: string): Glyph {
  const key = `${font}|${size}|${ch}`
  const cached = glyphCache.get(key)
  if (cached) return cached
  const data = FONTS[font].data
  const scale = size / data.resolution
  const real = ch === ' ' ? null : resolveChar(font, ch)
  let result: Glyph
  if (!real) {
    const ha = data.glyphs[' ']?.ha ?? data.resolution * 0.3
    result = { geometry: null, advance: ha * scale, minX: 0, maxX: 0 }
  } else {
    const depth = size * DEPTH_RATIO
    const g = new TextGeometry(real, {
      font: FONTS[font],
      size,
      depth,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: depth * 0.16,
      bevelSize: size * 0.022,
      bevelSegments: 3,
    })
    g.computeBoundingBox()
    // Colores por vértice para el degradado oxidado (el cromo los ignora).
    const cap = capHeight(font, size)
    const pos = g.getAttribute('position')
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      rustColor(pos.getY(i) / cap, c)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const bb = g.boundingBox!
    result = { geometry: g, advance: data.glyphs[real].ha * scale, minX: bb.min.x, maxX: bb.max.x }
  }
  glyphCache.set(key, result)
  return result
}

/** Textura de óxido: puntos y rayones café sobre blanco (se multiplica por el color de la letra). */
let grungeTexture: THREE.CanvasTexture | null = null
function grunge(): THREE.CanvasTexture {
  if (grungeTexture) return grungeTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 1400; i++) {
    const r = (k: string) => random(`grunge-${i}-${k}`)
    ctx.fillStyle = `rgba(${70 + r('c') * 40}, ${26 + r('c') * 20}, 6, ${0.12 + r('a') * 0.5})`
    ctx.beginPath()
    ctx.arc(r('x') * size, r('y') * size, 0.4 + r('s') ** 3 * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  // Rayones finos horizontales (desgaste del metal).
  for (let i = 0; i < 26; i++) {
    const r = (k: string) => random(`scratch-${i}-${k}`)
    ctx.strokeStyle = `rgba(90, 36, 8, ${0.15 + r('a') * 0.3})`
    ctx.lineWidth = 0.6 + r('w') * 1.2
    const y = r('y') * size
    ctx.beginPath()
    ctx.moveTo(r('x') * size, y)
    ctx.lineTo(r('x') * size + 30 + r('l') * 80, y + (r('d') - 0.5) * 6)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1.4, 1.4)
  tex.colorSpace = THREE.SRGBColorSpace
  grungeTexture = tex
  return tex
}

const materialCache = new Map<Finish, THREE.Material[]>()
function materials(finish: Finish): THREE.Material[] {
  const cached = materialCache.get(finish)
  if (cached) return cached
  const made =
    finish === 'rust'
      ? [
          new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, map: grunge(), metalness: 0.5, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
          new THREE.MeshStandardMaterial({ color: '#6B2C07', map: grunge(), metalness: 0.45, roughness: 0.55 }),
        ]
      : finish === 'champagne'
        ? [
            new THREE.MeshPhysicalMaterial({ color: '#F6F2EA', metalness: 0.85, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 }),
            new THREE.MeshStandardMaterial({ color: '#B08A4E', metalness: 0.9, roughness: 0.26 }),
          ]
        : [
            new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', metalness: 0.78, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 }),
            new THREE.MeshStandardMaterial({ color: '#2A2A30', metalness: 0.35, roughness: 0.4 }),
          ]
  materialCache.set(finish, made)
  return made
}

type Layout = { glyphs: (Glyph & { pen: number; center: number })[]; minX: number; maxX: number; cap: number }

function layout(text: string, font: FontKey, size: number): Layout {
  const tracking = size * 0.04
  let pen = 0
  let minX = Infinity
  let maxX = -Infinity
  const glyphs = [...text].map((ch) => {
    const g = glyph(font, size, ch)
    const placed = { ...g, pen, center: pen + (g.minX + g.maxX) / 2 }
    if (g.geometry) {
      minX = Math.min(minX, pen + g.minX)
      maxX = Math.max(maxX, pen + g.maxX)
    }
    pen += g.advance + tracking
    return placed
  })
  if (minX === Infinity) {
    minX = 0
    maxX = 0
  }
  return { glyphs, minX, maxX, cap: capHeight(font, size) }
}

/** Ancho y alto de mayúscula (en unidades de escena) de un texto, para ubicarlo en la pantalla antes de dibujarlo. */
export function measureLetters(text: string, font: FontKey, size: number, maxWidth = Infinity): { width: number; cap: number } {
  const l = layout(text.toUpperCase(), font, size)
  const width = l.maxX - l.minX
  const fit = width > maxWidth ? maxWidth / width : 1
  return { width: width * fit, cap: l.cap * fit }
}

const backOut = Easing.out(Easing.back(1.7))
const cubicOut = Easing.out(Easing.cubic)

/** Pose de una letra según su avance (0 → 1), el tipo de entrada y su tamaño (las chicas caen de menos alto). */
function pose(entrance: Entrance, p: number, i: number, size: number) {
  const side = i % 2 === 0 ? 1 : -1
  if (entrance === 'drop') {
    const fall = cubicOut(Math.min(1, p / 0.7))
    // Al tocar el suelo se aplasta un poco y recupera la forma.
    const land = p > 0.7 ? Math.sin(((p - 0.7) / 0.3) * Math.PI) : 0
    return {
      position: [0, (1 - fall) * 2.2 * size, (1 - fall) * 1.2 * size] as const,
      rotation: [-(1 - backOut(p)) * 1.5, 0, (1 - fall) * 0.35 * side] as const,
      scale: [1 + land * 0.06, 1 - land * 0.1, 1] as const,
    }
  }
  if (entrance === 'flip') {
    const up = backOut(p)
    return {
      position: [0, 0, 0] as const,
      rotation: [-(1 - up) * (Math.PI / 2), 0, 0] as const,
      scale: [1, Math.max(0.001, Math.min(1, p * 4)), 1] as const,
    }
  }
  if (entrance === 'rise') {
    const up = Easing.out(Easing.poly(4))(p)
    return {
      position: [0, (1 - up) * -0.9 * size, (1 - up) * 0.6 * size] as const,
      rotation: [(1 - up) * 1.1, 0, 0] as const,
      scale: [1, Math.max(0.001, Math.min(1, p * 2.5)), 1] as const,
    }
  }
  const come = cubicOut(p)
  return {
    position: [0, (1 - come) * -0.6, (1 - come) * -9] as const,
    rotation: [0, (1 - come) * -1.1 * side, 0] as const,
    scale: [1, 1, 1] as const,
  }
}

type Props = {
  text: string
  font: FontKey
  finish: Finish
  entrance: Entrance
  /** Avance de cada letra (0 = no llegó, 1 = en su lugar) según su índice y su centro en x (relativo al grupo). */
  progress: (index: number, x: number) => number
  size?: number
  /** Ancho máximo en unidades de escena: si el texto es más largo, se achica. */
  maxWidth?: number
  align?: 'left' | 'center' | 'right'
} & Omit<React.ComponentProps<'group'>, 'children'>

/** Texto 3D con su centro de mayúscula en el origen del grupo (o su borde, según `align`). */
export const Letters3D: React.FC<Props> = ({ text, font, finish, entrance, progress, size = 1, maxWidth = Infinity, align = 'center', ...groupProps }) => {
  const l = useMemo(() => layout(text.toUpperCase(), font, size), [text, font, size])
  const mats = useMemo(() => materials(finish), [finish])
  const width = l.maxX - l.minX
  const fit = width > maxWidth ? maxWidth / width : 1
  const offset = align === 'left' ? -l.minX : align === 'right' ? -l.maxX : -(l.minX + l.maxX) / 2

  return (
    <group {...groupProps}>
      <group scale={fit} position={[0, (-l.cap / 2) * fit, 0]}>
        {l.glyphs.map((g, i) => {
          if (!g.geometry) return null
          const p = Math.min(1, Math.max(0, progress(i, (g.center + offset) * fit)))
          if (p <= 0) return null
          const { position, rotation, scale } = pose(entrance, p, i, size * fit)
          return (
            <group key={i} position={[g.center + offset + position[0], position[1], position[2]]} rotation={[...rotation]} scale={[...scale]}>
              <mesh geometry={g.geometry} material={mats} position={[g.pen - g.center, 0, 0]} />
            </group>
          )
        })}
      </group>
    </group>
  )
}

/**
 * Avance escalonado letra por letra: empieza en `delay` y cada letra sale `stagger` cuadros después de la anterior.
 * Con `text`, el escalón se acorta en palabras largas para que ninguna tarde más de ~10 cuadros en completarse.
 */
export function staggered(frame: number, delay: number, stagger: number, dur: number, text?: string): (i: number) => number {
  const step = text ? Math.min(stagger, 10 / Math.max(1, text.length - 1)) : stagger
  return (i) => (frame - delay - i * step) / dur
}
