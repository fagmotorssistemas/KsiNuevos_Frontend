/**
 * Kit 3D de K-SI para HyperFrames (three.js).
 *
 * Todo se dibuja en función del tiempo del Reel (segundos): cada pieza tiene `update(t)` y la escena se pinta en
 * el evento `hf-seek` de HyperFrames, así cualquier cuadro se puede renderizar suelto y siempre sale igual.
 * Las posiciones y tamaños se dan en píxeles del video (1080×1920, origen arriba a la izquierda).
 *
 * Piezas: letters3D (texto de metal que se arma letra por letra), counter3D (cifra que cuenta), tire3D (llanta
 * offroad que rueda), tireWipe (llanta gigante que tapa un corte), scanRing3D (escáner holográfico) y sweep3D
 * (luz que recorre el metal). Para algo propio: stage.scene, stage.THREE y stage.onUpdate(fn).
 */
import * as THREE from 'three'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { Font } from 'three/addons/loaders/FontLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const FOV = 35
const CAM_Z = 14

const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const ease = {
  linear: (x) => x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  inCubic: (x) => x * x * x,
  outBack: (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
}

/** Generador pseudoaleatorio con semilla (mulberry32): mismo resultado en cada render. */
export function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Número con separador de miles a la ecuatoriana: 128000 → "128.000"; 2.8 → "2,8". */
export function formatNumber(value, decimals = 0) {
  const fixed = Math.abs(value).toFixed(decimals)
  const [int, dec] = fixed.split('.')
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${value < 0 ? '-' : ''}${withDots}${dec ? `,${dec}` : ''}`
}

// ───────────────────────────── Escenario ─────────────────────────────

/**
 * Escenario 3D sobre un <canvas> del tamaño del video. `accent`: color de la luz de acento que tiñe los cantos.
 * Devuelve { THREE, scene, camera, toScene(x, y), px(n), add(item), onUpdate(fn), renderAt(t) }.
 */
export function createStage(canvas, { width = 1080, height = 1920, accent = '#E81C2A', environment = 0.9 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 300)
  camera.position.set(0, 0, CAM_Z)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = environment
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(2, 4, 8)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.8)
  fill.position.set(-3, -1, 6)
  scene.add(fill)
  // Luces que se mueven: siempre existen (encendidas o en 0) para no recompilar los materiales a mitad del render.
  const sweepLight = new THREE.PointLight(0xffffff, 0, 14)
  scene.add(sweepLight)
  const accentLight = new THREE.PointLight(new THREE.Color(accent), 0, 9)
  scene.add(accentLight)

  const unitsPerPx = (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * CAM_Z) / height
  const items = []
  const hooks = []
  const stage = {
    THREE,
    scene,
    camera,
    renderer,
    width,
    height,
    unitsPerPx,
    sweepLight,
    accentLight,
    /** Píxeles del video → coordenadas de escena en el plano z = 0. */
    toScene: (x, y) => [(x - width / 2) * unitsPerPx, (height / 2 - y) * unitsPerPx],
    /** Píxeles → unidades de escena. */
    px: (n) => n * unitsPerPx,
    add(item) {
      items.push(item)
      if (item.object) scene.add(item.object)
      return item
    },
    onUpdate(fn) {
      hooks.push(fn)
    },
    renderAt(t) {
      sweepLight.intensity = 0
      accentLight.intensity = 0
      for (const it of items) it.update(t)
      for (const h of hooks) h(t)
      renderer.render(scene, camera)
    },
  }
  return stage
}

/**
 * Conecta el escenario al reloj de HyperFrames (evento hf-seek) y avisa que el 3D está listo. Llamar UNA vez,
 * al final, después de agregar todas las piezas.
 */
export function bindSeek(stage) {
  window.addEventListener('hf-seek', (e) => stage.renderAt(e.detail.time))
  stage.renderAt(0)
  if (typeof window.__ksi3dReady === 'function') window.__ksi3dReady()
}

// ───────────────────────────── Fuentes y materiales ─────────────────────────────

const fontCache = new Map()
function font(name) {
  let f = fontCache.get(name)
  if (!f) {
    const data = window.__fonts3d && window.__fonts3d[name]
    if (!data) throw new Error(`Fuente 3D "${name}" no cargada (falta assets/kit/fonts3d/${name}.js)`)
    f = new Font(data)
    fontCache.set(name, f)
  }
  return f
}

const RUST_STOPS = [
  [0, new THREE.Color('#A9420A')],
  [0.34, new THREE.Color('#F06F12')],
  [0.66, new THREE.Color('#FFA23A')],
  [1, new THREE.Color('#FFD592')],
]
function rustColor(k, out) {
  const t = clamp01(k)
  for (let i = 1; i < RUST_STOPS.length; i++) {
    const [p1, c1] = RUST_STOPS[i]
    const [p0, c0] = RUST_STOPS[i - 1]
    if (t <= p1) return out.copy(c0).lerp(c1, (t - p0) / (p1 - p0))
  }
  return out.copy(RUST_STOPS[RUST_STOPS.length - 1][1])
}

let grungeTexture = null
function grunge() {
  if (grungeTexture) return grungeTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  const r = prng(7)
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(${70 + r() * 40}, ${26 + r() * 20}, 6, ${0.12 + r() * 0.5})`
    ctx.beginPath()
    ctx.arc(r() * size, r() * size, 0.4 + Math.pow(r(), 3) * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(90, 36, 8, ${0.15 + r() * 0.3})`
    ctx.lineWidth = 0.6 + r() * 1.2
    const y = r() * size
    const x = r() * size
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 30 + r() * 80, y + (r() - 0.5) * 6)
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

/**
 * Acabados del metal: [cara, cantos].
 * rust = naranja oxidado (camionetas) · chrome = cromo blanco · champagne = cromo con cantos dorados (SUV) ·
 * gold = oro pulido (súper premium) · carbon = negro piano con cantos de color (deportivo) · red = rojo caramelo K-SI.
 * `edge`: color de los cantos para carbon (por defecto rojo K-SI).
 */
function materials(finish, edge) {
  switch (finish) {
    case 'rust':
      return [
        new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, map: grunge(), metalness: 0.5, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
        new THREE.MeshStandardMaterial({ color: '#6B2C07', map: grunge(), metalness: 0.45, roughness: 0.55 }),
      ]
    case 'champagne':
      return [
        new THREE.MeshPhysicalMaterial({ color: '#F6F2EA', metalness: 0.85, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 }),
        new THREE.MeshStandardMaterial({ color: '#B08A4E', metalness: 0.9, roughness: 0.26 }),
      ]
    case 'gold':
      return [
        new THREE.MeshPhysicalMaterial({ color: '#E8C77A', metalness: 1, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
        new THREE.MeshStandardMaterial({ color: '#8A6526', metalness: 1, roughness: 0.3 }),
      ]
    case 'carbon':
      return [
        new THREE.MeshPhysicalMaterial({ color: '#141416', metalness: 0.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }),
        new THREE.MeshStandardMaterial({ color: edge || '#E81C2A', metalness: 0.5, roughness: 0.3, emissive: new THREE.Color(edge || '#E81C2A'), emissiveIntensity: 0.35 }),
      ]
    case 'red':
      return [
        new THREE.MeshPhysicalMaterial({ color: '#E81C2A', metalness: 0.55, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }),
        new THREE.MeshStandardMaterial({ color: '#5E0810', metalness: 0.5, roughness: 0.35 }),
      ]
    default:
      return [
        new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', metalness: 0.78, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 }),
        new THREE.MeshStandardMaterial({ color: '#2A2A30', metalness: 0.35, roughness: 0.4 }),
      ]
  }
}

// ───────────────────────────── Letras 3D ─────────────────────────────

const glyphCache = new Map()
const capCache = new Map()

function capRatio(fontName) {
  let cap = capCache.get(fontName)
  if (cap === undefined) {
    const g = new TextGeometry('H', { font: font(fontName), size: 1, depth: 0.01, curveSegments: 2 })
    g.computeBoundingBox()
    cap = g.boundingBox.max.y
    g.dispose()
    capCache.set(fontName, cap)
  }
  return cap
}

function resolveChar(fontName, ch) {
  const glyphs = font(fontName).data.glyphs
  if (glyphs[ch]) return ch
  const plain = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (plain && glyphs[plain]) return plain
  if (ch === '·' && glyphs['-']) return '-'
  return null
}

function glyph(fontName, size, ch) {
  const key = `${fontName}|${size.toFixed(4)}|${ch}`
  const hit = glyphCache.get(key)
  if (hit) return hit
  const data = font(fontName).data
  const scale = size / data.resolution
  const real = ch === ' ' ? null : resolveChar(fontName, ch)
  let out
  if (!real) {
    out = { geometry: null, advance: (data.glyphs[' '] ? data.glyphs[' '].ha : data.resolution * 0.3) * scale, minX: 0, maxX: 0 }
  } else {
    const depth = size * 0.34
    const g = new TextGeometry(real, {
      font: font(fontName),
      size,
      depth,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: depth * 0.16,
      bevelSize: size * 0.022,
      bevelSegments: 3,
    })
    g.computeBoundingBox()
    const cap = capRatio(fontName) * size
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
    out = { geometry: g, advance: data.glyphs[real].ha * scale, minX: g.boundingBox.min.x, maxX: g.boundingBox.max.x }
  }
  glyphCache.set(key, out)
  return out
}

function layout(text, fontName, size) {
  const tracking = size * 0.04
  let pen = 0
  let minX = Infinity
  let maxX = -Infinity
  const glyphs = [...text].map((ch) => {
    const g = glyph(fontName, size, ch)
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
  return { glyphs, minX, maxX, width: maxX - minX }
}

/** Pose de una letra según su avance p (0 → 1). */
function pose(entrance, p, i, size) {
  const side = i % 2 === 0 ? 1 : -1
  switch (entrance) {
    case 'drop': {
      const fall = ease.outCubic(Math.min(1, p / 0.7))
      const land = p > 0.7 ? Math.sin(((p - 0.7) / 0.3) * Math.PI) : 0
      return { px: 0, py: (1 - fall) * 2.2 * size, pz: (1 - fall) * 1.2 * size, rx: -(1 - ease.outBack(p)) * 1.5, ry: 0, rz: (1 - fall) * 0.35 * side, sx: 1 + land * 0.06, sy: 1 - land * 0.1 }
    }
    case 'flip': {
      const up = ease.outBack(p)
      return { px: 0, py: 0, pz: 0, rx: -(1 - up) * (Math.PI / 2), ry: 0, rz: 0, sx: 1, sy: Math.max(0.001, Math.min(1, p * 4)) }
    }
    case 'rise': {
      const up = ease.outQuart(p)
      return { px: 0, py: (1 - up) * -0.9 * size, pz: (1 - up) * 0.6 * size, rx: (1 - up) * 1.1, ry: 0, rz: 0, sx: 1, sy: Math.max(0.001, Math.min(1, p * 2.5)) }
    }
    case 'slam': {
      const hit = ease.outExpo(p)
      const s = 1 + (1 - hit) * 1.6
      return { px: 0, py: 0, pz: (1 - hit) * 5, rx: 0, ry: (1 - hit) * 0.5 * side, rz: 0, sx: s, sy: s }
    }
    case 'spin': {
      const k = ease.outCubic(p)
      return { px: 0, py: 0, pz: (1 - k) * -3, rx: 0, ry: (1 - k) * Math.PI * 2, rz: 0, sx: Math.max(0.001, k), sy: Math.max(0.001, k) }
    }
    default: {
      // depth: llega desde el fondo girando un poco
      const k = ease.outCubic(p)
      return { px: 0, py: (1 - k) * -0.6, pz: (1 - k) * -9, rx: 0, ry: (1 - k) * -1.1 * side, rz: 0, sx: 1, sy: 1 }
    }
  }
}

/**
 * Texto de metal 3D que se arma letra por letra.
 *
 * Opciones (px = píxeles del video, s = segundos del Reel):
 *   text            texto (se pasa a mayúsculas salvo `keepCase: true`)
 *   font            russo | anton | bebas | teko | archivo | montserrat | cinzel | playfair | michroma | josefin
 *   finish          rust | chrome | champagne | gold | carbon | red      (edge: color de cantos para carbon)
 *   x, y            ancla en px; y = centro de la altura de las mayúsculas
 *   capPx           alto de las mayúsculas en px (por defecto 150)
 *   align           center | left | right (respecto de x)
 *   maxWidthPx      ancho máximo; si no entra, se achica todo (por defecto 960)
 *   start, end      ventana visible en s (end opcional)
 *   entrance        drop | flip | rise | slam | spin | depth
 *   stagger, dur    s entre letras y s que tarda cada una (0.06 / 0.45)
 *   letterStart     (i, xPx) => s en que arranca la letra i (para que se levanten al paso de una llanta, etc.)
 *   exit            up | down | back | none    exitDur (0.3 s)
 *   sway            balanceo leve después de asentarse (rad, 0.05) · tilt: inclinación hacia atrás (rad, 0.05)
 *   sweep           true: una luz recorre el metal mientras se ve
 *   textAt          (t) => string para texto que cambia (lo usa counter3D)
 * Devuelve el item (item.object es el THREE.Group).
 */
export function letters3D(stage, opts) {
  const o = {
    font: 'russo',
    finish: 'chrome',
    x: stage.width / 2,
    y: 400,
    capPx: 150,
    align: 'center',
    maxWidthPx: 960,
    start: 0,
    end: Infinity,
    entrance: 'drop',
    stagger: 0.06,
    dur: 0.45,
    exit: 'up',
    exitDur: 0.3,
    sway: 0.05,
    tilt: 0.05,
    sweep: true,
    keepCase: false,
    ...opts,
  }
  const mats = materials(o.finish, o.edge)
  const norm = (s) => (o.keepCase ? String(s) : String(s).toUpperCase())
  const baseSize = (stage.px(o.capPx)) / capRatio(o.font)
  // El tamaño se fija con el texto final (o el más largo) para que no cambie mientras cuenta.
  const sizingText = norm(o.sizingText ?? o.text ?? '')
  const fullWidth = layout(sizingText, o.font, baseSize).width
  const size = fullWidth > stage.px(o.maxWidthPx) ? baseSize * (stage.px(o.maxWidthPx) / fullWidth) : baseSize
  const capU = capRatio(o.font) * size

  const group = new THREE.Group()
  const inner = new THREE.Group()
  group.add(inner)
  const [ax, ay] = stage.toScene(o.x, o.y)
  group.position.set(ax, ay, 0)
  inner.position.y = -capU / 2

  let current = null
  let letters = []
  function build(text) {
    for (const l of letters) inner.remove(l.pivot)
    const lay = layout(text, o.font, size)
    const offset = o.align === 'left' ? -lay.minX : o.align === 'right' ? -lay.maxX : -(lay.minX + lay.maxX) / 2
    letters = []
    lay.glyphs.forEach((g, i) => {
      if (!g.geometry) return
      const pivot = new THREE.Group()
      const mesh = new THREE.Mesh(g.geometry, mats)
      mesh.position.x = g.pen - g.center
      pivot.add(mesh)
      const cx = g.center + offset
      pivot.position.x = cx
      inner.add(pivot)
      const xPx = o.x + cx / stage.unitsPerPx
      const st = o.letterStart ? o.letterStart(letters.length, xPx) : o.start + letters.length * o.stagger
      letters.push({ pivot, cx, start: st })
    })
    current = text
  }
  build(norm(o.textAt ? o.textAt(o.start) : o.text))

  const item = {
    object: group,
    update(t) {
      const visible = t >= o.start && t < o.end
      group.visible = visible
      if (!visible) return
      if (o.textAt) {
        const next = norm(o.textAt(t))
        if (next !== current) build(next)
      }
      for (let i = 0; i < letters.length; i++) {
        const L = letters[i]
        const p = clamp01((t - L.start) / o.dur)
        L.pivot.visible = p > 0
        if (p <= 0) continue
        const q = pose(o.entrance, p, i, size)
        L.pivot.position.set(L.cx + q.px, q.py, q.pz)
        L.pivot.rotation.set(q.rx, q.ry, q.rz)
        L.pivot.scale.set(q.sx, q.sy, 1)
      }
      const e = o.end === Infinity || o.exit === 'none' ? 0 : ease.inCubic(clamp01((t - (o.end - o.exitDur)) / o.exitDur))
      const life = t - o.start
      group.rotation.set(o.tilt + (o.exit === 'back' ? e * 0.8 : 0), Math.sin(life * 0.9) * o.sway, 0)
      const dy = o.exit === 'up' ? e * stage.px(260) : o.exit === 'down' ? -e * stage.px(260) : 0
      group.position.set(ax, ay + dy, o.exit === 'back' ? -e * 8 : 0)
      group.scale.setScalar(Math.max(0.001, 1 - e * 0.35))
      if (o.sweep) {
        const span = Math.max(0.6, (o.end === Infinity ? 3 : o.end - o.start))
        const k = clamp01(life / span)
        stage.sweepLight.position.set(-7 + k * 14, ay + 1.2, 3)
        stage.sweepLight.intensity = 160
        stage.accentLight.position.set(ax, ay - 2.4, 2.2)
        stage.accentLight.intensity = 40
      }
    },
  }
  return stage.add(item)
}

/**
 * Cifra 3D que cuenta de `from` a `to` (formato 128.000 / 2,8) con `prefix`/`suffix` ("$", " KM", "X4").
 * countStart/countDur en s (por defecto empieza con la entrada y dura 0.7 s). Acepta las opciones de letters3D.
 */
export function counter3D(stage, opts) {
  const o = { from: 0, decimals: 0, prefix: '', suffix: '', countDur: 0.7, entrance: 'drop', stagger: 0, ...opts }
  const countStart = o.countStart ?? o.start ?? 0
  const finalText = `${o.prefix}${formatNumber(o.to, o.decimals)}${o.suffix}`
  return letters3D(stage, {
    ...o,
    sizingText: finalText,
    text: finalText,
    textAt: (t) => {
      const k = ease.outCubic(clamp01((t - countStart) / o.countDur))
      return `${o.prefix}${formatNumber(o.from + (o.to - o.from) * k, o.decimals)}${o.suffix}`
    },
  })
}

// ───────────────────────────── Llanta 3D ─────────────────────────────

const TIRE_PROFILE = [
  [0.63, 0.3], [0.7, 0.33], [0.8, 0.355], [0.87, 0.36], [0.905, 0.345], [0.92, 0.31], [0.925, 0.25],
  [0.925, -0.25], [0.92, -0.31], [0.905, -0.345], [0.87, -0.36], [0.8, -0.355], [0.7, -0.33], [0.63, -0.3],
]
let tireParts = null
function parts() {
  if (tireParts) return tireParts
  const toZ = (g) => g.rotateX(Math.PI / 2)
  tireParts = {
    body: toZ(new THREE.LatheGeometry(TIRE_PROFILE.map(([r, w]) => new THREE.Vector2(r, w)), 72)),
    lug: new THREE.BoxGeometry(0.09, 0.17, 0.25),
    shoulder: new THREE.BoxGeometry(0.11, 0.12, 0.06),
    barrel: toZ(new THREE.CylinderGeometry(0.63, 0.63, 0.58, 48, 1, true)),
    lip: new THREE.TorusGeometry(0.635, 0.028, 12, 72),
    bead: new THREE.TorusGeometry(0.585, 0.04, 10, 72),
    bolt: toZ(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8)),
    disc: new THREE.CircleGeometry(0.6, 48),
    spoke: new THREE.BoxGeometry(0.44, 0.12, 0.07),
    hub: toZ(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 32)),
    cap: toZ(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 32)),
    nut: toZ(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 6)),
  }
  return tireParts
}

/** Arma la llanta (radio 1, eje hacia la cámara). `accent`: color del aro beadlock y la tapa. */
function buildTire(accent) {
  const p = parts()
  const m = {
    rubber: new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.86, metalness: 0.04, side: THREE.DoubleSide }),
    tread: new THREE.MeshStandardMaterial({ color: '#1A1A1D', roughness: 0.8, metalness: 0.05 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: '#2C2F34', roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide }),
    machined: new THREE.MeshStandardMaterial({ color: '#C9CDD3', roughness: 0.22, metalness: 1 }),
    spoke: new THREE.MeshStandardMaterial({ color: '#4E535B', roughness: 0.3, metalness: 0.95 }),
    shadow: new THREE.MeshStandardMaterial({ color: '#0E0E10', roughness: 0.6, metalness: 0.5 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.32, metalness: 0.6 }),
  }
  const wheel = new THREE.Group()
  const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...pos)
    mesh.rotation.set(...rot)
    if (scale) mesh.scale.set(...scale)
    return mesh
  }
  wheel.add(add(p.body, m.rubber))
  const lugs = 30
  for (let k = 0; k < lugs; k++) {
    const a = (k / lugs) * Math.PI * 2
    const b = a + Math.PI / lugs
    const ga = new THREE.Group()
    ga.rotation.z = a
    ga.add(add(p.lug, m.tread, [0.955, 0, 0.15], [0.32, 0, 0]))
    ga.add(add(p.shoulder, m.tread, [0.885, 0, 0.36]))
    const gb = new THREE.Group()
    gb.rotation.z = b
    gb.add(add(p.lug, m.tread, [0.955, 0, -0.15], [-0.32, 0, 0]))
    gb.add(add(p.shoulder, m.tread, [0.885, 0, -0.36]))
    wheel.add(ga, gb)
  }
  wheel.add(add(p.barrel, m.gunmetal))
  wheel.add(add(p.disc, m.shadow, [0, 0, 0.04]))
  for (let k = 0; k < 6; k++) {
    const g = new THREE.Group()
    g.rotation.z = (k / 6) * Math.PI * 2
    g.add(add(p.spoke, m.spoke, [0.38, 0, 0.2], [0, -0.18, 0]))
    wheel.add(g)
  }
  wheel.add(add(p.hub, m.machined, [0, 0, 0.22]))
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6
    wheel.add(add(p.nut, m.machined, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.29]))
  }
  wheel.add(add(p.cap, m.accent, [0, 0, 0.3]))
  wheel.add(add(p.lip, m.machined, [0, 0, 0.29]))
  wheel.add(add(p.bead, m.accent, [0, 0, 0.32], [0, 0, 0], [1, 1, 0.45]))
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    wheel.add(add(p.bolt, m.machined, [Math.cos(a) * 0.585, Math.sin(a) * 0.585, 0.345]))
  }
  return wheel
}

/**
 * Llanta offroad 3D que rueda de `from` a `to` (px) entre `start` y `start + rollDur` y después se queda girando
 * como en un exhibidor (`showcase: true`) o sigue de largo si `to` está fuera de la pantalla.
 * Opciones: radiusPx (150), from {x,y}, to {x,y}, start, end, rollDur (0.6 s), rollEase (outCubic | linear),
 * yaw (rad, -0.4: muestra el costado y la banda), z (0.6: delante de las letras), accent (color del aro), showcase.
 */
export function tire3D(stage, opts) {
  const o = { radiusPx: 150, start: 0, end: Infinity, rollDur: 0.6, rollEase: 'outCubic', yaw: -0.4, z: 0.6, accent: '#FF8A1F', showcase: true, ...opts }
  o.from = o.from || { x: -o.radiusPx - 40, y: o.to ? o.to.y : 960 }
  o.to = o.to || { x: stage.width / 2, y: o.from.y }
  const wheel = buildTire(o.accent)
  const spin = new THREE.Group()
  spin.add(wheel)
  const group = new THREE.Group()
  group.add(spin)
  const r = stage.px(o.radiusPx)
  group.scale.setScalar(r)
  const dir = o.to.x >= o.from.x ? 1 : -1
  const item = {
    object: group,
    /** Centro de la llanta en px en el instante t (para que otras piezas reaccionen a su paso). */
    centerAt(t) {
      const k = (ease[o.rollEase] || ease.outCubic)(clamp01((t - o.start) / o.rollDur))
      return { x: o.from.x + (o.to.x - o.from.x) * k, y: o.from.y + (o.to.y - o.from.y) * k }
    },
    update(t) {
      const visible = t >= o.start && t < o.end
      group.visible = visible
      if (!visible) return
      const c = item.centerAt(t)
      const [sx, sy] = stage.toScene(c.x, c.y)
      group.position.set(sx, sy, o.z)
      const travelled = Math.hypot(c.x - o.from.x, c.y - o.from.y)
      wheel.rotation.z = -dir * (travelled / o.radiusPx)
      const settled = Math.max(0, t - o.start - o.rollDur)
      const show = o.showcase ? Math.sin(settled * 1.6) * 0.25 * clamp01(settled * 2) : 0
      spin.rotation.set(0.08, o.yaw + show, 0)
    },
  }
  return stage.add(item)
}

/**
 * Transición de camioneta: una llanta gigante pasa rodando frente a la cámara (como si la camioneta cruzara pegada
 * al lente) y tapa la pantalla entera justo en `at` (el instante del corte), así el cambio de toma no se ve.
 * Opciones: at (s), dur (0.8 s), radiusPx (1400), direction (1 izquierda→derecha, -1 al revés), accent.
 */
export function tireWipe(stage, opts) {
  const o = { dur: 0.8, radiusPx: 1400, direction: 1, accent: '#FF8A1F', ...opts }
  const start = o.at - o.dur / 2
  const span = stage.width + o.radiusPx * 2 + 120
  const fromX = o.direction > 0 ? -o.radiusPx - 60 : stage.width + o.radiusPx + 60
  const toX = fromX + o.direction * span
  return tire3D(stage, {
    radiusPx: o.radiusPx,
    from: { x: fromX, y: stage.height / 2 + 60 },
    to: { x: toX, y: stage.height / 2 + 60 },
    start,
    end: start + o.dur,
    rollDur: o.dur,
    rollEase: 'linear',
    yaw: -0.32 * o.direction,
    z: 0,
    accent: o.accent,
    showcase: false,
  })
}

// ───────────────────────────── Escáner holográfico ─────────────────────────────

/**
 * Escáner holográfico 3D sobre un objeto chico (botón, palanca): dos órbitas de luz que giran en ejes distintos,
 * un anillo punteado de frente y un anillo blanco fino. x, y, rPx en px; start, end, color.
 */
export function scanRing3D(stage, opts) {
  const o = { rPx: 140, start: 0, end: Infinity, color: '#FF8A1F', enterDur: 0.4, ...opts }
  const glow = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const mAccent = glow(o.color, 1)
  const mHalo = glow(o.color, 0.22)
  const mWhite = glow('#ffffff', 0.9)
  const ring = new THREE.TorusGeometry(1, 0.022, 10, 96)
  const haloG = new THREE.TorusGeometry(1, 0.09, 10, 96)
  const dashes = 18
  const dash = new THREE.TorusGeometry(1.18, 0.018, 6, 8, ((Math.PI * 2) / dashes) * 0.55)
  const group = new THREE.Group()
  const orbitA = new THREE.Group()
  orbitA.add(new THREE.Mesh(ring, mAccent), new THREE.Mesh(haloG, mHalo))
  const orbitB = new THREE.Group()
  const b1 = new THREE.Mesh(ring, mAccent)
  const b2 = new THREE.Mesh(haloG, mHalo)
  b1.scale.setScalar(0.86)
  b2.scale.setScalar(0.86)
  orbitB.add(b1, b2)
  const dashRing = new THREE.Group()
  for (let k = 0; k < dashes; k++) {
    const d = new THREE.Mesh(dash, mAccent)
    d.rotation.z = (k / dashes) * Math.PI * 2
    dashRing.add(d)
  }
  const thin = new THREE.Mesh(ring, mWhite)
  thin.scale.setScalar(1.04)
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), mAccent)
  group.add(orbitA, orbitB, dashRing, thin, core)
  const [sx, sy] = stage.toScene(o.x, o.y)
  const r = stage.px(o.rPx)
  const item = {
    object: group,
    update(t) {
      const visible = t >= o.start && t < o.end
      group.visible = visible
      if (!visible) return
      const p = clamp01((t - o.start) / o.enterDur)
      const fadeOut = o.end === Infinity ? 1 : clamp01((o.end - t) / 0.2)
      const alpha = Math.min(clamp01(p / 0.35), fadeOut)
      mAccent.opacity = alpha
      mHalo.opacity = 0.22 * alpha
      mWhite.opacity = 0.9 * alpha
      const open = 1 + (1 - ease.outCubic(p)) * 0.7
      group.position.set(sx, sy, 0)
      group.scale.setScalar(r * open)
      const life = t - o.start
      orbitA.rotation.set(1.15, life * 1.4, 0)
      orbitB.rotation.set(-0.5, -life * 1.1 + 1, 0.9)
      dashRing.rotation.set(0, 0, -life * 0.8)
    },
  }
  return stage.add(item)
}

/** Luz blanca que cruza la escena de izquierda a derecha entre start y end, a la altura y (px). */
export function sweep3D(stage, { start, end, y = 960, intensity = 160 }) {
  const [, sy] = stage.toScene(0, y)
  return stage.add({
    update(t) {
      if (t < start || t >= end) return
      const k = clamp01((t - start) / (end - start))
      stage.sweepLight.position.set(-7 + k * 14, sy + 1.2, 3)
      stage.sweepLight.intensity = intensity
    },
  })
}
