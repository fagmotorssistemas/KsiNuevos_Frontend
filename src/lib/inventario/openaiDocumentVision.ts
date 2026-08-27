import { docCatalogByType } from '@/lib/inventario/vehicleDocumentCatalog'
import { normalizePlate } from '@/lib/inventario/normalizePlate'
import {
  MATRICULA_VALIDITY_YEARS,
  applyDocumentAiBusinessRules,
  type ContrasteAiContext,
} from '@/lib/inventario/documentAiRules'
import type { VehicleDocType } from '@/types/vehicleLegal.types'

export type DocumentAiQuality = 'ok' | 'blurry' | 'cropped' | 'wrong_document' | 'unreadable'

export type DocumentAiExtracted = {
  plate_read?: string | null
  owner?: string | null
  expiry?: string | null
  fields?: { label: string; value: string }[]
}

export type DocumentAiAnalysis = {
  summary: string
  document_kind_guess: string | null
  matches_expected_type: boolean | null
  matches_plate: boolean | null
  plate_read: string | null
  quality: DocumentAiQuality
  extracted: DocumentAiExtracted
  issues: string[]
  confidence: number | null
  matricula_expired?: boolean | null
  vigencia_hasta?: string | null
  contraste_mismatch?: boolean | null
}

const QUALITIES: DocumentAiQuality[] = ['ok', 'blurry', 'cropped', 'wrong_document', 'unreadable']
const MAX_BYTES = 12 * 1024 * 1024

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4.1'
}

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY no configurada')
  return key
}

function mimeFromName(fileName: string, mimeType: string | null): string {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic'
  return 'image/jpeg'
}

export function assertAnalyzableFile(bytes: Uint8Array, mime: string) {
  if (bytes.byteLength === 0) throw new Error('El archivo está vacío')
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error('El archivo pesa más de 12 MB. Sube una foto más liviana o un PDF más corto.')
  }
  const ok =
    mime === 'application/pdf' ||
    mime.startsWith('image/')
  if (!ok) throw new Error('Solo se analizan imágenes o PDF.')
}

function typeFocusRules(docType: string, docLabel: string): string[] {
  if (docType === 'matricula') {
    return [
      `Analiza esta foto como matrícula (${docLabel}).`,
      `REGLA DE VIGENCIA: la matrícula solo tiene ${MATRICULA_VALIDITY_YEARS} años desde su fecha de emisión / última matrícula. Si ya pasó, ESTÁ EXPIRADA (matricula_expired=true y un issue).`,
      'REGLA SRI: si EcuadorAPI tiene matrícula pendiente y en esta foto no aparece ese monto o el papel parece al día, contraste_mismatch=true y un issue claro.',
    ]
  }
  if (docType === 'revision_tecnica') {
    return [
      `Analiza esta foto como revisión técnica vehicular (${docLabel}).`,
      'NO digas que el documento no es una matrícula. No evalúes vigencia de matrícula.',
      'Si EcuadorAPI trae pendiente de revisión, compáralo solo con este certificado RTV.',
    ]
  }
  if (docType === 'informe_ant_siat') {
    return [
      `Analiza esta foto como informe ANT (${docLabel}).`,
      'NO digas que no es una matrícula. Céntrate en citaciones, puntos y estado del informe.',
    ]
  }
  return [
    `Analiza ÚNICAMENTE este archivo como: ${docLabel} (${docType}).`,
    'Céntrate en lo que se ve en ESTA foto: texto, fechas, partes, firmas, cláusulas, placas si aparecen.',
    'PROHIBIDO: decir que la foto no es una matrícula, que falta la matrícula, o evaluar vigencia de 4 años / pendientes SRI de matrícula.',
    'quality=wrong_document solo si el archivo está en blanco, borroso total o no es un documento (p. ej. un paisaje). Nunca porque no sea matrícula.',
    'matricula_expired debe ser null. contraste_mismatch debe ser null salvo que esta foto muestre un dato que contradiga claramente el mismo tipo de documento.',
  ]
}

function shouldAttachContraste(docType: string): boolean {
  return docType === 'matricula' || docType === 'revision_tecnica' || docType === 'informe_ant_siat'
}

