/**
 * Transcripción con AssemblyAI — genera SRT con timestamps por palabra
 * y retorna las palabras crudas para el segmentador.
 */

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'
const POLL_INTERVAL_MS = 5_000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutos
const MAX_RETRIES = 3

const AUTOMOTIVE_WORD_BOOST = [
  'motor', 'kilometraje', 'transmisión', 'versión', 'precio', 'financiamiento',
  'garantía', 'equipamiento', 'concesionaria', 'automático', 'turbo', 'cilindraje',
  'tracción', 'suspensión', 'frenos', 'airbag', 'rines', 'pantalla', 'cámara',
  'sensor', 'asientos', 'cuero', 'bluetooth', 'USB', 'navegación', 'carrocería',
  'sedán', 'SUV', 'pickup', 'hatchback', 'coupé', 'eléctrico', 'híbrido',
  // Hispano / inventario típico (mejor reconocimiento que solo inglés)
  'furgoneta', 'camioneta', 'camión', 'pasajeros', 'carga', 'platonera',
  'Nissan', 'Toyota', 'Chevrolet', 'Hyundai', 'Kia', 'Mazda', 'Honda', 'Ford',
  'Volkswagen', 'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Suzuki', 'Mitsubishi',
  'Tiida', 'Sentra', 'Versa', 'March', 'Frontier', 'Hilux', 'RAV4', 'CR-V',
  'Ksi', 'Casi Nuevos', 'concesionario', 'seminuevo', 'seminuevos', 'kilómetros',
  // Microclips de apertura (marca / modelo / año en clips de ~1s)
  'Prado', 'Land Cruiser', 'Landcruiser', 'LC200', 'LC 200', 'LC150', 'LC 150',
]

export interface RawWord {
  text: string
  start: number // ms
  end: number   // ms
}

interface AssemblyAITranscriptResponse {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text?: string
  error?: string
  words?: Array<{ text: string; start: number; end: number; confidence: number }>
}

function apiHeaders() {
  return {
    Authorization: process.env.ASSEMBLYAI_API_KEY!,
    'Content-Type': 'application/json',
  }
}

/** Sube bytes al CDN de AssemblyAI y devuelve la URL interna para transcripción. */
async function uploadBytesToAssemblyAI(fileBytes: Buffer): Promise<string> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! },
    body: new Uint8Array(fileBytes),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[VideoV2AssemblyAI] Error subiendo archivo: ${err}`)
  }
  const data = (await res.json()) as { upload_url?: string }
  if (!data.upload_url) throw new Error('[VideoV2AssemblyAI] Upload sin upload_url')
  return data.upload_url
}

async function downloadMediaForAssemblyAI(signedUrl: string, jobId: string): Promise<Buffer> {
  console.log(`[VideoV2Pipeline][${jobId}][AssemblyAI] Descargando clip desde Storage para upload directo…`)
  const res = await fetch(signedUrl, { signal: AbortSignal.timeout(5 * 60 * 1000) })
  if (!res.ok) {
    throw new Error(`[VideoV2AssemblyAI] No se pudo descargar el clip (HTTP ${res.status})`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  console.log(
    `[VideoV2Pipeline][${jobId}][AssemblyAI] Descargado ${(buf.length / 1024 / 1024).toFixed(1)} MB para upload`
  )
  return buf
}

async function resolveAssemblyAudioSource(signedUrl: string, jobId: string): Promise<string> {
  const bytes = await downloadMediaForAssemblyAI(signedUrl, jobId)
  return uploadBytesToAssemblyAI(bytes)
}

async function submitTranscription(audioUrl: string): Promise<string> {
  /** Por defecto forzamos español; se puede sobrescribir por env (ej. `en`, `pt`). */
  const forcedLang = process.env.VIDEO_ASSEMBLY_LANGUAGE_CODE?.trim() || 'es'

  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    speech_models: ['universal-2'],
    filter_profanity: false,
    word_boost: AUTOMOTIVE_WORD_BOOST,
    boost_param: 'high',
  }
  if (forcedLang) {
    body.language_code = forcedLang
    body.language_detection = false
  } else {
    body.language_detection = true
  }

  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[VideoV2AssemblyAI] Error al enviar transcripción: ${err}`)
  }

  const data = (await res.json()) as AssemblyAITranscriptResponse
  return data.id
}

