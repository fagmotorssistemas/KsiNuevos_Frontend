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

/**
 * Lector de video principal: 'media' (WebCodecs dentro de Chrome). El extractor de Remotion ('offthread')
 * se cayó con "Request closed" en todos los clips en una computadora Linux con Node 26, así que queda de
 * respaldo. REMOTION_VIDEO_ENGINE=offthread invierte el orden.
 */
export const PRIMARY_ENGINE: ReelProps['videoEngine'] = process.env.REMOTION_VIDEO_ENGINE === 'offthread' ? 'offthread' : 'media'
const OTHER_ENGINE = { media: 'offthread', offthread: 'media' } as const

// Cuando falla un lector de video, Remotion a veces deja promesas internas rechazadas sin manejar y Node
// cierra el proceso antes de que renderReel pueda reintentar con el otro. renderMedia igual rechaza su propia
// promesa, así que basta con registrar estas.
process.on('unhandledRejection', (err) => {
  console.error(`[render] error interno de Remotion: ${err instanceof Error ? err.message : String(err)}`)
})

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
  const { serveUrl, comp } = await composition({ ...props, videoEngine: PRIMARY_ENGINE })
  const attempt = async (inputProps: ReelProps, concurrency: number) => {
    let last = -1
    await renderMedia({
      serveUrl,
      composition: comp,
      inputProps,
      codec: 'h264',
      outputLocation: outFile,
      browserExecutable: browserExecutable(),
      chromiumOptions: { gl: GL },
      scale: opts.scale ?? 1,
      crf: 20,
      concurrency,
      offthreadVideoCacheSizeInBytes: VIDEO_CACHE_BYTES,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100)
        if (pct >= last + 10) {
          last = pct
          console.log(`[render] ${pct}%`)
        }
      },
    })
  }
  const concurrency = Number(process.env.REMOTION_CONCURRENCY ?? DEFAULT_CONCURRENCY)
  try {
    await attempt({ ...props, videoEngine: PRIMARY_ENGINE }, concurrency)
  } catch (err) {
    const other = OTHER_ENGINE[PRIMARY_ENGINE]
    console.error(`[render] falló el lector de video '${PRIMARY_ENGINE}': ${err instanceof Error ? err.message : err}`)
    console.log(`[render] reintentando con el otro lector de video (${other})`)
    await attempt({ ...props, videoEngine: other }, Math.min(2, concurrency))
  }
  return outFile
}

/** Cuadros sueltos para revisar el diseño sin renderizar todo el video. */
export async function renderStills(props: ReelProps, frames: number[], outDir: string, scale = 0.5) {
  const { serveUrl, comp } = await composition({ ...props, videoEngine: PRIMARY_ENGINE })
  fs.mkdirSync(outDir, { recursive: true })
  const stills = async (inputProps: ReelProps) => {
    const files: string[] = []
    for (const frame of frames) {
      const output = path.join(outDir, `frame-${String(frame).padStart(4, '0')}.jpeg`)
      await renderStill({
        serveUrl,
        composition: comp,
        inputProps,
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
  try {
    return await stills({ ...props, videoEngine: PRIMARY_ENGINE })
  } catch (err) {
    console.error(`[render] falló el lector de video '${PRIMARY_ENGINE}': ${err instanceof Error ? err.message : err}`)
    return stills({ ...props, videoEngine: OTHER_ENGINE[PRIMARY_ENGINE] })
  }
}
