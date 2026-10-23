/**
 * Golpes (beats) de la música del Reel, para que las tomas sin habla se muevan al ritmo.
 *
 * Detección simple y suficiente para música de Reels: envolvente de ataques (subidas de energía en
 * ventanas de ~23 ms), tempo por autocorrelación entre 70 y 180 BPM y la fase que mejor cae sobre
 * los ataques. Si la pista no tiene un pulso claro devuelve [] y simplemente no hay pulsos.
 */

import { spawn } from 'node:child_process'

const SR = 11025
const HOP = 256
const FRAME = 1024
const MIN_BPM = 70
const MAX_BPM = 180
/** Cuánto debe sobresalir la autocorrelación del tempo elegido sobre el promedio. */
const MIN_PULSE_CLARITY = 2.2

function decodeMono(ffmpeg: string, file: string, maxSec: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-t', maxSec.toFixed(2), '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'])
    const chunks: Buffer[] = []
    child.stdout.on('data', (c: Buffer) => chunks.push(c))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg terminó con código ${code}`))
      const buf = Buffer.concat(chunks)
      resolve(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4)))
    })
  })
}

/** Fuerza de ataque por ventana: subida positiva del logaritmo de la energía. */
function onsetEnvelope(x: Float32Array): Float32Array {
  const n = Math.max(0, Math.floor((x.length - FRAME) / HOP))
  const energy = new Float32Array(n)
  for (let f = 0; f < n; f++) {
    let e = 0
    for (let k = f * HOP, end = k + FRAME; k < end; k++) e += x[k]! * x[k]!
    energy[f] = Math.log(1e-6 + e)
  }
  const onset = new Float32Array(n)
  for (let f = 1; f < n; f++) onset[f] = Math.max(0, energy[f]! - energy[f - 1]!)
  return onset
}

/** Tiempos de los golpes (segundos desde el inicio del archivo). */
export async function detectMusicBeats(ffmpeg: string, file: string, maxSec: number): Promise<number[]> {
  const x = await decodeMono(ffmpeg, file, maxSec)
  const onset = onsetEnvelope(x)
  if (onset.length < 200) return []
  const fps = SR / HOP
  const minLag = Math.round((60 / MAX_BPM) * fps)
  const maxLag = Math.round((60 / MIN_BPM) * fps)

  // Tempo: autocorrelación, con preferencia suave por tempos cercanos a 110 BPM.
  let bestLag = 0
  let bestScore = 0
  let bestRaw = 0
  let sumRaw = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0
    for (let f = lag; f < onset.length; f++) s += onset[f]! * onset[f - lag]!
    sumRaw += s
    const bpm = (60 * fps) / lag
    const weight = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 0.9, 2))
    if (s * weight > bestScore) {
      bestScore = s * weight
      bestLag = lag
      bestRaw = s
    }
  }
  // Sin un pulso que destaque (piano, pads, voz) es mejor no inventar golpes.
  const meanRaw = sumRaw / (maxLag - minLag + 1)
  if (!bestLag || bestRaw < meanRaw * MIN_PULSE_CLARITY) return []

  // Fase: el desfase que más ataques junta, y que el pulso destaque sobre el promedio.
  let bestPhase = 0
  let phaseScore = -1
  for (let ph = 0; ph < bestLag; ph++) {
    let s = 0
    for (let f = ph; f < onset.length; f += bestLag) s += onset[f]!
    if (s > phaseScore) {
      phaseScore = s
      bestPhase = ph
    }
  }
  const mean = onset.reduce((a, b) => a + b, 0) / onset.length
  const hits = Math.ceil((onset.length - bestPhase) / bestLag)
  if (!(phaseScore / hits > mean * 1.6)) return []

  const beats: number[] = []
  for (let f = bestPhase; f < onset.length; f += bestLag) {
    // Ajuste fino al ataque más fuerte cercano
    let peak = f
    for (let g = Math.max(0, f - 2); g <= Math.min(onset.length - 1, f + 2); g++) if (onset[g]! > onset[peak]!) peak = g
    beats.push(Number(((peak * HOP + FRAME / 2) / SR).toFixed(3)))
  }
  return beats
}
