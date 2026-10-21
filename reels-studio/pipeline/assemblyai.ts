/**
 * Transcripción con AssemblyAI: palabras con tiempo exacto (ms) y confianza.
 * Se le pasan como "keyterms" la marca, el modelo y los datos del carro para que no
 * escriba "Cebrol eTriBlaser" en vez de "Chevrolet Trailblazer".
 */
import fs from 'node:fs'
import type { Word } from '../src/plan/types'

const BASE = 'https://api.assemblyai.com/v2'
const POLL_MS = 3000
const TIMEOUT_MS = 10 * 60 * 1000

/** Vocabulario fijo del concesionario; se suma al del vehículo. */
const DEALER_TERMS = [
  'K-Si Nuevos',
  'seminuevo',
  'kilometraje',
  'cilindraje',
  'diésel',
  'gasolina',
  'automático',
  'manual',
  '4x4',
  '4x2',
  'tracción',
  'torque',
  'caballos de fuerza',
  'financiamiento',
  'entrada',
  'cuotas',
  'WhatsApp',
  'comenta',
]

export type TranscribedWord = Word & { confidence: number }

function key(): string {
  const k = process.env.ASSEMBLYAI_API_KEY
  if (!k) throw new Error('Falta ASSEMBLYAI_API_KEY')
  return k
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      if (i < attempts) {
        console.warn(`[assemblyai] ${label}: reintento ${i}/${attempts - 1} (${String(err)})`)
        await new Promise((r) => setTimeout(r, 2000 * i))
      }
    }
  }
  throw last
}

async function upload(file: string): Promise<string> {
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: key() },
    body: fs.readFileSync(file),
  })
  if (!res.ok) throw new Error(`upload HTTP ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { upload_url: string }
  return data.upload_url
}

export async function transcribeClip(file: string, keyterms: string[]): Promise<TranscribedWord[]> {
  const audioUrl = await withRetry('upload', () => upload(file))
  const speechModels = (process.env.ASSEMBLYAI_SPEECH_MODELS ?? 'universal-3-pro,universal-2').split(',').map((s) => s.trim())
  const terms = [...new Set([...keyterms, ...DEALER_TERMS].map((t) => t.trim()).filter(Boolean))].slice(0, 200)

  const id = await withRetry('submit', async () => {
    const res = await fetch(`${BASE}/transcript`, {
      method: 'POST',
      headers: { Authorization: key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_url: audioUrl,
        speech_models: speechModels,
        language_code: process.env.ASSEMBLYAI_LANGUAGE_CODE ?? 'es',
        keyterms_prompt: terms,
        punctuate: true,
        format_text: true,
      }),
    })
    if (!res.ok) throw new Error(`transcript HTTP ${res.status}: ${await res.text()}`)
    return ((await res.json()) as { id: string }).id
  })

  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/transcript/${id}`, { headers: { Authorization: key() } })
    if (res.ok) {
      const data = (await res.json()) as {
        status: string
        error?: string
        words?: Array<{ text: string; start: number; end: number; confidence: number }>
      }
      if (data.status === 'completed') {
        return (data.words ?? []).map((w) => ({ text: w.text, start: w.start, end: w.end, confidence: w.confidence }))
      }
      if (data.status === 'error') throw new Error(`AssemblyAI: ${data.error}`)
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  throw new Error(`AssemblyAI: la transcripción ${id} tardó más de 10 minutos`)
}
