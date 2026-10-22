/**
 * La CLI de HyperFrames desde el pipeline: revisar (check), sacar capturas (snapshot) y renderizar.
 * Sin telemetría, y sin la descripción automática de capturas con Gemini (la revisión visual la hace Claude).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BIN = path.join(ROOT, 'node_modules/.bin/hyperframes')
/** Chrome sin interfaz que ya trae el servidor (Playwright); si no está, HyperFrames usa el suyo. */
const SERVER_CHROME = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'

function env(): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1' }
  delete e.GEMINI_API_KEY
  if (!e.HYPERFRAMES_BROWSER_PATH && fs.existsSync(SERVER_CHROME)) e.HYPERFRAMES_BROWSER_PATH = SERVER_CHROME
  return e
}

function run(args: string[], dir: string, timeoutMs = 15 * 60_000) {
  const r = spawnSync(BIN, args, { cwd: dir, env: env(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs })
  if (r.error) throw r.error
  return r
}

type Finding = { code?: string; severity?: string; message?: string; selector?: string; time?: number; fix?: string }

/** Mensajes del driver de WebGL por render por software: no son problemas de la composición. */
const NOISE = /GPU stall|GL Driver Message|swiftshader|software ?gl/i

function describe(f: Finding): string {
  const where = [f.selector, f.time !== undefined ? `t=${f.time}` : ''].filter(Boolean).join(', ')
  return `[${f.code ?? '?'}] ${f.message ?? ''}${where ? ` (${where})` : ''}${f.fix ? ` · Fix: ${f.fix}` : ''}`
}

/** `hyperframes check --json`: errores (bloquean) y advertencias (informativas), en texto. */
export function hfCheck(dir: string): { errors: string[]; warnings: string[] } {
  const r = run(['check', '--json', '--timeout', '20000'], dir)
  const start = r.stdout.indexOf('{')
  if (start < 0) throw new Error(`hyperframes check no devolvió JSON: ${(r.stderr || r.stdout).slice(0, 800)}`)
  const report = JSON.parse(r.stdout.slice(start)) as Record<string, unknown>
  const errors = new Set<string>()
  const warnings = new Set<string>()
  for (const section of Object.values(report)) {
    if (!section || typeof section !== 'object' || !Array.isArray((section as { findings?: unknown }).findings)) continue
    for (const f of (section as { findings: Finding[] }).findings) {
      if (NOISE.test(f.message ?? '')) continue
      if (f.severity === 'error') errors.add(describe(f))
      else if (f.severity === 'warning') warnings.add(describe(f))
    }
  }
  return { errors: [...errors], warnings: [...warnings] }
}

/** Capturas en los segundos pedidos, convertidas a JPEG de 540 px de ancho (para mirarlas y mandarlas a Claude). */
export function hfSnapshot(dir: string, times: number[], outDir: string): Array<{ t: number; path: string }> {
  fs.mkdirSync(outDir, { recursive: true })
  const raw = path.join(outDir, 'png')
  const r = run(['snapshot', '--at', times.map((t) => t.toFixed(2)).join(','), '--no-end', '--describe', 'false', '--json', '--timeout', '20000', '--output', raw], dir)
  const start = r.stdout.indexOf('{')
  if (start < 0) throw new Error(`hyperframes snapshot falló: ${(r.stderr || r.stdout).slice(0, 800)}`)
  const report = JSON.parse(r.stdout.slice(start)) as { frames?: Array<{ path: string; time: number }> }
  return (report.frames ?? []).map((f, i) => {
    const jpg = path.join(outDir, `at-${String(i).padStart(2, '0')}-${f.time.toFixed(2)}s.jpg`)
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', f.path, '-vf', 'scale=540:-2', '-q:v', '4', jpg])
    return { t: f.time, path: jpg }
  })
}

/** Render final a MP4 (`looks` por defecto: buena calidad; `draft` para probar rápido). */
export function hfRender(dir: string, out: string, quality = 'looks'): void {
  const r = run(['render', '--quality', quality, '--output', out], dir, 60 * 60_000)
  if (r.status !== 0 || !fs.existsSync(out) || fs.statSync(out).size === 0) {
    throw new Error(`hyperframes render falló: ${(r.stderr || r.stdout).split('\n').filter((l) => /✗|error|Fix/i.test(l)).slice(-12).join('\n')}`)
  }
}
