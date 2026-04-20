#!/usr/bin/env node
/**
 * Compara metadatos de color entre dos MP4 (fuente vs salida de Creatomate).
 * Requiere `ffprobe` en PATH (instalar con Homebrew: brew install ffmpeg).
 *
 * Uso:
 *   node scripts/ffprobe-stream-color.mjs ./origen.mp4 ./salida-api.mp4
 *   node scripts/ffprobe-stream-color.mjs https://ejemplo.com/a.mp4  (solo el primero)
 */

import { spawnSync } from 'node:child_process'

function probe(pathOrUrl) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-select_streams', 'v:0', pathOrUrl],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  )
  if (r.error) {
    console.error('No se pudo ejecutar ffprobe:', r.error.message)
    process.exit(1)
  }
  if (r.status !== 0) {
    console.error('ffprobe falló:', r.stderr || r.stdout)
    process.exit(1)
  }
  return JSON.parse(r.stdout || '{}')
}

function pickVideoStream(data) {
  const streams = data.streams
  if (!Array.isArray(streams) || streams.length === 0) return null
  return streams[0]
}

function summarize(label, path, stream) {
  console.log(`\n── ${label} ──`)
  console.log('Origen:', path)
  if (!stream) {
    console.log('(sin stream de vídeo)')
    return
  }
  const fields = [
    ['codec_name', stream.codec_name],
    ['profile', stream.profile],
    ['width x height', stream.width && stream.height ? `${stream.width}x${stream.height}` : '—'],
    ['color_space', stream.color_space],
    ['color_primaries', stream.color_primaries],
    ['color_transfer', stream.color_transfer],
    ['color_range', stream.color_range],
    ['pix_fmt', stream.pix_fmt],
  ]
  for (const [k, v] of fields) {
    console.log(`  ${k}: ${v ?? '—'}`)
  }
}

const a = process.argv[2]
const b = process.argv[3]

if (!a) {
  console.error(
    'Uso: node scripts/ffprobe-stream-color.mjs <archivo-o-url-1> [archivo-o-url-2]\n' +
      'Ejemplo: node scripts/ffprobe-stream-color.mjs ./fuente.mp4 ./creatomate-out.mp4'
  )
  process.exit(1)
}

const d1 = probe(a)
summarize('Entrada 1', a, pickVideoStream(d1))

if (b) {
  const d2 = probe(b)
  summarize('Entrada 2', b, pickVideoStream(d2))
  const s1 = pickVideoStream(d1)
  const s2 = pickVideoStream(d2)
  if (s1 && s2) {
    console.log('\n── Comparación (útiles para ticket Creatomate) ──')
    const keys = ['color_space', 'color_primaries', 'color_transfer', 'color_range', 'pix_fmt']
    for (const k of keys) {
      const v1 = s1[k] ?? '—'
      const v2 = s2[k] ?? '—'
      const mark = v1 === v2 ? '=' : '≠'
      console.log(`  ${k}: ${v1}  ${mark}  ${v2}`)
    }
  }
}

console.log(
  '\nNota: ffprobe solo lee metadatos; no “arregla” el color. Si difieren color_range o primaries, el drift suele venir del pipeline de encoding.'
)
