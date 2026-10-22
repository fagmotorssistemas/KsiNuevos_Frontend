/**
 * Arma el Reel Motion 3D a partir de los datos que deja el compositor (composer.ts) en #reel-data.
 * Todos los tiempos ya vienen resueltos en segundos absolutos; aquí solo se crean las piezas.
 */

import { createStage, addTitle3D } from './pieces3d.js'
import * as P from './pieces2d.js'

const R = JSON.parse(document.getElementById('reel-data').textContent)
const $ = (id) => document.getElementById(id)
const fx = $('fx')
const gfx = $('gfx')
const caps = $('caps')
const top = $('top')
const A = R.accent

const tl = gsap.timeline({ paused: true })

// Las medidas (cursor del comentario, anchos) necesitan las fuentes ya cargadas.
await Promise.all([
  document.fonts.load(`${R.captions.size}px ${R.captionFont}`),
  document.fonts.load('54px russo'),
  document.fonts.load('900 40px montserrat'),
])

// Cámara: golpe de zoom al entrar a cada corte, o acercamiento lento durante el corte.
for (const c of R.cutMotion) {
  if (c.motion === 'golpe') {
    tl.fromTo(`#${c.id}`, { scale: 1.16 }, { scale: 1, duration: 0.32, ease: 'power3.out' }, c.start)
  } else {
    tl.fromTo(`#${c.id}`, { scale: 1 }, { scale: 1.08, duration: Math.max(0.3, c.end - c.start), ease: 'none' }, c.start)
  }
}

const stage = createStage($('stage3d'))
for (const t of R.titles) {
  await addTitle3D(stage, { ...t, font: R.titleFont, finish: R.material, accent: A })
}

for (const m of R.mudSplats) P.mudSplats(tl, fx, m)
for (const d of R.debris) P.debris(tl, fx, d)
for (const k of R.kickers) P.kicker(tl, gfx, { ...k, accent: A })
for (const p of R.plates) P.plate(tl, gfx, { ...p, accent: A })
for (const s of R.scans) P.scan(tl, gfx, { ...s, accent: A })
for (const o of R.occupants) P.occupants(tl, gfx, { ...o, accent: A })
for (const c of R.comments) P.commentBox(tl, gfx, { ...c, accent: A })
P.captions(tl, caps, R.captions.groups, { accent: A, font: R.captionFont, y: R.captions.y, size: R.captions.size })
for (const w of R.mudWipes) P.mudWipe(tl, top, w)
for (const f of R.flashes) P.flash(tl, top, f)
for (const s of R.shakes) P.shake(tl, '#world', { at: s.at, seed: Math.round(s.at * 100) })
P.closing(tl, top, { ...R.closing, accent: A })

const clock = { t: 0 }
tl.to(clock, { t: R.duration, duration: R.duration, ease: 'none', onUpdate: () => stage.renderAt(clock.t) }, 0)
stage.renderAt(0)

window.__timelines = { root: tl }