function buildPrompt(input: {
  docType: string
  docLabel: string
  placa: string | null
  contraste: ContrasteAiContext | null
}): string {
  const plate = input.placa ? normalizePlate(input.placa) : null
  const today = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
  const attachContraste = shouldAttachContraste(input.docType) && Boolean(input.contraste)

  const lines = [
    'Eres un analista documental de un concesionario en Ecuador.',
    `Hoy (Ecuador) es ${today}.`,
    'Revisa SOLO el archivo adjunto. No lo compares con otros tipos de documento del expediente.',
    'Responde SOLO un JSON válido con estas claves:',
    '{',
    '  "summary": "string, 3 a 6 oraciones en español sobre ESTA foto",',
    '  "document_kind_guess": "qué documento parece (del tipo que estás analizando)",',
    '  "matches_expected_type": true | false | null,',
    '  "matches_plate": true | false | null,',
    '  "plate_read": "placa leída o null",',
    '  "quality": "ok" | "blurry" | "cropped" | "wrong_document" | "unreadable",',
    '  "extracted": { "owner": string|null, "expiry": string|null, "fields": [{"label","value"}] },',
    '  "issues": ["solo problemas de ESTA foto: ilegible, fecha, firmas, montos de este documento"],',
    '  "matricula_expired": true | false | null,',
    '  "vigencia_hasta": "fecha dd/mm/aaaa o null",',
    '  "contraste_mismatch": true | false | null,',
    '  "confidence": number entre 0 y 1',
    '}',
    ...typeFocusRules(input.docType, input.docLabel),
    plate
      ? `Placa del inventario (contexto): ${plate}. Si en la foto hay placa, indica si coincide. Si no hay placa, matches_plate=null.`
      : 'No hay placa de inventario. matches_plate debe ser null.',
    'No inventes campos ilegibles. No des consejos legales. No menciones que eres un modelo de IA.',
  ]

  if (attachContraste && input.contraste) {
    lines.push('--- DATOS ECUADORAPI SOLO PARA ESTE TIPO DE DOCUMENTO ---', input.contraste.snapshotText)
  }

  return lines.join('\n')
}

function asQuality(value: unknown): DocumentAiQuality {
  return typeof value === 'string' && QUALITIES.includes(value as DocumentAiQuality)
    ? (value as DocumentAiQuality)
    : 'unreadable'
}

function asBool(value: unknown): boolean | null {
  if (value === true || value === false) return value
  return null
}

function parseAnalysis(raw: string): DocumentAiAnalysis {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw
  const parsed = JSON.parse(jsonText) as Record<string, unknown>
  const extractedRaw = parsed.extracted && typeof parsed.extracted === 'object' && !Array.isArray(parsed.extracted)
    ? (parsed.extracted as Record<string, unknown>)
    : {}
  const fieldsRaw = Array.isArray(extractedRaw.fields) ? extractedRaw.fields : []
  const fields = fieldsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as { label?: unknown; value?: unknown }
      if (typeof row.label !== 'string' || typeof row.value !== 'string') return null
      return { label: row.label, value: row.value }
    })
    .filter((row): row is { label: string; value: string } => Boolean(row))

  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.filter((item): item is string => typeof item === 'string')
    : []

  const confidence =
    typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.min(1, Math.max(0, parsed.confidence))
      : null

  return {
    summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : 'Sin resumen.',
    document_kind_guess: typeof parsed.document_kind_guess === 'string' ? parsed.document_kind_guess : null,
    matches_expected_type: asBool(parsed.matches_expected_type),
    matches_plate: asBool(parsed.matches_plate),
    plate_read: typeof parsed.plate_read === 'string' ? parsed.plate_read : null,
    quality: asQuality(parsed.quality),
    extracted: {
      owner: typeof extractedRaw.owner === 'string' ? extractedRaw.owner : null,
      expiry: typeof extractedRaw.expiry === 'string' ? extractedRaw.expiry : null,
      plate_read: typeof parsed.plate_read === 'string' ? parsed.plate_read : null,
      fields,
    },
    issues,
    confidence,
    matricula_expired: asBool(parsed.matricula_expired),
    vigencia_hasta: typeof parsed.vigencia_hasta === 'string' ? parsed.vigencia_hasta : null,
    contraste_mismatch: asBool(parsed.contraste_mismatch),
  }
}

type ChatContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } }

export async function analyzeDocumentFileWithOpenAI(input: {
  bytes: Uint8Array
  mime: string
  fileName: string
  docType: string
  placa: string | null
  contraste: ContrasteAiContext | null
}): Promise<{ analysis: DocumentAiAnalysis; model: string; rawText: string }> {
  const mime = mimeFromName(input.fileName, input.mime)
  assertAnalyzableFile(input.bytes, mime)
  const model = getOpenAiModel()
  const catalog = docCatalogByType(input.docType as VehicleDocType)
  const prompt = buildPrompt({
    docType: input.docType,
    docLabel: catalog?.label ?? input.docType,
    placa: input.placa,
    contraste: input.contraste,
  })

  const b64 = Buffer.from(input.bytes).toString('base64')
  const dataUrl = `data:${mime};base64,${b64}`
  const content: ChatContent[] = [{ type: 'text', text: prompt }]
  if (mime === 'application/pdf') {
    content.push({
      type: 'file',
      file: { filename: input.fileName || 'documento.pdf', file_data: dataUrl },
    })
  } else {
    content.push({ type: 'image_url', image_url: { url: dataUrl } })
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  })

  const body = (await res.json()) as {
    error?: { message?: string }
    choices?: { message?: { content?: string } }[]
  }
  if (!res.ok) {
    throw new Error(body.error?.message?.trim() || `OpenAI respondió ${res.status}`)
  }
  const rawText = body.choices?.[0]?.message?.content?.trim()
  if (!rawText) throw new Error('OpenAI no devolvió contenido')
  const analysis = applyDocumentAiBusinessRules(parseAnalysis(rawText), {
    docType: input.docType,
    contraste: input.contraste,
  })
  return { analysis, model, rawText }
}
