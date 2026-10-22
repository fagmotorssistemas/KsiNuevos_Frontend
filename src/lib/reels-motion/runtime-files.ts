/**
 * Copia el runtime del motor de motion graphics (reels-motion/runtime) a la carpeta de una composición
 * HyperFrames, junto con las librerías (GSAP, three.js) y las fuentes, sacadas de node_modules.
 * Así la composición no depende de ningún CDN al renderizar.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const RUNTIME_DIR = path.join(ROOT, 'reels-motion', 'runtime')
const NM = path.join(ROOT, 'node_modules')

/** Archivos de three.js que usan las piezas 3D; los imports se reescriben a rutas locales. */
const THREE_FILES: [string, string][] = [
  ['three/build/three.module.min.js', 'three.module.js'],
  ['three/examples/jsm/loaders/TTFLoader.js', 'TTFLoader.js'],
  ['three/examples/jsm/loaders/FontLoader.js', 'FontLoader.js'],
  ['three/examples/jsm/geometries/TextGeometry.js', 'TextGeometry.js'],
  ['three/examples/jsm/environments/RoomEnvironment.js', 'RoomEnvironment.js'],
  ['three/examples/jsm/libs/opentype.module.js', 'opentype.module.js'],
]

/** Fuentes: nombre corto → archivo woff (sirve para CSS y para las letras 3D). */
export const FONT_FILES: Record<string, string> = {
  russo: '@fontsource/russo-one/files/russo-one-latin-400-normal.woff',
  blackops: '@fontsource/black-ops-one/files/black-ops-one-latin-400-normal.woff',
  anton: '@fontsource/anton/files/anton-latin-400-normal.woff',
  montserrat: '@fontsource/montserrat/files/montserrat-latin-900-normal.woff',
}

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

/** Deja en `dir` las carpetas runtime/, runtime/vendor/ y runtime/fonts/. */
export function stageMotionRuntime(dir: string): void {
  const runtimeOut = path.join(dir, 'runtime')
  copyDir(RUNTIME_DIR, runtimeOut)

  const vendor = path.join(runtimeOut, 'vendor')
  fs.mkdirSync(vendor, { recursive: true })
  fs.copyFileSync(path.join(NM, 'gsap/dist/gsap.min.js'), path.join(vendor, 'gsap.min.js'))
  for (const [from, to] of THREE_FILES) {
    const code = fs
      .readFileSync(path.join(NM, from), 'utf8')
      .replace(/from\s+['"]three['"]/g, "from './three.module.js'")
      .replace(/from\s+['"]\.\.\/libs\/opentype\.module\.js['"]/g, "from './opentype.module.js'")
      // TTFLoader guarda cada letra con glyph.unicode, que en letras compuestas (É, Ñ…) no es su código:
      // se usa el código del mapa de caracteres para que las tildes salgan.
      .replace('String.fromCodePoint( glyph.unicode )', 'String.fromCodePoint( Number( unicode ) )')
    fs.writeFileSync(path.join(vendor, to), code)
  }

  const fonts = path.join(runtimeOut, 'fonts')
  fs.mkdirSync(fonts, { recursive: true })
  for (const [name, file] of Object.entries(FONT_FILES)) {
    fs.copyFileSync(path.join(NM, file), path.join(fonts, `${name}.woff`))
  }
}
