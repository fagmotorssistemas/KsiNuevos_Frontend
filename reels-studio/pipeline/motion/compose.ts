/**
 * Arma el proyecto HyperFrames de un Reel: copia el kit (GSAP, three.js, fuentes, sonidos, logo), los clips y una
 * foto del último cuadro, y escribe la base del index.html a partir del montaje (ReelProps). La base trae fijo lo
 * que no debe romperse (tomas con sus tiempos, subtítulos, capas, registro del timeline) y cuatro huecos que llena
 * Claude: estilos, gráficos, timeline 2D y piezas 3D.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReelProps } from '../../src/plan/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const KIT_SRC = path.join(ROOT, 'motion/kit')

/** Fuentes 2D del kit: familia, peso, estilo y archivo en public/fonts. */
const FONTS: Array<{ family: string; weight: number; style?: 'italic'; file: string }> = [
  { family: 'Anton', weight: 400, file: 'Anton-Regular.woff2' },
  { family: 'Montserrat', weight: 800, file: 'Montserrat-ExtraBold.woff2' },
  { family: 'Montserrat', weight: 900, file: 'Montserrat-Black.woff2' },
  { family: 'Russo One', weight: 400, file: 'RussoOne-Regular.woff2' },
  { family: 'Bebas Neue', weight: 400, file: 'BebasNeue-Regular.woff2' },
  { family: 'Archivo Black', weight: 400, file: 'ArchivoBlack-Regular.woff2' },
  { family: 'Poppins', weight: 800, file: 'Poppins-ExtraBold.woff2' },
  { family: 'Teko', weight: 700, file: 'Teko-Bold.woff2' },
  { family: 'Cinzel', weight: 700, file: 'Cinzel-Bold.woff2' },
  { family: 'Playfair Display', weight: 700, file: 'PlayfairDisplay-Bold.woff2' },
  { family: 'Playfair Display', weight: 700, style: 'italic', file: 'PlayfairDisplay-BoldItalic.woff2' },
  { family: 'Michroma', weight: 400, file: 'Michroma-Regular.woff2' },
  { family: 'Josefin Sans', weight: 700, file: 'JosefinSans-Bold.woff2' },
]

/** Fuentes 3D (typeface de three.js en src/three) con el nombre que usa el kit. */
const FONTS_3D: Record<string, string> = {
  russo: 'russo',
  anton: 'anton',
  bebas: 'bebas',
  teko: 'teko',
  archivo: 'archivo',
  montserrat: 'montserrat-black',
  cinzel: 'cinzel',
  playfair: 'playfair',
  michroma: 'michroma',
  josefin: 'josefin',
}

export type MotionDesign = 'camioneta' | 'suv' | 'deportivo' | 'premium' | 'general'

/** Color de acento por diseño (luz de acento del 3D y llanta). */
export const DESIGN_ACCENT: Record<MotionDesign, string> = {
  camioneta: '#FF8A1F',
  suv: '#CDAE72',
  deportivo: '#E81C2A',
  premium: '#D4AF6A',
  general: '#E81C2A',
}

export type ProjectMedia = { clipFiles: Record<string, string> }

const sec = (frames: number, fps: number) => (frames / fps).toFixed(3)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function copyDir(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dst = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(src, dst)
    else fs.copyFileSync(src, dst)
  }
}

/** Ruta en disco de un clip del montaje (src es relativo a public/ o una ruta absoluta). */
function clipPath(src: string): string {
  if (path.isAbsolute(src)) return src
  return path.join(ROOT, 'public', src)
}

/**
 * Copia el kit y los clips al proyecto. Los clips se enlazan (hardlink) si están en el mismo disco, para no
 * duplicar gigas; si no, se copian.
 */
