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
  bundled ??= bundle({
    entryPoint: path.join(ROOT, 'src/index.ts'),
    publicDir: path.join(ROOT, 'public'),
    // Enlaza public/ en vez de copiarlo: ahí están los clips del trabajo (varios GB). Windows siempre copia.
    symlinkPublicDir: true,
  })
  return bundled
}

const MIN_FREE_DISK_GB = 3
/** Falla temprano y con un mensaje claro si no hay espacio (si no, Chrome/Remotion fallan a mitad del render). */
function assertFreeDisk() {
  try {
    const st = fs.statfsSync(os.tmpdir())
    const freeGb = (st.bavail * st.bsize) / 1024 ** 3
    if (freeGb < MIN_FREE_DISK_GB) {
      throw new Error(`Poco espacio en disco: quedan ${freeGb.toFixed(1)} GB libres; libera al menos ${MIN_FREE_DISK_GB} GB y reintenta`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Poco espacio')) throw err
  }
}

const DEFAULT_CONCURRENCY = Math.min(3, Math.max(1, Math.floor(os.cpus().length / 2)))
/** La caché de cuadros de video por defecto usa la mitad de la RAM; con la web corriendo al lado eso tumba al extractor. */
const VIDEO_CACHE_BYTES = Number(process.env.REMOTION_VIDEO_CACHE_MB ?? 768) * 1024 * 1024

/** Errores del extractor de cuadros que suelen ser por falta de memoria: vale la pena reintentar con menos carga. */
const isCompositorCrash = (err: unknown) =>
  /compositor|Request closed|Failed to fetch|Target closed|crashed/i.test(err instanceof Error ? err.message : String(err))

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
  assertFreeDisk()
  const { serveUrl, comp } = await composition(props)
  const attempt = async (concurrency: number, cacheBytes: number) => {
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
      concurrency,
      offthreadVideoCacheSizeInBytes: cacheBytes,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100)
        if (pct >= last + 10) {
          last = pct
          console.log(`[render] ${pct}%`)
        }
      },
    })
  }
  try {
    await attempt(Number(process.env.REMOTION_CONCURRENCY ?? DEFAULT_CONCURRENCY), VIDEO_CACHE_BYTES)
  } catch (err) {
    if (!isCompositorCrash(err)) throw err
    console.log(`[render] reintentando con menos carga (${err instanceof Error ? err.message.slice(0, 120) : err})`)
    await attempt(1, Math.min(VIDEO_CACHE_BYTES, 384 * 1024 * 1024))
  }
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
