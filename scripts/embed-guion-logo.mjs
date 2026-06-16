import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const png = fs.readFileSync(path.join(root, 'public', 'logol.png'))
const out = `/** Logo KSi embebido para react-pdf (sin fetch en cada descarga). */\nexport const GUION_PDF_LOGO_DATA_URI = 'data:image/png;base64,${png.toString('base64')}'\n`
fs.writeFileSync(path.join(root, 'src', 'lib', 'marketing', 'guion-pdf-logo.ts'), out)
console.log('Wrote guion-pdf-logo.ts', png.length, 'bytes')