async function pollTranscription(transcriptId: string): Promise<AssemblyAITranscriptResponse> {
  const deadline = Date.now() + TIMEOUT_MS
  let retries = 0

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
        headers: apiHeaders(),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = (await res.json()) as AssemblyAITranscriptResponse

      if (data.status === 'completed') return data
      if (data.status === 'error') throw new Error(`AssemblyAI error: ${data.error}`)

      retries = 0
      await sleep(POLL_INTERVAL_MS)
    } catch (err) {
      retries++
      if (retries >= MAX_RETRIES) throw err
      console.warn(`[VideoV2AssemblyAI] Reintento ${retries}/${MAX_RETRIES} al hacer polling: ${err}`)
      await sleep(POLL_INTERVAL_MS * 2)
    }
  }

  throw new Error('[VideoV2AssemblyAI] Timeout: la transcripción tardó más de 10 minutos')
}

export function buildSrtFromRawWords(words: RawWord[]): string {
  if (words.length === 0) return ''
  return wordsToSrt(
    words.map((w) => ({ text: w.text, start: w.start, end: w.end, confidence: 1 }))
  )
}

function wordsToSrt(words: AssemblyAITranscriptResponse['words']): string {
  if (!words || words.length === 0) return ''

  const CHUNK_DURATION_MS = 5000
  const chunks: Array<{ start: number; end: number; text: string }> = []

  let chunkStart = words[0].start
  let chunkEnd = words[0].end
  let chunkWords: string[] = [words[0].text]

  for (let i = 1; i < words.length; i++) {
    const w = words[i]
    if (w.start - chunkStart > CHUNK_DURATION_MS || chunkWords.length >= 10) {
      chunks.push({ start: chunkStart, end: chunkEnd, text: chunkWords.join(' ') })
      chunkStart = w.start
      chunkEnd = w.end
      chunkWords = [w.text]
    } else {
      chunkEnd = w.end
      chunkWords.push(w.text)
    }
  }
  if (chunkWords.length > 0) {
    chunks.push({ start: chunkStart, end: chunkEnd, text: chunkWords.join(' ') })
  }

  return chunks
    .map((chunk, i) => {
      const startTime = msToSrtTime(chunk.start)
      const endTime = msToSrtTime(chunk.end)
      return `${i + 1}\n${startTime} --> ${endTime}\n${chunk.text}`
    })
    .join('\n\n')
}

function extractRawWords(words: AssemblyAITranscriptResponse['words']): RawWord[] {
  if (!words || words.length === 0) return []
  return words.map((w) => ({ text: w.text, start: w.start, end: w.end }))
}

function msToSrtTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad3(milliseconds)}`
}

function pad(n: number) { return String(n).padStart(2, '0') }
function pad3(n: number) { return String(n).padStart(3, '0') }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export interface TranscriptionResult {
  transcriptId: string
  srtContent: string
  rawWords: RawWord[]
}

function buildTranscriptionResult(result: AssemblyAITranscriptResponse): TranscriptionResult {
  const srtContent = wordsToSrt(result.words)
  const rawWords = extractRawWords(result.words)
  return { transcriptId: result.id, srtContent, rawWords }
}

async function transcribeFromAudioSource(audioUrl: string, jobId: string): Promise<TranscriptionResult> {
  let transcriptId: string
  let retries = 0
  while (true) {
    try {
      transcriptId = await submitTranscription(audioUrl)
      break
    } catch (err) {
      retries++
      if (retries >= MAX_RETRIES) throw err
      console.warn(`[VideoV2Pipeline][${jobId}][AssemblyAI] Reintento envío ${retries}: ${err}`)
      await sleep(5000)
    }
  }

  console.log(`[VideoV2Pipeline][${jobId}][AssemblyAI] Transcript ID: ${transcriptId}. Haciendo polling...`)

  const result = await pollTranscription(transcriptId)
  const built = buildTranscriptionResult(result)
  console.log(
    `[VideoV2Pipeline][${jobId}][AssemblyAI] Transcripción completada. SRT generado (${built.rawWords.length} palabras crudas).`
  )
  return built
}

export async function transcribeVideoV2(
  signedUrl: string,
  jobId: string
): Promise<TranscriptionResult> {
  console.log(`[VideoV2Pipeline][${jobId}][AssemblyAI] Iniciando transcripción (upload directo)`)
  const uploadUrl = await resolveAssemblyAudioSource(signedUrl, jobId)
  return transcribeFromAudioSource(uploadUrl, jobId)
}
