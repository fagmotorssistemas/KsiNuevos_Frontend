// Convierte una fuente (woff/ttf) al formato "typeface JSON" que usa three.js
// (FontLoader/TextGeometry) para el texto 3D extruido.
// Uso: node scripts/make-typeface.mjs <entrada.woff> <salida.json>
import fs from 'node:fs'
import opentype from 'opentype.js'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('Uso: node scripts/make-typeface.mjs <entrada.woff> <salida.json>')
  process.exit(1)
}

const CHARS =
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  'ÁÉÍÓÚÑÜáéíóúñü.,:;!?¿¡-–\'"%$#&/+()·×°@*'

const buf = fs.readFileSync(input)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
const scale = 1000 / font.unitsPerEm
const r = (n) => Math.round(n * scale)

const glyphs = {}
for (const ch of CHARS) {
  const glyph = font.charToGlyph(ch)
  if (!glyph || (glyph.index === 0 && ch !== ' ')) continue
  const o = []
  for (const c of glyph.path.commands) {
    if (c.type === 'M') o.push('m', r(c.x), r(c.y))
    else if (c.type === 'L') o.push('l', r(c.x), r(c.y))
    // Formato typeface: punto final primero, luego puntos de control.
    else if (c.type === 'Q') o.push('q', r(c.x), r(c.y), r(c.x1), r(c.y1))
    else if (c.type === 'C') o.push('b', r(c.x), r(c.y), r(c.x1), r(c.y1), r(c.x2), r(c.y2))
  }
  glyphs[ch] = {
    ha: r(glyph.advanceWidth ?? 0),
    x_min: r(glyph.xMin ?? 0),
    x_max: r(glyph.xMax ?? 0),
    o: o.join(' '),
  }
}

const out = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? 'Font',
  ascender: r(font.ascender),
  descender: r(font.descender),
  underlinePosition: r(font.tables.post?.underlinePosition ?? -100),
  underlineThickness: r(font.tables.post?.underlineThickness ?? 50),
  boundingBox: {
    xMin: r(font.tables.head.xMin),
    yMin: r(font.tables.head.yMin),
    xMax: r(font.tables.head.xMax),
    yMax: r(font.tables.head.yMax),
  },
  resolution: 1000,
  original_font_information: {},
  cssFontWeight: 'normal',
  cssFontStyle: 'normal',
}
fs.writeFileSync(output, JSON.stringify(out))
console.log(`${Object.keys(glyphs).length} glifos → ${output}`)
