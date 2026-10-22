/**
 * Ayudas 2D del kit K-SI para HyperFrames (GSAP). Script clásico: deja `window.KSI`.
 *
 *   KSI.captions()                 grupos de subtítulos ya escritos en #captions, con sus palabras y tiempos
 *   KSI.splitChars(el)             envuelve cada letra en <span class="ch"> (inline-block) y devuelve los spans
 *   KSI.splitWords(el)             igual, por palabra (<span class="wd">)
 *   KSI.count(tl, el, opts)        cifra que cuenta dentro de `el` (formato 128.000 / 2,8)
 *   KSI.fmt(n, decimals)           número con miles a la ecuatoriana
 *   KSI.prng(seed)                 aleatorio con semilla (mulberry32): nunca Math.random()
 *
 * Todo es determinista: lo que se ve en cada cuadro depende solo del tiempo del timeline.
 */
;(function () {
  function prng(seed) {
    let a = seed >>> 0
    return function () {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function fmt(value, decimals) {
    const d = decimals || 0
    const fixed = Math.abs(value).toFixed(d)
    const parts = fixed.split('.')
    const withDots = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return (value < 0 ? '-' : '') + withDots + (parts[1] ? ',' + parts[1] : '')
  }

  function wrap(el, unit, cls) {
    const text = el.textContent
    el.textContent = ''
    const pieces = unit === 'char' ? Array.from(text) : text.split(/(\s+)/)
    const spans = []
    for (const piece of pieces) {
      if (unit === 'word' && /^\s+$/.test(piece)) {
        el.appendChild(document.createTextNode(' '))
        continue
      }
      if (unit === 'char' && piece === ' ') {
        el.appendChild(document.createTextNode(' '))
        continue
      }
      const s = document.createElement('span')
      s.className = cls
      s.style.display = 'inline-block'
      s.textContent = piece
      el.appendChild(s)
      spans.push(s)
    }
    return spans
  }

  /**
   * Subtítulos: [{ el, id, start, end, place ('arriba' | 'centro' | 'abajo'), text,
   *               words: [{ el, text, start, end, emphasis }] }]
   * Los tiempos ya están en segundos del Reel. Cada grupo es un .clip: HyperFrames lo muestra solo en su ventana;
   * tú animas sus palabras (nunca display/visibility del grupo).
   */
  function captions() {
    return Array.from(document.querySelectorAll('#captions .cap')).map(function (el) {
      const start = parseFloat(el.dataset.start)
      const end = start + parseFloat(el.dataset.duration)
      const words = Array.from(el.querySelectorAll('.w')).map(function (w) {
        return { el: w, text: w.textContent, start: parseFloat(w.dataset.wordStart), end: parseFloat(w.dataset.wordEnd), emphasis: w.classList.contains('em') }
      })
      return { el: el, id: el.id, start: start, end: end, place: el.dataset.place, text: el.textContent.trim(), words: words }
    })
  }

  /**
   * Cifra que cuenta dentro de `el`: opts { from = 0, to, at (s), dur (s), decimals, prefix, suffix, ease }.
   * Escribe el texto en cada cuadro según el avance del tween (sirve con cualquier búsqueda del timeline).
   */
  function count(tl, el, opts) {
    const o = Object.assign({ from: 0, dur: 0.8, decimals: 0, prefix: '', suffix: '', ease: 'power3.out' }, opts)
    const state = { v: o.from }
    el.textContent = o.prefix + fmt(o.from, o.decimals) + o.suffix
    tl.fromTo(
      state,
      { v: o.from },
      {
        v: o.to,
        duration: o.dur,
        ease: o.ease,
        onUpdate: function () {
          el.textContent = o.prefix + fmt(state.v, o.decimals) + o.suffix
        },
      },
      o.at
    )
    return state
  }

  window.KSI = {
    prng: prng,
    fmt: fmt,
    splitChars: function (el) {
      return wrap(el, 'char', 'ch')
    },
    splitWords: function (el) {
      return wrap(el, 'word', 'wd')
    },
    captions: captions,
    count: count,
  }
})()
