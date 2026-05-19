#!/usr/bin/env node
/** Copia @ffmpeg/core a public/ffmpeg para cargarlo desde el mismo origen (evita CDN bloqueado). */
import { cp, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const dest = join(root, 'public', 'ffmpeg')

await mkdir(dest, { recursive: true })
await cp(src, dest, { recursive: true, force: true })
console.log('[copy-ffmpeg-core] OK → public/ffmpeg')
