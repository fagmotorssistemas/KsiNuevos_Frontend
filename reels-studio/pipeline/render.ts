import { bundle } from '@remotion/bundler'
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReelProps } from '../src/plan/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Ruta de un archivo dentro de public/ tal como la espera staticFile (siempre con "/", también en Windows). */
export function toPublicSrc(file: string): string {
  const rel = path.relative(path.join(ROOT, 'public'), path.resolve(file))
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`El clip debe estar dentro de reels-studio/public: ${file}`)
  return rel.split(path.sep).join('/')
}

type GlRenderer = 'swangle' | 'angle' | 'egl' | 'swiftshader' | 'vulkan' | 'angle-egl'
/** "swangle" funciona en cualquier servidor sin GPU; en una computadora con GPU, REMOTION_GL=angle es más rápido. */
const GL = (process.env.REMOTION_GL ?? 'swangle') as GlRenderer

/** Chromium preinstalado (p. ej. Playwright) para no depender de descargas en el servidor. */
function browserExecutable(): string | null {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE
  const candidates = ['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell']
  return candidates.find((c) => fs.existsSync(c)) ?? null
}

let bundled: Promise<string> | null = null
function getBundle() {
  bundled ??= bundle({ entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public') })
  return bundled
}

async function composition(props: ReelProps) {
  const serveUrl = await getBundle()
  const comp = await selectComposition({
    serveUrl,
    id: 'Reel',
    inputProps: props,
    browserExecutable: browserExecutable(),
    chromiumOptions: { gl: GL },
  })
  return { serveUrl, comp }
}

export async function renderReel(props: ReelProps, outFile: string, opts: { scale?: number } = {}) {
  const { serveUrl, comp } = await composition(props)
  let last = -1
  await renderMedia({
    serveUrl,
    composition: comp,
    inputProps: props,
    codec: 'h264',
    outputLocation: outFile,
    browserExecutable: browserExecutable(),
    chromiumOptions: { gl: GL },
    scale: opts.scale ?? 1,
    crf: 20,
    concurrency: Number(process.env.REMOTION_CONCURRENCY ?? Math.max(1, Math.floor(os.cpus().length / 2))),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100)
      if (pct >= last + 10) {
        last = pct
        console.log(`[render] ${pct}%`)
      }
    },
  })
  return outFile
}

/** Cuadros sueltos para revisar el diseño sin renderizar todo el video. */
export async function renderStills(props: ReelProps, frames: number[], outDir: string, scale = 0.5) {
  const { serveUrl, comp } = await composition(props)
  fs.mkdirSync(outDir, { recursive: true })
  const files: string[] = []
  for (const frame of frames) {
    const output = path.join(outDir, `frame-${String(frame).padStart(4, '0')}.jpeg`)
    await renderStill({
      serveUrl,
      composition: comp,
      inputProps: props,
      frame,
      output,
      imageFormat: 'jpeg',
      scale,
      browserExecutable: browserExecutable(),
      chromiumOptions: { gl: GL },
    })
    files.push(output)
  }
  return files
}
