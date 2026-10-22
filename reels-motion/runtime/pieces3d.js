/**
 * Piezas 3D del motor de Reels (three.js): títulos y cifras de metal extruido.
 *
 * Todo es función del tiempo t (segundos del Reel): el mismo t siempre da el mismo cuadro,
 * que es lo que necesita HyperFrames para renderizar en paralelo.
 * Coordenadas en px del video (1080×1920, y hacia abajo), como en CSS.
 */

import * as THREE from './vendor/three.module.js'
import { TTFLoader } from './vendor/TTFLoader.js'
import { Font } from './vendor/FontLoader.js'
import { TextGeometry } from './vendor/TextGeometry.js'
import { RoomEnvironment } from './vendor/RoomEnvironment.js'

const W = 1080
const H = 1920
const FOV = 32

// ─── Curvas de tiempo ─────────────────────────────────────────────────────────

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3)
const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p))
const easeOutBack = (p, s = 1.7) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2)
function easeOutBounce(p) {
  const n = 7.5625
  const d = 2.75
  if (p < 1 / d) return n * p * p
  if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75
  if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375
  return n * (p -= 2.625 / d) * p + 0.984375
}

/** Aleatorio con semilla (nunca Math.random: cada cuadro debe ser reproducible). */
export function prng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// ─── Materiales ───────────────────────────────────────────────────────────────

/** Textura de metal gastado / óxido dibujada en canvas (procedural, con semilla). */
function metalTexture(base, spots, seed, size = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  g.fillStyle = base
  g.fillRect(0, 0, size, size)
  const rnd = prng(seed)
  // Grano fino
  for (let i = 0; i < 9000; i++) {
    const v = rnd()
    g.fillStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${0.05 * rnd()})`
    g.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2)
  }
  // Manchas
  for (let i = 0; i < 140; i++) {
    const r = 4 + rnd() * 26
    const x = rnd() * size
    const y = rnd() * size
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    const col = spots[Math.floor(rnd() * spots.length)]
    grad.addColorStop(0, col)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.globalAlpha = 0.25 + rnd() * 0.5
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  // Rayas verticales (cepillado)
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.03 * rnd()})`
    g.beginPath()
    const x = rnd() * size
    g.moveTo(x, 0)
    g.lineTo(x + (rnd() - 0.5) * 20, size)
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.repeat.set(1 / 220, 1 / 220) // las caras frontales usan coordenadas en px como UV
  return tex
}

/** Acabados: [cara, cantos]. `accent` pinta los cantos donde el acabado lo usa. */
function finishMaterials(finish, accent, seed) {
  switch (finish) {
    case 'cromo':
      return [
        new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.16, map: metalTexture('#c9ced4', ['#ffffff', '#8d949c'], seed) }),
        new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 1, roughness: 0.22 }),
      ]
    case 'carbon':
      return [
        new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.55, roughness: 0.55, map: metalTexture('#2b2b2f', ['#111114', '#3d3d44'], seed) }),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), metalness: 0.75, roughness: 0.3 }),
      ]
    case 'oro':
      return [
        new THREE.MeshStandardMaterial({ color: 0xe0b44a, metalness: 1, roughness: 0.28, map: metalTexture('#d9a93c', ['#f6dc8a', '#9a6f1b'], seed) }),
        new THREE.MeshStandardMaterial({ color: 0xc8962c, metalness: 1, roughness: 0.32 }),
      ]
    case 'rojo':
      return [
        new THREE.MeshStandardMaterial({ color: 0xd0202e, metalness: 0.75, roughness: 0.32, map: metalTexture('#c41c2a', ['#ff5a5a', '#6b0a12'], seed) }),
        new THREE.MeshStandardMaterial({ color: 0x8e0f19, metalness: 0.85, roughness: 0.3 }),
      ]
    case 'oxido':
    default:
      return [
        new THREE.MeshStandardMaterial({ color: 0x8c8682, metalness: 0.65, roughness: 0.62, map: metalTexture('#5d5753', ['#9c3e08', '#c4581a', '#2a2522', '#7a6f66'], seed) }),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(accent || '#E8701A'), metalness: 0.7, roughness: 0.34 }),
      ]
  }
}

// ─── Escenario ────────────────────────────────────────────────────────────────

