/**
 * Piezas 2D del motor de Reels (DOM + CSS + GSAP): subtítulos karaoke, placas, K-SI SCAN,
 * ocupantes, caja de comentario, barro, partículas, destello y cierre.
 *
 * Cada función recibe la línea de tiempo `tl` (GSAP, en pausa) y agrega sus tweens en tiempos
 * absolutos del Reel. Solo se animan propiedades que HyperFrames reproduce cuadro a cuadro
 * (opacity, x, y, scale, rotation), y la aleatoriedad usa semilla.
 */

import { prng } from './pieces3d.js'

const W = 1080
const H = 1920

function el(tag, cls, parent, html) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  parent.appendChild(e)
  return e
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Muestra un elemento solo dentro de [start, end). */
function window_(tl, node, start, end) {
  tl.set(node, { opacity: 0 }, 0)
  tl.set(node, { opacity: 1 }, start)
  tl.set(node, { opacity: 0 }, end)
}

// ─── Subtítulos karaoke ───────────────────────────────────────────────────────

/**
 * groups: [{ start, end, words: [{ text, start, end, key }] }]
 * Palabra activa en color de acento; `key` = palabra clave (queda en acento todo el grupo).
 */
export function captions(tl, layer, groups, { accent, font = 'anton', y = 1430, size = 92 }) {
  for (const g of groups) {
    const row = el('div', 'cap', layer)
    row.style.cssText = `top:${y}px;font-family:${font};font-size:${size}px;`
    const spans = g.words.map((w) => {
      const word = el('span', 'cap-w', row)
      el('span', 'cap-base', word, esc(w.text))
      const hot = el('span', 'cap-hot', word, esc(w.text))
      hot.style.color = accent
      return { w, hot }
    })
    tl.set(row, { opacity: 0, scale: 0.92 }, 0)
    tl.to(row, { opacity: 1, scale: 1, duration: 0.08 }, g.start)
    tl.set(row, { opacity: 0 }, g.end)
    for (const { w, hot } of spans) {
      tl.set(hot, { opacity: w.key ? 1 : 0 }, 0)
      if (!w.key) {
        tl.set(hot, { opacity: 1 }, w.start)
        tl.set(hot, { opacity: 0 }, Math.max(w.start + 0.05, w.end))
      }
    }
  }
}

// ─── Placa con franja de peligro ─────────────────────────────────────────────

/** { text, x, y, start, end, rotate, from: 'izquierda'|'derecha'|'arriba', size } */
export function plate(tl, layer, { text, x, y, start, end, rotate = -3, from = 'izquierda', size = 54, accent }) {
  const node = el('div', 'plate', layer, `<span>${esc(text)}</span><i class="hazard"></i>`)
  node.style.cssText = `left:${x}px;top:${y}px;font-size:${size}px;--accent:${accent};`
  const dx = from === 'izquierda' ? -700 : from === 'derecha' ? 700 : 0
  const dy = from === 'arriba' ? -500 : 0
  tl.set(node, { opacity: 0, x: dx, y: dy, rotation: rotate - 8, xPercent: -50 }, 0)
  tl.to(node, { opacity: 1, x: 0, y: 0, rotation: rotate, duration: 0.38, ease: 'back.out(1.6)' }, start)
  tl.to(node, { opacity: 0, scale: 0.9, duration: 0.15 }, end - 0.15)
}

// ─── K-SI SCAN ────────────────────────────────────────────────────────────────

/**
 * Etiqueta numerada + anillo sobre lo que se señala, o marco con escaneo si `frame` (pantallas).
 * point: [x, y] en px del objeto; frame: [x, y, w, h].
 */
