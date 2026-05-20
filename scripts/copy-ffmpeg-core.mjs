#!/usr/bin/env node
/**
 * Copia @ffmpeg/core a public/ffmpeg para servirlo en el mismo origen (prod + local).
 * Se ejecuta en postinstall y antes de `next build` (Vercel).
 */
import { access, cp, mkdir, stat } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const dest = join(root, 'public', 'ffmpeg')

async function mustExist(path, label) {
  try {
    await access(path)
  } catch {
    console.error(`[copy-ffmpeg-core] Falta ${label}: ${path}`)
    console.error('[copy-ffmpeg-core] Ejecuta: npm install')
    process.exit(1)
  }
}

await mustExist(src, '@ffmpeg/core (npm install)')
await mkdir(dest, { recursive: true })
await cp(src, dest, { recursive: true, force: true })

for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  const p = join(dest, name)
  await mustExist(p, name)
  const { size } = await stat(p)
  console.log(`[copy-ffmpeg-core] ${name} → ${(size / 1024 / 1024).toFixed(2)} MB`)
}

console.log('[copy-ffmpeg-core] OK → public/ffmpeg')