const fonts = {}
async function loadFont(name) {
  if (!fonts[name]) {
    const buf = await (await fetch(`runtime/fonts/${name}.woff`)).arrayBuffer()
    fonts[name] = new Font(new TTFLoader().parse(buf))
  }
  return fonts[name]
}

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(W, H, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  // A esta distancia, 1 unidad = 1 px en el plano z = 0.
  const dist = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 10, dist * 4)
  camera.position.set(0, 0, dist)

  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(500, 900, 1400)
  scene.add(key)
  const warm = new THREE.DirectionalLight(0xffb070, 1.4)
  warm.position.set(-900, -300, 600)
  scene.add(warm)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25))

  const pieces = []
  return {
    scene,
    pieces,
    renderAt(t) {
      for (const p of pieces) p.update(t)
      renderer.render(scene, camera)
    },
  }
}

const toWorld = (x, y) => [x - W / 2, H / 2 - y]

// ─── Título / cifra de metal ─────────────────────────────────────────────────

/**
 * Palabra 3D armada por letras (cada letra es una malla: permite entradas letra por letra).
 * opts: { text, font, finish, accent, x, y, size, maxWidth, start, end, entrance, seed, depth }
 *   entrance: 'caer' | 'fondo' | 'letras' | 'golpe'
 */
export async function addTitle3D(stage, opts) {
  const {
    text,
    font: fontName = 'russo',
    finish = 'oxido',
    accent = '#E8701A',
    x = W / 2,
    y = 320,
    size = 170,
    maxWidth = 940,
    start,
    end,
    entrance = 'caer',
    seed = 7,
    depth,
  } = opts
  const font = await loadFont(fontName)
  const [faceMat, sideMat] = finishMaterials(finish, accent, seed)
  for (const m of [faceMat, sideMat]) m.transparent = true

  const res = font.data.resolution || 1000
  const scale = size / res
  const group = new THREE.Group()
  const letters = []
  let cursor = 0
  for (const ch of String(text).toUpperCase()) {
    const glyph = font.data.glyphs[ch] || font.data.glyphs['?']
    const adv = (glyph?.ha ?? res * 0.5) * scale
    if (ch !== ' ') {
      const geo = new TextGeometry(ch, {
        font,
        size,
        depth: depth ?? size * 0.32,
        curveSegments: 5,
        bevelEnabled: true,
        bevelThickness: size * 0.05,
        bevelSize: size * 0.035,
        bevelSegments: 3,
      })
      geo.computeBoundingBox()
      const bb = geo.boundingBox
      const cx = (bb.min.x + bb.max.x) / 2
      geo.translate(-cx, -size * 0.36, -(depth ?? size * 0.32) / 2)
      const mesh = new THREE.Mesh(geo, [faceMat, sideMat])
      const holder = new THREE.Group()
      holder.add(mesh)
      holder.userData.baseX = cursor + cx
      group.add(holder)
      letters.push(holder)
    }
    cursor += adv
  }
  // Centrar y ajustar al ancho máximo
  const fit = cursor > maxWidth ? maxWidth / cursor : 1
  for (const l of letters) l.userData.baseX = (l.userData.baseX - cursor / 2) * fit
  for (const l of letters) l.scale.setScalar(fit)
  const [wx, wy] = toWorld(x, y)
  group.position.set(wx, wy, 0)
  stage.scene.add(group)

  const outDur = 0.18
  const piece = {
    update(t) {
      const visible = t >= start && t < end
      group.visible = visible
      if (!visible) return
      const local = t - start
      const out = clamp01((t - (end - outDur)) / outDur)
      faceMat.opacity = sideMat.opacity = 1 - out
      const sway = Math.sin(t * 1.3 + seed) * 0.05
      group.rotation.set(-0.08, sway, 0)
      letters.forEach((l, i) => {
        let ox = 0
        let oy = 0
        let oz = 0
        let rx = 0
        let s = 1
        if (entrance === 'caer') {
          const p = clamp01((local - i * 0.035) / 0.5)
          oy = (1 - easeOutBounce(p)) * 900
          rx = (1 - p) * 0.7
        } else if (entrance === 'fondo') {
          const p = clamp01(local / 0.55)
          oz = -3200 * (1 - easeOutExpo(p))
        } else if (entrance === 'letras') {
          const p = clamp01((local - i * 0.06) / 0.42)
          rx = (-Math.PI / 2) * (1 - easeOutBack(p))
          s = p > 0 ? 1 : 0.001
        } else if (entrance === 'golpe') {
          const p = clamp01(local / 0.22)
          s = 1 + 0.9 * (1 - easeOutCubic(p))
          const shake = Math.max(0, 1 - local / 0.4)
          ox = Math.sin(local * 90 + i) * 10 * shake
          oy = Math.cos(local * 70) * 8 * shake
        }
        l.position.set(l.userData.baseX + ox, oy, oz)
        l.rotation.set(rx, 0, 0)
        l.scale.setScalar(s * (1 - out * 0.15) * fit)
      })
    },
  }
  stage.pieces.push(piece)
  return piece
}