export function scan(tl, layer, { index, label, point, frame, start, end, accent }) {
  const box = el(
    'div',
    'scan-label',
    layer,
    `<em>// ${String(index).padStart(2, '0')} K-SI SCAN</em><b>${esc(label)}</b><i></i>`
  )
  box.style.setProperty('--accent', accent)
  let lx
  let ly
  if (frame) {
    const [fx, fy, fw, fh] = frame
    const fr = el('div', 'scan-frame', layer, '<i></i><i></i><i></i><i></i><u></u>')
    fr.style.cssText = `left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;--accent:${accent};`
    const line = fr.querySelector('u')
    window_(tl, fr, start, end)
    tl.fromTo(fr, { scale: 1.12 }, { scale: 1, duration: 0.3, ease: 'power3.out' }, start)
    for (let k = 0, t = start + 0.1; t < end - 0.3; k++, t += 1.1) {
      tl.fromTo(line, { y: 0 }, { y: fh, duration: 1, ease: 'none' }, t)
    }
    lx = fx + fw / 2
    ly = fy - 120
  } else {
    const [px, py] = point || [W / 2, H / 2]
    const ring = el(
      'div',
      'scan-ring',
      layer,
      `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="78" /><circle cx="100" cy="100" r="92" class="dash" />` +
        `<path d="M100 2v22M100 176v22M2 100h22M176 100h22" /></svg>`
    )
    ring.style.cssText = `left:${px - 100}px;top:${py - 100}px;--accent:${accent};`
    window_(tl, ring, start, end)
    tl.fromTo(ring, { scale: 2.2, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(1.4)' }, start)
    tl.to(ring, { rotation: 45 * Math.max(1, end - start), duration: end - start - 0.35, ease: 'none' }, start + 0.35)
    lx = Math.min(W - 280, Math.max(280, px))
    ly = Math.max(260, py - 260)
  }
  box.style.cssText += `left:${lx}px;top:${ly}px;`
  tl.set(box, { opacity: 0, xPercent: -50 }, 0)
  tl.fromTo(box, { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power3.out' }, start + 0.08)
  tl.set(box, { opacity: 0 }, end)
}

// ─── Ocupantes ────────────────────────────────────────────────────────────────

const PERSON_SVG =
  '<svg viewBox="0 0 40 52"><circle cx="20" cy="11" r="10"/><path d="M2 52c0-12 8-21 18-21s18 9 18 21z"/></svg>'

export function occupants(tl, layer, { count, x, y, start, end, accent, size = 64 }) {
  const row = el('div', 'people', layer)
  row.style.cssText = `left:${x}px;top:${y}px;--accent:${accent};`
  const icons = Array.from({ length: count }, () => {
    const p = el('i', '', row, PERSON_SVG)
    p.style.width = `${size}px`
    return p
  })
  window_(tl, row, start, end)
  icons.forEach((p, i) => {
    tl.fromTo(p, { scale: 0, y: 30 }, { scale: 1, y: 0, duration: 0.28, ease: 'back.out(2.4)' }, start + 0.12 * i)
  })
}

// ─── Caja de comentario ───────────────────────────────────────────────────────

/** Caja estilo red social que escribe `text` letra por letra con cursor. */
export function commentBox(tl, layer, { text, y = 470, start, end, accent, typeDur = 1.4 }) {
  const box = el(
    'div',
    'comment',
    layer,
    `<span class="avatar"></span><div><small>TU COMENTARIO</small><p></p></div><span class="tail"></span>`
  )
  box.style.cssText = `top:${y}px;--accent:${accent};`
  const p = box.querySelector('p')
  const chars = [...String(text).toUpperCase()].map((c) => el('span', 'ch', p, c === ' ' ? '&nbsp;' : esc(c)))
  const cursor = el('span', 'cursor', p, '')
  tl.set(box, { opacity: 0, xPercent: -50 }, 0)
  tl.fromTo(box, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }, start)
  tl.set(box, { opacity: 0 }, end)
  const step = typeDur / Math.max(1, chars.length)
  // Las letras ocultas ocupan su lugar: el cursor se mueve a mano detrás de la última escrita.
  tl.set(cursor, { x: 0 }, 0)
  chars.forEach((c, i) => {
    tl.set(c, { opacity: 0 }, 0)
    tl.set(c, { opacity: 1 }, start + 0.35 + i * step)
    tl.set(cursor, { x: c.offsetLeft + c.offsetWidth }, start + 0.35 + i * step)
  })
  for (let t = start; t < end; t += 0.5) {
    tl.set(cursor, { opacity: 1 }, t)
    tl.set(cursor, { opacity: 0 }, t + 0.25)
  }
}

// ─── Barro ────────────────────────────────────────────────────────────────────

/** Mancha de barro dibujada en canvas (forma irregular, gotas y brillo), con semilla. */
function drawMud(canvas, seed, { gloss = true } = {}) {
  const g = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const rnd = prng(seed)
  const blob = (cx, cy, r, color) => {
    g.fillStyle = color
    g.beginPath()
    const n = 14
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const rr = r * (0.72 + rnd() * 0.5)
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr
      if (i === 0) g.moveTo(x, y)
      else g.quadraticCurveTo(cx + Math.cos(a - 0.2) * rr * 1.15, cy + Math.sin(a - 0.2) * rr * 1.15, x, y)
    }
    g.fill()
  }
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.3
  blob(cx, cy, r, '#4a3222')
  blob(cx, cy, r * 0.8, '#5c3f2a')
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2
    const d = r * (0.9 + rnd() * 0.9)
    blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.06 + rnd() * 0.16), rnd() > 0.5 ? '#4a3222' : '#5c3f2a')
  }
  if (gloss) {
    g.globalAlpha = 0.35
    for (let i = 0; i < 10; i++) {
      g.fillStyle = '#d9b48a'
      g.beginPath()
      g.ellipse(cx + (rnd() - 0.5) * r, cy + (rnd() - 0.5) * r, r * 0.08 * rnd() + 3, r * 0.03 + 2, rnd() * 3, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
  }
}

/** Salpicones en esquinas: aparecen de golpe y se quedan unos segundos. */
export function mudSplats(tl, layer, { start, end, seed = 11, count = 4 }) {
  const rnd = prng(seed)
  const spots = [
    [70, 160],
    [W - 120, 220],
    [90, H - 520],
    [W - 140, H - 640],
    [W / 2 + 260, 120],
  ].slice(0, count)
  spots.forEach(([x, y], i) => {
    const size = 170 + rnd() * 110
    const c = el('canvas', 'mud', layer)
    c.width = c.height = Math.round(size)
    c.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;`
    drawMud(c, seed * 31 + i)
    window_(tl, c, start + i * 0.06, end)
    tl.fromTo(c, { scale: 0.2, rotation: rnd() * 90 }, { scale: 1, duration: 0.18, ease: 'power4.out' }, start + i * 0.06)
  })
}

/** Lodo que cubre toda la pantalla: salpicón con brazos, gotas, relieve suave y brillo húmedo. */
function drawMudCover(canvas, seed) {
  const g = canvas.getContext('2d')
  const S = canvas.width
  const c = S / 2
  const rnd = prng(seed)
  // El borde más cercano queda fuera del cuadro aunque la mancha esté a escala 1.
  const R = Math.hypot(W, H) / 2 + 40
  const n = 44
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    // Algunos puntos se estiran como brazos del salpicón
    const r = R * (1 + rnd() * 0.08 + (rnd() > 0.72 ? 0.12 + rnd() * 0.12 : 0))
    return [c + Math.cos(a) * r, c + Math.sin(a) * r]
  })
  const body = g.createRadialGradient(c, c * 0.85, R * 0.05, c, c, R * 1.15)
  body.addColorStop(0, '#6e4b30')
  body.addColorStop(0.6, '#563a25')
  body.addColorStop(1, '#3a2718')
  g.fillStyle = body
  g.beginPath()
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % n]
    if (i === 0) g.moveTo((x + nx) / 2, (y + ny) / 2)
    else g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  })
  g.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2)
  g.fill()
  // Gotas que saltan del borde
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2
    const d = R * (1.12 + rnd() * 0.3)
    const r = 8 + rnd() * 40
    g.fillStyle = rnd() > 0.5 ? '#4a3222' : '#5c3f2a'
    g.beginPath()
    g.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, r * 1.5, r, a, 0, Math.PI * 2)
    g.fill()
  }
  // Relieve suave (manchas grandes y difusas, no puntos)
  g.filter = 'blur(28px)'
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * R
    g.fillStyle = rnd() > 0.5 ? 'rgba(38,24,14,.45)' : 'rgba(128,92,58,.3)'
    g.beginPath()
    g.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, 60 + rnd() * 160, 40 + rnd() * 110, rnd() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
  // Brillo húmedo: vetas curvas difusas y destellos puntuales
  g.filter = 'blur(5px)'
  g.lineCap = 'round'
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * R * 0.9
    const x = c + Math.cos(a) * d
    const y = c + Math.sin(a) * d
    const from = rnd() * Math.PI * 2
    g.strokeStyle = `rgba(240,215,180,${0.15 + rnd() * 0.18})`
    g.lineWidth = 4 + rnd() * 8
    g.beginPath()
    g.arc(x, y, 70 + rnd() * 160, from, from + 0.25 + rnd() * 0.45)
    g.stroke()
  }
  g.filter = 'blur(2px)'
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * R * 0.9
    g.fillStyle = `rgba(255,240,220,${0.35 + rnd() * 0.4})`
    g.beginPath()
    g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 3 + rnd() * 7, 0, Math.PI * 2)
    g.fill()
  }
  g.filter = 'none'
}

/** Transición: un salpicón de lodo crece hasta tapar la pantalla y cae, revelando la toma siguiente en `at`. */
export function mudWipe(tl, layer, { at, seed = 21 }) {
  const S = 2600
  const c = el('canvas', 'mud-full', layer)
  c.width = c.height = S
  c.style.cssText = `left:${(W - S) / 2}px;top:${(H - S) / 2}px;width:${S}px;height:${S}px;`
  drawMudCover(c, seed)
  tl.set(c, { opacity: 0 }, 0)
  // El salpicón golpea la cámara ya grande y termina de cubrir en unos cuadros.
  tl.fromTo(c, { opacity: 1, scale: 0.32, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.14, ease: 'power2.out' }, at - 0.14)
  tl.to(c, { y: H * 1.25, duration: 0.34, ease: 'power2.in' }, at + 0.06)
  tl.set(c, { opacity: 0, y: 0 }, at + 0.42)
}

// ─── Partículas de tierra y piedras ──────────────────────────────────────────

/** Ráfaga desde `origin` hacia cámara/afuera, con gravedad. */
export function debris(tl, layer, { origin = [540, 1500], start, count = 26, seed = 5, spread = 1 }) {
  const rnd = prng(seed)
  for (let i = 0; i < count; i++) {
    const s = 8 + rnd() * 30
    const p = el('i', 'stone', layer)
    const pts = Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * Math.PI * 2
      const r = 50 * (0.6 + rnd() * 0.4)
      return `${50 + Math.cos(a) * r}% ${50 + Math.sin(a) * r}%`
    })
    p.style.cssText = `left:${origin[0]}px;top:${origin[1]}px;width:${s}px;height:${s}px;clip-path:polygon(${pts.join(',')});background:${rnd() > 0.5 ? '#2b211a' : '#5a4636'};`
    const vx = (rnd() - 0.5) * 1400 * spread
    const vy = -(400 + rnd() * 1100) * spread
    const dur = 0.7 + rnd() * 0.5
    const t0 = start + rnd() * 0.12
    const kf = []
    for (let k = 1; k <= 6; k++) {
      const tt = (k / 6) * dur
      kf.push({ x: vx * tt, y: vy * tt + 0.5 * 2600 * tt * tt, rotation: (rnd() - 0.5) * 720 * (k / 6), duration: dur / 6, ease: 'none' })
    }
    tl.set(p, { opacity: 0, x: 0, y: 0 }, 0)
    tl.set(p, { opacity: 1 }, t0)
    tl.to(p, { keyframes: kf }, t0)
    tl.set(p, { opacity: 0 }, t0 + dur)
  }
  // Nube de polvo
  for (let i = 0; i < 6; i++) {
    const d = el('i', 'dust', layer)
    const size = 260 + rnd() * 260
    d.style.cssText = `left:${origin[0] - size / 2 + (rnd() - 0.5) * 200}px;top:${origin[1] - size / 2}px;width:${size}px;height:${size}px;`
    tl.set(d, { opacity: 0 }, 0)
    tl.fromTo(d, { opacity: 0.85, scale: 0.3 }, { opacity: 0, scale: 1.8, y: -120 - rnd() * 160, duration: 1.1, ease: 'power2.out' }, start + i * 0.03)
  }
}

// ─── Destello ─────────────────────────────────────────────────────────────────

export function flash(tl, layer, { at, color = '#fff6e0' }) {
  const f = el('div', 'flash', layer)
  f.style.background = color
  tl.set(f, { opacity: 0 }, 0)
  tl.to(f, { opacity: 0.9, duration: 0.06 }, at - 0.06)
  tl.to(f, { opacity: 0, duration: 0.22 }, at)
}

// ─── Cierre ───────────────────────────────────────────────────────────────────

export function closing(tl, layer, { start, end, brand = 'K-SI NUEVOS', place = 'CUENCA · ECUADOR', cta, accent }) {
  const wrap = el(
    'div',
    'closing',
    layer,
    `<div class="shade"></div><div class="tracks"><i></i><i></i></div>` +
      `<div class="plate big"><span>${esc(brand)}</span><i class="hazard"></i></div>` +
      `<p class="place">${esc(place)}</p>` +
      (cta ? `<p class="cta">${esc(cta)}</p>` : '')
  )
  wrap.style.setProperty('--accent', accent)
  const [shade, tracks, plateEl, placeEl, ctaEl] = wrap.children
  window_(tl, wrap, start, end)
  tl.fromTo(shade, { opacity: 0 }, { opacity: 1, duration: 0.3 }, start)
  tl.fromTo(tracks, { y: -400 }, { y: 0, duration: end - start, ease: 'none' }, start)
  tl.fromTo(plateEl, { x: -900, rotation: -6 }, { x: 0, rotation: -2, duration: 0.45, ease: 'back.out(1.5)' }, start + 0.05)
  tl.fromTo(placeEl, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, start + 0.45)
  if (ctaEl) tl.fromTo(ctaEl, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, start + 0.75)
}

// ─── Texto chico sobre un título (ej. MODO) ──────────────────────────────────

export function kicker(tl, layer, { text, x, y, start, end, accent }) {
  const node = el('div', 'kicker', layer, esc(text))
  node.style.cssText = `left:${x}px;top:${y}px;color:${accent};`
  tl.set(node, { opacity: 0, xPercent: -50 }, 0)
  tl.fromTo(node, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, start)
  tl.to(node, { opacity: 0, duration: 0.15 }, end - 0.15)
}

// ─── Sacudida de cámara ──────────────────────────────────────────────────────

/** Sacude `target` (toda la imagen) unos cuadros a partir de `at`. */
export function shake(tl, target, { at, seed = 3, strength = 26 }) {
  const rnd = prng(seed)
  const kf = []
  for (let k = 0; k < 7; k++) {
    const f = strength * (1 - k / 7)
    kf.push({ x: (rnd() - 0.5) * 2 * f, y: (rnd() - 0.5) * 2 * f, rotation: (rnd() - 0.5) * f * 0.06, duration: 0.045, ease: 'none' })
  }
  kf.push({ x: 0, y: 0, rotation: 0, duration: 0.05, ease: 'none' })
  tl.to(target, { keyframes: kf }, at)
}
