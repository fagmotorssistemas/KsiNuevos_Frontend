/**
 * Formato premium (autos de lujo). Dibuja lo que deja compose-premium.ts en #reel-data:
 * todos los tiempos y posiciones ya vienen resueltos (y lejos de la cara de la persona).
 */

import { createStage, addTitle3D } from './pieces3d.js'

const R = JSON.parse(document.getElementById('reel-data').textContent)
const $ = (id) => document.getElementById(id)
const fx = $('fx')
const gfx = $('gfx')
const caps = $('caps')
const top = $('top')
const root = $('root')
root.style.setProperty('--gold', R.accent)
root.style.setProperty('--gold2', R.light)
root.style.setProperty('--gold3', R.deep)

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

/** Entrada lenta y elegante (sube y aparece), salida con fundido. */
function rise(node, start, end, dy = 30, dur = 0.7) {
  tl.set(node, { opacity: 0 }, 0)
  tl.fromTo(node, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out' }, start)
  tl.to(node, { opacity: 0, duration: 0.35 }, Math.max(start + dur, end - 0.35))
}

function holder(p) {
  return el('div', 'pm-holder', gfx, '', `top:${p.top}px;transform:scale(${p.scale})`)
}

const SHADOW = 'drop-shadow(0 4px 12px rgba(0,0,0,.75))'

/**
 * Texto que aparece letra por letra, de desenfocado a nítido; si es dorado, después le pasa un brillo.
 * `node` queda con una letra por <span> (los espacios se mantienen).
 */
function reveal(node, start, end, { gold = false, stagger = 0.035, dy = 18 } = {}) {
  const text = node.textContent
  node.textContent = ''
  const letters = [...text].map((ch) => {
    const sp = el('span', gold ? 'pm-ch pm-gold' : 'pm-ch', node)
    sp.textContent = ch
    return sp
  })
  const blur = (px) => (gold ? `blur(${px}px) ${SHADOW}` : `blur(${px}px)`)
  tl.set(letters, { opacity: 0 }, 0)
  tl.fromTo(
    letters,
    { opacity: 0, y: dy, filter: blur(10) },
    { opacity: 1, y: 0, filter: blur(0), duration: 0.5, ease: 'power3.out', stagger, immediateRender: false },
    start
  )
  if (gold) shimmer(letters, start + 0.35 + letters.length * stagger)
  tl.to(letters, { opacity: 0, duration: 0.3 }, Math.max(start + 0.6, end - 0.3))
  return letters
}

/** Brillo que recorre un texto dorado (el degradado se desliza de derecha a izquierda). */
function shimmer(nodes, at) {
  tl.fromTo(nodes, { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 0.9, ease: 'power2.inOut', stagger: 0.025, immediateRender: false }, at)
}

await Promise.all(['400 54px playfair', '700 64px playfair', '300 34px mont', '600 24px mont'].map((f) => document.fonts.load(f)))

// Imagen con contraste de cine y viñeta; el cierre queda oscuro y desenfocado
for (const v of document.querySelectorAll('video.media')) {
  v.style.filter = v.id === 'vtail' ? 'brightness(.22) blur(6px) saturate(.6)' : 'brightness(.78) contrast(1.12) saturate(.82)'
}
el('div', 'pm-grade', fx)
// Cámara que se aleja lento en cada toma
for (const c of R.cuts) tl.fromTo(`#${c.id}`, { scale: 1.08 }, { scale: 1, duration: Math.max(0.3, c.end - c.start), ease: 'none' }, c.start)

// Franjas de cine que se cierran en el segundo 0
const barTop = el('div', 'pm-bar', top, '', 'top:0')
const barBot = el('div', 'pm-bar', top, '', 'bottom:0')
tl.fromTo(barTop, { y: -150 }, { y: 0, duration: 0.5, ease: 'power3.out' }, 0)
tl.fromTo(barBot, { y: 150 }, { y: 0, duration: 0.5, ease: 'power3.out' }, 0)

// Fundido a negro entre tomas (corto) y en las transiciones "negro" (largo)
const black = el('div', 'pm-black', top)
tl.set(black, { opacity: 0 }, 0)
for (const t of R.dips) {
  tl.to(black, { opacity: 0.55, duration: 0.12 }, t - 0.12)
  tl.to(black, { opacity: 0, duration: 0.25 }, t)
}
for (const t of R.blacks) {
  tl.to(black, { opacity: 1, duration: 0.25 }, t - 0.25)
  tl.to(black, { opacity: 0, duration: 0.45 }, t + 0.05)
}

// Sombras detrás de los textos grandes
for (const s of R.shades) {
  const node = el('div', 'pm-shade', fx, '', `top:${s.top}px;height:${s.height}px;background:linear-gradient(${s.dir === 'abajo' ? 180 : 0}deg, rgba(0,0,0,${s.alpha}), transparent)`)
  tl.set(node, { opacity: 0 }, 0)
  tl.to(node, { opacity: 1, duration: 0.5 }, s.start)
  tl.to(node, { opacity: 0, duration: 0.4 }, Math.max(s.start + 0.5, s.end - 0.4))
}

// Barridos de luz
for (const s of R.sweeps) {
  const node = el('div', 'pm-sweep', root, '', `top:${s.top}px;height:${s.height}px`)
  tl.set(node, { x: -1100 }, 0)
  tl.to(node, { x: 1100, duration: 0.9, ease: 'power2.inOut' }, s.at)
}

// Títulos 3D: modelo en cromo espejo, cifras en oro pulido
const stage = createStage($('stage3d'))
for (const t of R.titles) await addTitle3D(stage, { ...t, font: 'playfair', accent: R.accent, depth: Math.round(t.size * 0.16), alive: true, exit: 'subir' })

// ─── Piezas ───────────────────────────────────────────────────────────────────

const PIECES = {
  hook(p) {
    const h = holder(p)
    if (p.kicker) {
      const kick = el('div', 'pm-kick', h, esc(p.kicker), 'top:0')
      tl.set(kick, { opacity: 0 }, 0)
      tl.fromTo(kick, { opacity: 0, letterSpacing: '40px' }, { opacity: 1, letterSpacing: '18px', duration: 1.0, ease: 'power3.out' }, 0.2)
      tl.to(kick, { opacity: 0, duration: 0.3 }, p.end - 0.3)
    }
    const hair = el('div', 'pm-hair', h, '', 'left:300px;width:480px;top:62px')
    tl.fromTo(hair, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.out' }, 0.35)
    tl.to(hair, { opacity: 0, duration: 0.3 }, p.end - 0.3)
    if (p.tagline) {
      const tag = el('div', 'pm-serif', h, esc(p.tagline), 'top:430px;width:100%;text-align:center;font:400 66px playfair')
      reveal(tag, Math.min(1.45, p.end - 1.3), p.end, { stagger: 0.03 })
    }
  },

  cifra(p) {
    const h = holder(p)
    const size = p.size / p.scale
    if (p.label) rise(el('div', 'pm-kick', h, esc(p.label), 'top:0;font-size:30px'), p.start, p.end, 10, 0.6)
    if (p.sub) {
      const sub = el('div', 'pm-kick', h, esc(p.sub), `top:${Math.round(80 + size)}px;font:600 54px mont;letter-spacing:30px;color:#fff`)
      rise(sub, p.start + 0.65, p.end, 20, 0.5)
    }
  },

  ficha(p) {
    const parts = [
      ['left:60px;top:190px;width:960px;height:2px', 'scaleX', '0 50%'],
      ['left:60px;bottom:190px;width:960px;height:2px', 'scaleX', '100% 50%'],
      ['left:60px;top:190px;width:2px;height:1540px', 'scaleY', '50% 0'],
      ['right:60px;top:190px;width:2px;height:1540px', 'scaleY', '50% 100%'],
    ]
    parts.forEach(([css, prop, origin], i) => {
      const f = el('div', 'pm-frame', gfx, '', `${css};transform-origin:${origin}`)
      tl.set(f, { [prop]: 0 }, 0)
      tl.to(f, { [prop]: 1, duration: 0.8, ease: 'power2.inOut' }, p.start + i * 0.08)
      tl.to(f, { opacity: 0, duration: 0.3 }, Math.max(p.start + 0.9, p.end - 0.3))
    })
    const h = holder(p)
    const card = el('div', '', h, '', 'position:absolute;left:110px;top:30px;text-shadow:0 4px 18px rgba(0,0,0,.7)')
    if (p.label) {
      const label = el('div', '', card, esc(p.label), 'font:600 26px mont;letter-spacing:8px;color:var(--gold2)')
      tl.set(label, { opacity: 0 }, 0)
      tl.fromTo(label, { opacity: 0, letterSpacing: '24px' }, { opacity: 1, letterSpacing: '8px', duration: 0.8, ease: 'power3.out', immediateRender: false }, p.start + 0.2)
      tl.to(label, { opacity: 0, duration: 0.3 }, Math.max(p.start + 0.9, p.end - 0.3))
    }
    reveal(el('div', '', card, esc(p.text), 'font:700 92px/1 playfair;color:#fff;margin-top:10px'), p.start + 0.35, p.end, { stagger: 0.05 })
    if (p.sub) rise(el('div', '', card, esc(p.sub), 'font:300 30px mont;letter-spacing:10px;color:rgba(255,255,255,.75);margin-top:10px'), p.start + 0.8, p.end, 12, 0.5)
  },

  senal(p) {
    const [px, py] = p.dot
    const [len, angle] = p.line
    const dot = el('div', 'pm-dot', gfx, '', `left:${px - 13}px;top:${py - 13}px`)
    const line = el('div', 'pm-line', gfx, '', `left:${px}px;top:${py - 1}px;width:${len}px;transform:rotate(${angle}deg)`)
    const label = el('div', 'pm-label', gfx, `${p.label ? `<small>${esc(p.label)}</small>` : ''}<b>${esc(p.text)}</b>`, `left:${p.box[0]}px;top:${p.box[1]}px`)
    tl.set([dot, line, label], { opacity: 0 }, 0)
    tl.fromTo(dot, { opacity: 0, scale: 2.5 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }, p.start)
    tl.fromTo(line, { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power2.out' }, p.start + 0.15)
    tl.fromTo(label, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, p.start + 0.35)
    tl.to([dot, line, label], { opacity: 0, duration: 0.2 }, Math.max(p.start + 0.8, p.end - 0.2))
  },

  frase(p) {
    const h = holder(p)
    reveal(el('div', 'pm-serif', h, esc(p.text), 'left:0;right:0;top:0;text-align:center;font:400 80px playfair'), p.start, p.end)
    if (p.sub) reveal(el('div', 'pm-serif', h, esc(p.sub), 'left:0;right:0;top:100px;text-align:center;font:700 120px playfair'), p.start + 0.4, p.end, { gold: true, stagger: 0.05 })
  },

  dupla(p) {
    const h = holder(p)
    const dur = p.end - p.start
    reveal(el('div', 'pm-serif', h, esc(p.text), 'left:110px;top:0;font:700 96px playfair'), p.start, p.end)
    const amp = el('div', 'pm-serif pm-gold', h, '&amp;', 'left:0;right:0;top:100px;text-align:center;font:400 110px playfair')
    tl.set(amp, { opacity: 0 }, 0)
    tl.fromTo(amp, { opacity: 0, scale: 0.4, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, p.start + Math.min(0.75, dur * 0.3))
    shimmer([amp], p.start + Math.min(1.1, dur * 0.45))
    tl.to(amp, { opacity: 0, duration: 0.3 }, Math.max(p.start + 1, p.end - 0.3))
    reveal(el('div', 'pm-serif', h, esc(p.sub), 'right:110px;top:210px;font:700 96px playfair'), p.start + Math.min(1.3, dur * 0.5), p.end)
  },

  dial(p) {
    const h = holder(p)
    const ticks = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * Math.PI * 2
      const r1 = i % 5 ? 168 : 156
      return `<line x1="${210 + Math.cos(a) * r1}" y1="${210 + Math.sin(a) * r1}" x2="${210 + Math.cos(a) * 178}" y2="${210 + Math.sin(a) * 178}" stroke="${R.light}" stroke-opacity="${i % 5 ? 0.5 : 0.95}" stroke-width="${i % 5 ? 1.5 : 3}"/>`
    }).join('')
    const dial = el(
      'div',
      '',
      h,
      `<svg width="420" height="420" viewBox="0 0 420 420"><circle cx="210" cy="210" r="180" fill="rgba(0,0,0,.35)" stroke="${R.accent}" stroke-width="2"/>${ticks}` +
        `<text x="210" y="200" text-anchor="middle" font-family="playfair" font-weight="700" font-size="58" fill="#fff">${esc(p.text)}</text>` +
        `<text x="210" y="250" text-anchor="middle" font-family="mont" font-weight="600" font-size="20" letter-spacing="6" fill="${R.light}">${esc(p.label)}</text></svg>`,
      'position:absolute;left:330px;top:0'
    )
    const hand = el('div', '', dial, '', `position:absolute;left:209px;top:60px;width:3px;height:152px;background:${R.light};transform-origin:50% 100%;box-shadow:0 0 10px ${R.accent}`)
    tl.set(hand, { rotation: -60 }, 0)
    tl.to(hand, { rotation: 120, duration: Math.max(0.6, Math.min(1.8, p.end - p.start - 0.4)), ease: 'steps(12)' }, p.start + 0.2)
    rise(dial, p.start, p.end, 20, 0.6)
  },

  cita(p) {
    const h = holder(p)
    const mark = el('div', 'pm-serif pm-gold', h, '“', 'left:0;right:0;top:0;text-align:center;font:700 140px/1 playfair')
    tl.set(mark, { opacity: 0 }, 0)
    tl.fromTo(mark, { opacity: 0, y: -40, scale: 1.4 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, p.start)
    tl.to(mark, { opacity: 0, duration: 0.3 }, Math.max(p.start + 0.8, p.end - 0.3))
    reveal(el('div', 'pm-serif', h, esc(p.text), 'left:0;right:0;top:150px;text-align:center;font:700 88px/1.08 playfair'), p.start + 0.2, p.end, { stagger: 0.04 })
    if (p.sub) reveal(el('div', 'pm-serif', h, esc(p.sub), 'left:0;right:0;top:245px;text-align:center;font:700 88px/1.08 playfair'), p.start + 0.55, p.end, { gold: true, stagger: 0.05 })
  },

  agenda(p) {
    const h = holder(p)
    const box = el('div', 'pm-agenda', h, `<small>${esc(p.label)}</small><b>${esc(p.text)}</b>`, 'top:0')
    rise(box, p.start, p.end, 30, 0.7)
    // El marco dorado se dibuja y el texto se abre letra por letra
    const b = box.querySelector('b')
    tl.fromTo(b, { letterSpacing: '22px', borderColor: 'rgba(201,168,106,0)' }, { letterSpacing: '8px', borderColor: R.accent, duration: 0.9, ease: 'power3.out', immediateRender: false }, p.start + 0.1)
    tl.fromTo(b, { boxShadow: '0 0 0 0 rgba(201,168,106,0)' }, { boxShadow: '0 0 40px 6px rgba(201,168,106,.55)', duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut', immediateRender: false }, p.start + 1.0)
  },
}

for (const p of R.pieces) PIECES[p.kind]?.(p)

// ─── Subtítulos: serif blanca, palabra que suena en dorado ────────────────────

for (const g of R.captions.groups) {
  const c = el('div', 'pm-cap', caps)
  const spans = g.words.map((w) => ({ w, s: el('span', w.key ? 'pm-gold' : '', c, esc(w.text)) }))
  tl.set(c, { opacity: 0 }, 0)
  tl.fromTo(c, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, g.start)
  tl.to(c, { opacity: 0, duration: 0.15 }, Math.max(g.start + 0.25, g.end - 0.15))
  // Cada palabra aparece al decirse, de desenfocada a nítida; las clave son doradas y brillan
  for (const { w, s } of spans) {
    const t = Math.max(g.start, w.start - 0.04)
    const blur = (px) => (w.key ? `blur(${px}px) ${SHADOW}` : `blur(${px}px)`)
    tl.set(s, { opacity: 0 }, 0)
    tl.fromTo(s, { opacity: 0, y: 14, filter: blur(8) }, { opacity: 1, y: 0, filter: blur(0), duration: 0.35, ease: 'power3.out', immediateRender: false }, t)
    if (w.key) shimmer([s], t + 0.2)
    else {
      tl.set(s, { color: R.light }, t)
      tl.set(s, { color: '#fff' }, Math.max(t + 0.05, w.end))
    }
  }
}

// ─── Movimiento del video ─────────────────────────────────────────────────────

for (const tr of R.transitions) {
  const shot = `#shot${tr.i}`
  if (tr.kind === 'desenfoque') {
    tl.fromTo(shot, { filter: 'blur(16px) brightness(1.5)' }, { filter: 'blur(0px) brightness(1)', duration: 0.5, ease: 'power2.out' }, tr.at)
  } else if (tr.kind === 'zoom_suave') {
    tl.fromTo(shot, { scale: 1.16 }, { scale: 1, duration: 0.7, ease: 'power2.out' }, tr.at)
  } else if (tr.kind === 'pelicula') {
    const leak = el('div', 'pm-leak', top)
    tl.set(leak, { opacity: 0, x: -700 }, 0)
    tl.fromTo(leak, { opacity: 0 }, { opacity: 0.9, duration: 0.15, immediateRender: false }, tr.at - 0.15)
    tl.to(leak, { x: 700, duration: 0.8, ease: 'power1.inOut' }, tr.at - 0.15)
    tl.to(leak, { opacity: 0, duration: 0.3 }, tr.at + 0.35)
  }
}
// Acercamiento suave en las palabras clave y pulsos al ritmo en las tomas sin habla
for (const t of R.punches) {
  tl.fromTo('#world', { scale: 1 }, { scale: 1.06, duration: 0.25, ease: 'power2.out', immediateRender: false }, t)
  tl.fromTo('#world', { scale: 1.06 }, { scale: 1, duration: 0.7, ease: 'power2.inOut', immediateRender: false }, t + 0.25)
}
for (const t of R.pulses) {
  tl.fromTo('#world', { scale: 1 }, { scale: 1.02, duration: 0.08, ease: 'power1.out', immediateRender: false }, t)
  tl.fromTo('#world', { scale: 1.02 }, { scale: 1, duration: 0.3, ease: 'power1.in', immediateRender: false }, t + 0.08)
}
// Línea dorada de progreso en la franja de arriba
{
  const line = el('div', 'pm-progress', top)
  tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: R.duration, ease: 'none' }, 0)
}

// ─── Cierre: Colección Premium ────────────────────────────────────────────────

{
  const k = R.closing
  const close = el('div', '', top, '', 'position:absolute;inset:0')
  const fA = el('div', '', close, '', `position:absolute;left:110px;top:420px;width:860px;height:1080px;border:2px solid ${R.accent}`)
  const fB = el('div', '', close, '', 'position:absolute;left:128px;top:438px;width:824px;height:1044px;border:1px solid rgba(201,168,106,.45)')
  const lines = [
    el('div', 'pm-kick', close, 'COLECCIÓN', 'top:560px;letter-spacing:24px'),
    el('div', 'pm-gold', close, 'Premium', 'position:absolute;top:610px;width:100%;text-align:center;font:700 150px playfair'),
    el('div', 'pm-hair', close, '', 'left:380px;width:320px;top:840px'),
    el('div', 'pm-kick', close, esc(k.brand), 'top:900px;font:600 40px mont;letter-spacing:16px;color:#fff'),
    el('div', 'pm-serif', close, esc(k.line), 'top:1040px;width:100%;text-align:center;font:400 54px playfair'),
    el('div', 'pm-kick', close, esc(k.place), 'top:1380px;font-size:26px;color:rgba(255,255,255,.6)'),
  ]
  tl.set(close, { opacity: 0 }, 0)
  tl.set(close, { opacity: 1 }, k.start)
  tl.fromTo([fA, fB], { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, k.start + 0.05)
  lines.forEach((n, i) => tl.fromTo(n, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, k.start + 0.25 + i * 0.16))
  shimmer([lines[1]], k.start + 0.75)
  tl.fromTo(lines[1], { scale: 0.92 }, { scale: 1, duration: 1.2, ease: 'power2.out', immediateRender: false }, k.start + 0.4)
}

const clock = { t: 0 }
tl.to(clock, { t: R.duration, duration: R.duration, ease: 'none', onUpdate: () => stage.renderAt(clock.t) }, 0)
stage.renderAt(0)

window.__timelines = { root: tl }
