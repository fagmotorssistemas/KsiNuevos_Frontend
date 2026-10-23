/**
 * Formato familiar (SUV y autos de familia). Dibuja lo que deja compose-familiar.ts en #reel-data:
 * todos los tiempos y posiciones ya vienen resueltos (y lejos de la cara de la persona).
 */

import { createStage, addTitle3D } from './pieces3d.js'

const R = JSON.parse(document.getElementById('reel-data').textContent)
const $ = (id) => document.getElementById(id)
const fx = $('fx')
const gfx = $('gfx')
const caps = $('caps')
const top = $('top')
const A = R.accent
const C = { coral: '#FF6B4A', sky: '#3BA7FF', mint: '#2ED3A0', sun: '#FFB020', navy: '#0F1B2D' }
$('root').style.setProperty('--accent', A)
const NS = 'http://www.w3.org/2000/svg'

const tl = gsap.timeline({ paused: true })

function el(tag, cls, parent, html, style) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  if (style) e.style.cssText = style
  parent.appendChild(e)
  return e
}
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Entra con rebote y sale con fundido. */
function pop(node, start, end, from = { scale: 0.6, y: 40 }) {
  tl.set(node, { opacity: 0 }, 0)
  tl.fromTo(node, { opacity: 0, ...from }, { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, start)
  tl.to(node, { opacity: 0, scale: 0.92, duration: 0.2 }, Math.max(start + 0.5, end - 0.2))
}

/** Contenedor de una pieza: banda que eligió el compositor, escalada si tuvo que achicarse. */
function holder(p, base = 1) {
  return el('div', 'fm-holder', gfx, '', `top:${p.top}px;transform:scale(${base * p.scale})`)
}

/** Cifra que cuenta desde 0 (o desde unos años antes, si es un año) hasta su valor; el resto del texto queda. */
function countUp(node, text, at, dur = 0.6) {
  const m = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(.*)$/.exec(text)
  // Solo cifras sueltas (14.000, 2026., 14.000 km); no "4x2" ni "2.0".
  if (!m || !/^(?:\s.*|[.,;:!?…)"»]*)$/.test(m[2])) return
  const sep = /[.,]/.exec(m[1])?.[0] ?? null
  const target = Number(m[1].replace(/[.,]/g, ''))
  if (!Number.isFinite(target) || target < 3) return
  const from = !sep && target >= 1950 && target <= 2035 ? target - 20 : 0
  const fmt = (n) => {
    const s = String(Math.round(n))
    return (sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : s) + m[2]
  }
  const o = { v: from }
  const set = () => (node.textContent = fmt(o.v))
  tl.fromTo(o, { v: from }, { v: target, duration: dur, ease: 'power2.out', immediateRender: false, onUpdate: set, onComplete: set }, at)
}

/** Emoji que salta junto a una pieza y flota mientras está en pantalla. */
function sticker(p, parent, x, y) {
  if (!p.emoji) return
  const e = el('div', 'fm-emoji', parent, esc(p.emoji), `left:${x}px;top:${y}px`)
  tl.set(e, { opacity: 0 }, 0)
  tl.fromTo(e, { opacity: 0, scale: 0.2, rotation: -35 }, { opacity: 1, scale: 1, rotation: 8, duration: 0.45, ease: 'back.out(3)' }, p.start + 0.3)
  tl.to(e, { y: -14, rotation: -4, duration: 0.55, yoyo: true, repeat: 3, ease: 'sine.inOut' }, p.start + 0.75)
  tl.to(e, { opacity: 0, scale: 0.6, duration: 0.2 }, Math.max(p.start + 0.8, p.end - 0.2))
}

/**
 * Aparece de golpe en `at` y se va con `out`. La primera animación siempre parte invisible: así, aunque
 * el render salte hacia atrás en la línea de tiempo, nada queda a la vista antes de tiempo.
 */
function burst(node, at, show, out, dur) {
  tl.set(node, { opacity: 0 }, 0)
  tl.fromTo(node, { opacity: 0 }, { ...show, duration: 0.03, immediateRender: false }, at - 0.03)
  tl.to(node, { ...out, duration: dur, ease: 'power2.out' }, at)
}

function flash(at, peak = 0.85) {
  burst(el('div', 'fm-flash', top), at, { opacity: peak }, { opacity: 0 }, 0.32)
}

function ripple(parent, x, y, at, style = '') {
  const r = el('div', 'fm-ripple', parent, '', `left:${x - 60}px;top:${y - 60}px;${style}`)
  tl.set(r, { scale: 0.3 }, 0)
  burst(r, at, { opacity: 0.95 }, { opacity: 0, scale: 1.9 }, 0.7)
}

const ICONS = {
  pantalla: '<rect x="6" y="9" width="36" height="24" rx="4"/><path d="M18 39h12M24 33v6"/>',
  volante: '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="5"/><path d="M7 22h12M29 22h12M24 29v12"/>',
  motor: '<path d="M8 18h6l3-4h12l3 4h6v16H8z"/><path d="M4 22v8M44 22v8M18 26h12"/>',
  traccion: '<path d="M16 42l4-36M32 42l-4-36M24 10v6M24 22v6M24 34v6"/>',
  asiento: '<path d="M14 6h12l2 22H16z"/><path d="M12 28h22l2 8H12z"/><path d="M16 36v6M32 36v6"/>',
  maleta: '<rect x="7" y="14" width="34" height="26" rx="4"/><path d="M18 14V8h12v6M7 24h34"/>',
  camara: '<rect x="5" y="14" width="38" height="26" rx="5"/><path d="M17 14l3-6h8l3 6"/><circle cx="24" cy="27" r="7"/>',
  aire: '<path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20"/><path d="M19 7l5 5 5-5M19 41l5-5 5 5"/>',
  seguridad: '<path d="M24 4l16 6v12c0 10-7 17-16 22C15 39 8 32 8 22V10z"/><path d="M17 24l5 5 9-10"/>',
  combustible: '<rect x="8" y="8" width="20" height="34" rx="3"/><path d="M8 20h20M28 14l8 6v16a3 3 0 0 0 6 0V22"/>',
  caja: '<circle cx="12" cy="10" r="3"/><circle cx="24" cy="10" r="3"/><circle cx="36" cy="10" r="3"/><circle cx="12" cy="38" r="3"/><circle cx="24" cy="38" r="3"/><path d="M12 13v22M24 13v22M36 13v11H12"/>',
  llave: '<circle cx="15" cy="24" r="9"/><path d="M24 24h18M36 24v7M42 24v5"/>',
  estrella: '<path d="M24 5l5.6 12 13 1.5-9.7 8.8 2.7 12.9L24 33.6 12.4 40.2l2.7-12.9-9.7-8.8 13-1.5z"/>',
}
const icon = (name) => `<svg viewBox="0 0 48 48">${ICONS[name] ?? ICONS.estrella}</svg>`
const WA =
  '<svg viewBox="0 0 48 48"><path d="M8 40l3-9a16 16 0 1 1 6 6z"/><path d="M18 17c0 7 6 13 13 13l3-3-4-3-2 2c-3-1-5-3-6-6l2-2-3-4z" style="fill:#fff;stroke:none"/></svg>'
const PIN = '<svg viewBox="0 0 48 48"><path d="M24 43s14-13 14-24a14 14 0 0 0-28 0c0 11 14 24 14 24z"/><circle cx="24" cy="19" r="5"/></svg>'
const CAR = (color) =>
  `<svg viewBox="0 0 64 40" width="84" height="52"><rect x="4" y="13" width="56" height="17" rx="7" fill="${color}"/>` +
  `<path d="M15 13l7-9h20l7 9z" fill="${color}"/><rect x="24" y="6" width="16" height="7" rx="2" fill="#fff" opacity=".85"/>` +
  `<circle cx="18" cy="31" r="6" fill="${C.navy}"/><circle cx="46" cy="31" r="6" fill="${C.navy}"/></svg>`

await Promise.all(['800 54px poppins', '500 28px poppins', '700 60px fredoka'].map((f) => document.fonts.load(f)))

// Cámara: acercamiento suave en cada corte
for (const c of R.cuts) tl.fromTo(`#${c.id}`, { scale: 1 }, { scale: 1.07, duration: Math.max(0.3, c.end - c.start), ease: 'none' }, c.start)

// Luz cálida del gancho
const leak = el('div', 'fm-leak', fx)
tl.set(leak, { opacity: 0 }, 0)
if (R.leak.end > 0) {
  tl.to(leak, { opacity: 1, duration: 0.25 }, R.leak.start)
  tl.to(leak, { opacity: 0.25, duration: 1.4 }, R.leak.start + 0.6)
  tl.to(leak, { opacity: 0, duration: 0.3 }, Math.max(R.leak.start + 2, R.leak.end - 0.3))
}

// Títulos 3D vivos: rebotan al entrar, flotan, les pasa un brillo y salen volando
const stage = createStage($('stage3d'))
for (const t of R.titles) await addTitle3D(stage, { ...t, font: 'fredoka', finish: R.finish, accent: A, alive: true, exit: 'volar' })

// ─── Piezas ───────────────────────────────────────────────────────────────────

const PIECES = {
  chips(p) {
    const h = holder(p)
    if (p.layout === 'fila') {
      const row = el('div', 'fm-row', h, '', 'top:0')
      p.items.forEach((t, i) => pop(el('div', 'fm-chip', row, esc(t)), p.start + i * 0.12, p.end, { scale: 0.4, y: 30, rotation: -12 }))
    } else {
      p.items.forEach((t, i) =>
        pop(el('div', 'fm-chip', h, esc(t), `left:${70 + i * 40}px;top:${i * 105}px`), p.start + i * 0.18, p.end, { x: -300, scale: 0.9, rotation: -8 })
      )
      sticker(p, h, 70 + (p.items.length - 1) * 40 + 430, (p.items.length - 1) * 105 - 20)
    }
  },

  dato(p) {
    const h = holder(p)
    const node = el('div', 'fm-glass fm-fact', h, `${p.label ? `<small>${esc(p.label)}</small>` : ''}<b>${esc(p.value)}</b>`, 'right:80px;top:10px;transform:rotate(4deg)')
    pop(node, p.start, p.end, { scale: 0.3, rotation: -20, y: 80 })
    countUp(node.querySelector('b'), p.value, p.start + 0.15, 0.55)
    tl.to(node, { rotation: 0, duration: 0.1, yoyo: true, repeat: 3, ease: 'sine.inOut' }, p.start + 0.75)
    sticker(p, h, 470, -40)
  },

  contador(p) {
    const chars = [...p.value]
    const digits = chars.filter((ch) => /\d/.test(ch)).length
    const width = Math.max(560, 104 + digits * 116 + (chars.length - digits) * 42 + (p.unit ? 30 + p.unit.length * 44 : 0))
    const h = holder(p, 0.85 * Math.min(1, 1000 / width))
    const card = el('div', 'fm-glass', h, '', `left:${(1080 - width) / 2}px;top:0;width:${width}px;height:330px`)
    if (p.label) el('div', 'fm-counter-label', card, esc(p.label))
    const row = el('div', 'fm-digits', card)
    let i = 0
    for (const ch of chars) {
      if (!/\d/.test(ch)) {
        el('div', 'fm-sep', row, esc(ch))
        continue
      }
      const box = el('div', 'fm-digit', row)
      const strip = el('div', 'strip', box, Array.from({ length: 11 }, (_, k) => `<b>${k % 10}</b>`).join(''))
      const steps = ch === '0' ? 10 : Number(ch)
      tl.set(strip, { y: 0 }, 0)
      tl.to(strip, { y: -150 * steps, duration: 0.75, ease: 'power3.out' }, p.start + 0.23 + i++ * 0.07)
      // Cada dígito da un saltito al llegar
      tl.fromTo(box, { scale: 1 }, { scale: 1.12, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.out', immediateRender: false }, p.start + 0.9 + i * 0.07)
    }
    if (p.unit) el('div', 'fm-unit', row, esc(p.unit))
    if (p.note) {
      const note = el('div', 'fm-note', card, esc(p.note))
      tl.set(note, { opacity: 0 }, 0)
      tl.fromTo(note, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.3 }, p.start + 1.43)
    }
    pop(card, p.start, p.end, { scale: 0.85, y: -40 })
    sticker(p, h, (1080 + width) / 2 - 70, -50)
  },

  tarjeta(p) {
    const h = holder(p)
    const right = p.side === 'derecha'
    const card = el('div', 'fm-glass fm-card', h, '', `${right ? 'right' : 'left'}:60px;top:0`)
    const ic = el('div', 'fm-icon', card, icon(p.icon), `background:${A}`)
    const txt = el('div', '', card)
    const title = el('h4', '', txt, esc(p.title))
    tl.set(card, { opacity: 0 }, 0)
    tl.fromTo(card, { opacity: 0, x: right ? 500 : -500 }, { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.4)' }, p.start)
    tl.to(card, { opacity: 0, x: right ? 200 : -200, duration: 0.25 }, Math.max(p.start + 0.6, p.end - 0.25))
    // El ícono se dibuja, el título entra y el detalle se escribe solo
    tl.fromTo(ic, { scale: 0.4, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.5)' }, p.start + 0.12)
    for (const g of ic.querySelectorAll('path, rect, circle')) {
      const L = g.getTotalLength ? g.getTotalLength() : 0
      if (!L) continue
      g.style.strokeDasharray = `${L}`
      tl.fromTo(g, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out' }, p.start + 0.2)
    }
    tl.fromTo(title, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, p.start + 0.18)
    if (p.text) {
      const para = el('p', '', txt, '<span class="typed"></span><span class="ghost"></span>')
      const typed = para.firstChild
      const ghost = para.lastChild
      ghost.textContent = p.text
      const o = { n: 0 }
      const set = () => {
        const n = Math.round(o.n)
        typed.textContent = p.text.slice(0, n)
        ghost.textContent = p.text.slice(n)
      }
      tl.fromTo(o, { n: 0 }, { n: p.text.length, duration: Math.min(0.9, p.text.length * 0.03), ease: 'none', immediateRender: false, onUpdate: set, onComplete: set }, p.start + 0.4)
    }
    sticker(p, h, right ? 1080 - 60 - 604 - 70 : 60 + 604 - 30, -30)
    if (p.tap) {
      const [x, y] = p.tap
      for (let k = 0; k < 3; k++) ripple(gfx, x, y, p.start + 0.4 + k * 0.12)
    }
  },

  asientos(p) {
    const h = holder(p, 0.85)
    const rows = [[2]]
    for (let left = p.count - 2; left > 0; left -= 3) rows.push([Math.min(3, left)])
    const height = 150 + rows.length * 175
    const card = el('div', 'fm-glass', h, '', `left:330px;top:0;width:420px;height:${height}px`)
    el('div', 'fm-seats-title', card, esc(p.title))
    el('div', 'fm-seats-car', card, '', `height:${rows.length * 175 + 10}px`)
    const colors = [A, C.sky, C.mint, C.sun, C.coral, C.sky, C.mint, C.sun, C.coral]
    let n = 0
    rows.forEach(([count], r) => {
      const y = 160 + r * 175
      const xs = count === 3 ? [92, 165, 238] : [110, 220]
      xs.slice(0, count).forEach((x) => {
        const seat = el('div', `fm-seat${r === 0 ? ' front' : ''}`, card, '', `left:${x}px;top:${y}px`)
        const a = el('div', 'fm-avatar', seat, '', `background:${colors[n % colors.length]}`)
        tl.set(a, { scale: 0 }, 0)
        tl.to(a, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, p.start + 0.25 + n * 0.17)
        tl.fromTo(a, { y: 0 }, { y: -10, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.out', immediateRender: false }, p.start + 1.3 + n * 0.06)
        n++
      })
    })
    pop(card, p.start, p.end, { scale: 0.7, y: 80, rotation: 6 })
    sticker(p, h, 700, -40)
  },

  ruta(p) {
    const h = holder(p, 0.86)
    const card = el('div', 'fm-glass', h, '', 'left:60px;top:0;width:960px;height:560px')
    el('div', 'fm-route-title', card, esc(p.title))
    if (p.text) el('div', 'fm-route-text', card, esc(p.text))
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', '960')
    svg.setAttribute('height', '560')
    svg.style.cssText = 'position:absolute;left:0;top:0'
    card.appendChild(svg)
    const d = 'M110 470 C 260 300, 380 470, 500 330 S 760 220, 860 300'
    const mk = (stroke, width) => {
      const path = document.createElementNS(NS, 'path')
      path.setAttribute('d', d)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', stroke)
      path.setAttribute('stroke-width', String(width))
      path.setAttribute('stroke-linecap', 'round')
      svg.appendChild(path)
      return path
    }
    mk('rgba(15,27,45,.12)', 14)
    const path = mk(A, 12)
    const L = path.getTotalLength()
    path.setAttribute('stroke-dasharray', `${L} ${L}`)
    const car = el('div', '', card, CAR(A), 'position:absolute;left:0;top:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.3))')
    const prog = { p: 0 }
    const place = () => {
      path.setAttribute('stroke-dashoffset', String(L * (1 - prog.p)))
      const pt = path.getPointAtLength(L * prog.p)
      car.style.transform = `translate(${pt.x - 42}px, ${pt.y - 62}px)`
    }
    place()
    const drawAt = p.start + 0.1
    const drawDur = Math.max(0.8, Math.min(1.7, p.end - p.start - 0.7))
    tl.to(prog, { p: 1, duration: drawDur, ease: 'power1.inOut', onUpdate: place }, drawAt)
    const fracs = p.stops.length === 3 ? [0, 0.5, 1] : [0, 1]
    const colors = [A, C.sun, C.sky]
    p.stops.forEach((name, i) => {
      const pt = path.getPointAtLength(L * fracs[i])
      const pin = el('div', 'fm-pin', card, PIN, `left:${pt.x - 36}px;top:${pt.y - 84}px;background:${colors[i]}`)
      const label = el('div', 'fm-stop', card, esc(name), `left:${pt.x - 120}px;top:${pt.y + 12}px`)
      tl.set([pin, label], { opacity: 0 }, 0)
      tl.fromTo([pin, label], { opacity: 0, scale: 0.3, y: -30 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(3)' }, drawAt - 0.05 + fracs[i] * drawDur)
    })
    pop(card, p.start, p.end, { scale: 0.85, y: -60 })
    sticker(p, h, 960, -40)
  },

  whatsapp(p) {
    const h = holder(p, 0.9)
    const card = el('div', 'fm-glass', h, '', 'left:110px;top:0;width:860px;height:380px;text-align:center')
    el('div', '', card, esc(p.title), 'margin-top:50px;font:800 56px poppins')
    const btn = el('div', 'fm-btn', card, `${WA}<span>${esc(p.button)}</span>`, `margin:44px auto 0;width:740px;height:126px;background:${A};box-shadow:0 18px 40px rgba(0,0,0,.25)`)
    pop(card, p.start, p.end, { y: 300, scale: 1, rotation: -4 })
    tl.to(btn, { scale: 1.06, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' }, p.start + 0.45)
    // Un toque al botón
    ripple(card, 430, 224, p.start + 1.1, 'border-color:#fff')
    tl.fromTo(btn, { scale: 1 }, { scale: 0.93, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, p.start + 1.1)
    sticker(p, h, 900, -40)
  },

  seguir(p) {
    const h = holder(p)
    const card = el('div', 'fm-glass', h, '', 'left:150px;top:0;width:780px;height:170px;display:flex;align-items:center;gap:26px;padding:0 34px')
    el('div', '', card, 'K-SI', `width:110px;height:110px;border-radius:50%;background:${C.navy};color:#fff;display:grid;place-items:center;font:800 34px poppins;flex:none`)
    el('div', '', card, `<div style="font:800 40px poppins">K-SI NUEVOS</div><div style="font:500 26px/1.2 poppins;color:rgba(15,27,45,.6)">${esc(p.text)}</div>`, 'flex:1')
    const wrap = el('div', '', card, '', 'position:relative;width:210px;height:84px;flex:none')
    const follow = el('div', 'fm-btn', wrap, 'Seguir', `position:absolute;inset:0;font-size:34px;background:${C.sky}`)
    const following = el('div', 'fm-btn', wrap, 'Siguiendo ✓', `position:absolute;inset:0;font-size:30px;background:${C.mint}`)
    const flip = p.start + 0.8
    tl.set(following, { opacity: 0 }, 0)
    tl.to(follow, { scale: 0.88, duration: 0.12, yoyo: true, repeat: 1 }, flip - 0.12)
    tl.set(following, { opacity: 1 }, flip)
    tl.set(follow, { opacity: 0 }, flip)
    tl.fromTo(following, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', immediateRender: false }, flip)
    ;[[820, C.coral, 0], [740, C.sun, 0.15], [890, C.sky, 0.3]].forEach(([x, color, d]) => {
      const heart = el('div', '', h, '❤', `position:absolute;left:${x}px;top:-70px;font-size:${d ? 64 : 90}px;color:${color}`)
      tl.set(heart, { scale: 0.2, rotation: -15 }, 0)
      burst(heart, flip + d, { opacity: 1 }, { scale: 1.3, y: -140, rotation: 15 }, 0.8)
      tl.to(heart, { opacity: 0, duration: 0.25 }, flip + d + 0.6)
    })
    pop(card, p.start, p.end, { y: -80, scale: 0.9 })
    sticker(p, h, 90, -60)
  },
}

for (const p of R.pieces) PIECES[p.kind]?.(p)

// ─── Movimiento del video ─────────────────────────────────────────────────────

/** Fondo de color detrás de la toma que entra (si la anterior ya terminó, no queda negro). */
function backdrop(i, at, dur) {
  const shotEl = $(`shot${i}`)
  if (!shotEl) return
  const b = document.createElement('div')
  b.className = 'fm-backdrop'
  b.style.zIndex = shotEl.style.zIndex
  shotEl.parentNode.insertBefore(b, shotEl)
  tl.set(b, { opacity: 0 }, 0)
  tl.set(b, { opacity: 1 }, at)
  tl.set(b, { opacity: 0 }, at + dur)
}

// Transición de entrada en cada toma
for (const tr of R.transitions) {
  const shot = `#shot${tr.i}`
  const at = tr.at
  if (tr.kind === 'zoom') {
    tl.fromTo(shot, { scale: 1.35, filter: 'blur(10px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.32, ease: 'power3.out' }, at)
  } else if (tr.kind === 'barrido') {
    backdrop(tr.i, at, 0.3)
    tl.fromTo(shot, { x: 1080, filter: 'blur(14px)' }, { x: 0, filter: 'blur(0px)', duration: 0.3, ease: 'power3.out' }, at)
  } else if (tr.kind === 'circulo') {
    backdrop(tr.i, at, 0.43)
    tl.fromTo(shot, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 0.42, ease: 'power2.inOut' }, at)
    tl.set(shot, { clipPath: 'none' }, at + 0.43)
  } else if (tr.kind === 'destello' || tr.kind === 'foto') {
    flash(at, tr.kind === 'foto' ? 1 : 0.85)
    tl.fromTo(shot, { scale: 1.08 }, { scale: 1, duration: 0.35, ease: 'power2.out' }, at)
  } else if (tr.kind === 'luz') {
    const sw = el('div', 'fm-swipe', top)
    tl.set(sw, { x: -800, opacity: 0 }, 0)
    tl.fromTo(sw, { x: -800, opacity: 1 }, { x: 1400, duration: 0.42, ease: 'power2.inOut', immediateRender: false }, at - 0.21)
    tl.set(sw, { opacity: 0 }, at + 0.22)
  } else if (tr.kind === 'brillo') {
    const sh = el('div', 'fm-shine', fx)
    tl.set(sh, { x: -1200, opacity: 0 }, 0)
    tl.set(sh, { opacity: 1 }, at)
    tl.to(sh, { x: 1200, duration: 1.1, ease: 'power2.inOut' }, at)
    tl.set(sh, { opacity: 0 }, at + 1.1)
  }
}

// Zoom de golpe en las palabras clave y pulsos al ritmo en las tomas sin habla
for (const t of R.punches) {
  tl.fromTo('#world', { scale: 1 }, { scale: 1.1, duration: 0.09, ease: 'power2.out', immediateRender: false }, t)
  tl.fromTo('#world', { scale: 1.1 }, { scale: 1, duration: 0.38, ease: 'power2.inOut', immediateRender: false }, t + 0.09)
}
for (const t of R.pulses) {
  tl.fromTo('#world', { scale: 1 }, { scale: 1.035, duration: 0.06, ease: 'power1.out', immediateRender: false }, t)
  tl.fromTo('#world', { scale: 1.035 }, { scale: 1, duration: 0.24, ease: 'power1.in', immediateRender: false }, t + 0.06)
}

// Barra de progreso arriba
{
  const bar = el('div', 'fm-progress', top)
  const fill = el('div', '', bar)
  tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: R.duration, ease: 'none' }, 0)
}

// ─── Subtítulos: palabra por palabra; la píldora crece con cada palabra y una caja de color
// va detrás de la que suena ───

for (const g of R.captions.groups) {
  const pill = el('div', 'fm-cap', caps)
  const bg = el('div', 'fm-cap-bg', pill)
  const hl = el('div', 'fm-cap-hl', pill)
  const spans = g.words.map((w) => ({ w, s: el('span', w.key ? 'fm-w key' : 'fm-w', pill, esc(w.text)) }))
  tl.set(pill, { opacity: 0, xPercent: -50 }, 0)
  tl.fromTo(pill, { opacity: 0, scale: 0.85, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: 'back.out(2)' }, g.start)
  tl.set(pill, { opacity: 0 }, g.end)
  tl.set(hl, { opacity: 0 }, 0)
  spans.forEach(({ w, s }, i) => {
    const t = Math.max(g.start, w.start - 0.03)
    const next = spans[i + 1] ? Math.max(g.start, spans[i + 1].w.start - 0.03) : g.end
    tl.set(s, { opacity: 0, color: w.key ? A : C.navy }, 0)
    tl.fromTo(s, { opacity: 0, scale: 0.3, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'back.out(3)', immediateRender: false }, t)
    const box = { x: s.offsetLeft - 12, y: s.offsetTop, width: s.offsetWidth + 24, height: s.offsetHeight }
    if (i === 0) tl.set(hl, { opacity: 1, ...box }, t)
    else tl.to(hl, { ...box, duration: 0.12, ease: 'power2.out' }, t)
    const reach = Math.max(...spans.slice(0, i + 1).map(({ s: x }) => x.offsetLeft + x.offsetWidth)) + 38
    if (i === 0) tl.set(bg, { width: reach }, 0)
    else tl.to(bg, { width: reach, duration: 0.14, ease: 'power2.out' }, t)
    tl.set(s, { color: '#fff' }, t)
    if (next < g.end) tl.set(s, { color: w.key ? A : C.navy }, next)
    if (w.key) {
      tl.fromTo(s, { rotation: -9 }, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)', immediateRender: false }, t)
      countUp(s, w.text, t, Math.min(0.55, Math.max(0.3, w.end - w.start)))
    }
  })
}

// ─── Cierre: tarjeta K-SI NUEVOS con botón de WhatsApp ───────────────────────

{
  const k = R.closing
  const tail = $('vtail')
  if (tail) tail.style.filter = 'blur(18px) saturate(1.2)'
  const veil = el('div', '', top, '', 'position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,236,226,.6))')
  tl.set(veil, { opacity: 0 }, 0)
  tl.to(veil, { opacity: 1, duration: 0.3 }, k.start - 0.05)
  const card = el('div', 'fm-glass', top, '', 'left:90px;top:540px;width:900px;height:820px;text-align:center')
  const brand = el('div', '', card, 'K-SI <span style="color:#E3122C">NUEVOS</span>', 'margin-top:90px;font:800 96px poppins;letter-spacing:2px')
  el('div', '', card, esc(k.place), 'margin-top:6px;font:800 30px poppins;letter-spacing:12px;color:rgba(15,27,45,.55)')
  el('div', '', card, esc(k.line), 'margin:60px 70px 0;font:500 46px/1.35 poppins')
  const btn = el('div', 'fm-btn', card, `${WA}<span>${esc(k.button)}</span>`, `margin:60px auto 0;width:560px;height:126px;background:${A};box-shadow:0 18px 40px rgba(0,0,0,.25)`)
  tl.set(card, { opacity: 0 }, 0)
  tl.fromTo(card, { opacity: 0, y: 160, rotation: -3 }, { opacity: 1, y: 0, rotation: 0, duration: 0.55, ease: 'back.out(1.5)' }, k.start + 0.1)
  tl.fromTo(brand, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)', immediateRender: false }, k.start + 0.15)
  tl.to(btn, { scale: 1.07, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut' }, k.start + 0.9)
  ;[[150, 380, 46, C.sky], [930, 430, 30, C.sun], [880, 1450, 54, C.mint], [170, 1500, 34, A], [520, 1560, 26, C.sky]].forEach(([x, y, s, c], i) => {
    const b = el('div', '', top, '', `position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:${c}`)
    tl.set(b, { opacity: 0 }, 0)
    tl.fromTo(b, { opacity: 0, scale: 0 }, { opacity: 0.85, scale: 1, duration: 0.4, ease: 'back.out(3)' }, k.start + 0.3 + i * 0.08)
    tl.to(b, { y: -40 - i * 8, duration: 2, ease: 'sine.inOut' }, k.start + 0.6)
  })
}

const clock = { t: 0 }
tl.to(clock, { t: R.duration, duration: R.duration, ease: 'none', onUpdate: () => stage.renderAt(clock.t) }, 0)
stage.renderAt(0)

window.__timelines = { root: tl }