export function prepareProject(dir: string, props: ReelProps): ProjectMedia {
  const assets = path.join(dir, 'assets')
  const kit = path.join(assets, 'kit')
  fs.mkdirSync(kit, { recursive: true })
  for (const f of ['ksi3d.js', 'ksi.js']) fs.copyFileSync(path.join(KIT_SRC, f), path.join(kit, f))

  const nm = path.join(ROOT, 'node_modules')
  const vendor = path.join(kit, 'vendor')
  fs.mkdirSync(path.join(vendor, 'three/addons/geometries'), { recursive: true })
  fs.mkdirSync(path.join(vendor, 'three/addons/loaders'), { recursive: true })
  fs.mkdirSync(path.join(vendor, 'three/addons/environments'), { recursive: true })
  fs.copyFileSync(path.join(nm, 'gsap/dist/gsap.min.js'), path.join(vendor, 'gsap.min.js'))
  fs.copyFileSync(path.join(nm, 'three/build/three.module.js'), path.join(vendor, 'three/three.module.js'))
  fs.copyFileSync(path.join(nm, 'three/build/three.core.js'), path.join(vendor, 'three/three.core.js'))
  const jsm = path.join(nm, 'three/examples/jsm')
  fs.copyFileSync(path.join(jsm, 'geometries/TextGeometry.js'), path.join(vendor, 'three/addons/geometries/TextGeometry.js'))
  fs.copyFileSync(path.join(jsm, 'loaders/FontLoader.js'), path.join(vendor, 'three/addons/loaders/FontLoader.js'))
  fs.copyFileSync(path.join(jsm, 'environments/RoomEnvironment.js'), path.join(vendor, 'three/addons/environments/RoomEnvironment.js'))

  fs.mkdirSync(path.join(kit, 'fonts'), { recursive: true })
  for (const f of FONTS) fs.copyFileSync(path.join(ROOT, 'public/fonts', f.file), path.join(kit, 'fonts', f.file))
  fs.mkdirSync(path.join(kit, 'fonts3d'), { recursive: true })
  for (const [name, file] of Object.entries(FONTS_3D)) {
    const json = fs.readFileSync(path.join(ROOT, 'src/three', `${file}.typeface.json`), 'utf8')
    fs.writeFileSync(path.join(kit, 'fonts3d', `${name}.js`), `window.__fonts3d = window.__fonts3d || {};\nwindow.__fonts3d[${JSON.stringify(name)}] = ${json};\n`)
  }
  copyDir(path.join(ROOT, 'public/sfx'), path.join(kit, 'sfx'))
  fs.mkdirSync(path.join(kit, 'logo'), { recursive: true })
  fs.copyFileSync(path.join(ROOT, 'public', props.brand.logoSrc), path.join(kit, 'logo/ksi-logo.png'))

  const media = path.join(assets, 'media')
  fs.mkdirSync(media, { recursive: true })
  const clipFiles: Record<string, string> = {}
  for (const item of [...props.cuts, ...props.inserts]) {
    if (clipFiles[item.clipId]) continue
    const from = clipPath(item.src)
    const name = `${item.clipId}${path.extname(from) || '.mp4'}`
    const to = path.join(media, name)
    if (!fs.existsSync(to)) {
      try {
        fs.linkSync(from, to)
      } catch {
        fs.copyFileSync(from, to)
      }
    }
    clipFiles[item.clipId] = `assets/media/${name}`
  }

  // Foto del último cuadro: sostiene la imagen durante la cola (el video termina antes que el Reel).
  const last = props.cuts[props.cuts.length - 1]
  const lastSec = Math.max(0, last.trimStartSec + (last.durationInFrames - 2) / props.fps)
  const tail = path.join(media, 'tail.jpg')
  fs.rmSync(tail, { force: true })
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', lastSec.toFixed(3), '-i', clipPath(last.src), '-frames:v', '1', '-q:v', '3', tail])
  // Si el corte llega hasta el final del archivo, buscar ahí no devuelve cuadro: se toma uno de los últimos.
  if (!fs.existsSync(tail)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.3', '-i', clipPath(last.src), '-frames:v', '1', '-q:v', '3', tail])
  return { clipFiles }
}

/** Grupos de subtítulos en HTML, con cada palabra y sus tiempos en segundos del Reel. */
function captionsHtml(props: ReelProps): string {
  return props.captions
    .map((line, i) => {
      const words = line.words
        .map((w) => {
          const cls = w.emphasis ? 'w em' : 'w'
          return `<span class="${cls}" data-word-start="${sec(w.fromFrame, props.fps)}" data-word-end="${sec(w.toFrame, props.fps)}">${esc(w.text)}</span>`
        })
        .join(' ')
      return `    <div id="cap-${i + 1}" class="clip cap" data-start="${sec(line.fromFrame, props.fps)}" data-duration="${sec(line.toFrame - line.fromFrame, props.fps)}" data-track-index="90" data-place="${line.placement}" data-layout-allow-caption-zone>${words}</div>`
    })
    .join('\n')
}

export const SLOT = {
  css: '/*CLAUDE:CSS*/',
  markup: '<!--CLAUDE:MARKUP-->',
  timeline: '/*CLAUDE:TIMELINE*/',
  three: '/*CLAUDE:THREE*/',
} as const

/** Base del index.html con los cuatro huecos que llena Claude. */
export function skeletonHtml(props: ReelProps, media: ProjectMedia, design: MotionDesign): string {
  const fps = props.fps
  const duration = sec(props.durationInFrames, fps)
  const fontFaces = FONTS.map(
    (f) => `  @font-face { font-family: '${f.family}'; src: url('assets/kit/fonts/${f.file}') format('woff2'); font-weight: ${f.weight}; font-style: ${f.style ?? 'normal'}; }`
  ).join('\n')
  const shots = props.cuts
    .map((c, i) => {
      const n = i + 1
      return `  <div id="shot-${n}" class="shot" style="z-index:${n}"><div id="cam-${n}" class="cam"><video id="v-${n}" class="clip" src="${media.clipFiles[c.clipId]}" data-start="${sec(c.fromFrame, fps)}" data-duration="${sec(c.durationInFrames, fps)}" data-media-start="${c.trimStartSec.toFixed(3)}" data-track-index="1" data-has-audio="true" playsinline></video></div></div>`
    })
    .join('\n')
  const inserts = props.inserts
    .map((ins, i) => {
      const n = i + 1
      return `  <div id="ins-${n}" class="shot insert" style="z-index:${20 + n}"><div id="cam-ins-${n}" class="cam"><video id="vi-${n}" class="clip" src="${media.clipFiles[ins.clipId]}" data-start="${sec(ins.fromFrame, fps)}" data-duration="${sec(ins.durationInFrames, fps)}" data-media-start="${ins.trimStartSec.toFixed(3)}" data-track-index="2" muted playsinline></video></div></div>`
    })
    .join('\n')
  const last = props.cuts[props.cuts.length - 1]
  const tailStart = (last.fromFrame + last.durationInFrames) / fps
  const tail =
    props.tailFrames > 0
      ? `  <div id="tail-shot" class="shot" style="z-index:${props.cuts.length + 1}"><div id="cam-tail" class="cam"><img id="tail" class="clip" src="assets/media/tail.jpg" data-start="${tailStart.toFixed(3)}" data-duration="${sec(props.tailFrames, fps)}" data-track-index="3" alt=""></div></div>`
      : ''
  const fonts3d = Object.keys(FONTS_3D)
    .map((n) => `<script src="assets/kit/fonts3d/${n}.js"></script>`)
    .join('\n')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Reel K-SI</title>
<style id="ksi-kit">
${fontFaces}
  html, body { margin: 0; background: #000; }
  #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
  .shot { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
  .cam { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: 50% 50%; }
  .shot video, .shot img { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
  #stage3d { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 50; pointer-events: none; }
  #gfx { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 60; }
  #captions { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 80; }
  .cap { position: absolute; left: 60px; width: 960px; text-align: center; }
  .cap[data-place="abajo"] { top: 1180px; }
  .cap[data-place="centro"] { top: 900px; }
  .cap[data-place="arriba"] { top: 300px; }
  .cap .w { display: inline-block; }
</style>
<style id="design">
${SLOT.css}
</style>
<script type="importmap">{ "imports": { "three": "./assets/kit/vendor/three/three.module.js", "three/addons/": "./assets/kit/vendor/three/addons/" } }</script>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920" data-design="${design}">
${shots}
${inserts}
${tail}
  <canvas id="stage3d" width="1080" height="1920" data-layout-ignore></canvas>
  <div id="gfx">
${SLOT.markup}
  </div>
  <div id="captions" data-track-kind="captions">
${captionsHtml(props)}
  </div>
</div>
<script src="assets/kit/vendor/gsap.min.js"></script>
<script src="assets/kit/ksi.js"></script>
${fonts3d}
<script>
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady['ksi3d'] = new Promise(function (resolve) { window.__ksi3dReady = resolve; });
  window.__timelines = window.__timelines || {};
  document.fonts.ready.then(function () {
    const tl = gsap.timeline({ paused: true });
    (function (tl) {
${SLOT.timeline}
    })(tl);
    window.__timelines['main'] = tl;
  });
</script>
<script type="module">
  import * as THREE from 'three';
  import * as K3 from './assets/kit/ksi3d.js';
  const stage = K3.createStage(document.getElementById('stage3d'), { accent: '${DESIGN_ACCENT[design]}' });
${SLOT.three}
  K3.bindSeek(stage);
</script>
</body>
</html>
`
}

export type Blocks = { css: string; markup: string; timeline: string; three: string }

/** Inserta los bloques de Claude en la base. */
export function assemble(skeleton: string, blocks: Blocks): string {
  // Reemplazos con función: el código de Claude puede traer "$&" o "$1", que replace() interpretaría.
  return skeleton
    .replace(SLOT.css, () => blocks.css)
    .replace(SLOT.markup, () => blocks.markup)
    .replace(SLOT.timeline, () => blocks.timeline)
    .replace(SLOT.three, () => blocks.three)
}
