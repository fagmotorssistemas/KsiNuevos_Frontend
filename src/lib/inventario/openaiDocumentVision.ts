import { docCatalogByType } from '@/lib/inventario/vehicleDocumentCatalog'
import { normalizePlate } from '@/lib/inventario/normalizePlate'
import {
  MATRICULA_VALIDITY_YEARS,
  applyDocumentAiBusinessRules,
  clarifyAiSystemWording,
  isVagueDiscrepancyText,
  type ContrasteAiContext,
  type VehicleRecordContext,
} from '@/lib/inventario/documentAiRules'
import type { VehicleDocType } from '@/types/vehicleLegal.types'

export type DocumentAiQuality = 'ok' | 'blurry' | 'cropped' | 'wrong_document' | 'unreadable'

export type DocumentAiExtracted = {
  plate_read?: string | null
  owner?: string | null
  place?: string | null
  country?: string | null
  issue_date?: string | null
  expiry?: string | null
  registration_year?: string | null
  fields?: { label: string; value: string }[]
}

export type DocumentAiAnalysis = {
  summary: string
  document_kind_guess: string | null
  matches_expected_type: boolean | null
  matches_plate: boolean | null
  matches_owner: boolean | null
  matches_place: boolean | null
  matches_country: boolean | null
  matches_dates: boolean | null
  plate_read: string | null
  quality: DocumentAiQuality
  extracted: DocumentAiExtracted
  issues: string[]
  confidence: number | null
  matricula_expired?: boolean | null
  vigencia_hasta?: string | null
  contraste_mismatch?: boolean | null
  photo_should_not_be_uploaded?: boolean | null
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
      'REGLA DE CARGA: subir esta foto a "Matrícula vigente" significa que está al día: no vencida, sin pendientes SRI y sin multas. Si no cumple, photo_should_not_be_uploaded=true y cada issue DEBE nombrar el hecho exacto (fecha de vencimiento, monto SRI $, cantidad de citaciones). PROHIBIDO decir "hay discrepancias".',
      'También extrae propietario, lugar de matrícula y país si aparecen, y contrástalos con las fuentes nombradas (ficha de inventario KSI, historial de propietarios, EcuadorAPI). Nunca digas "sistema 1" ni "sistema 2".',
    ]
  }
  if (docType === 'revision_tecnica') {
    return [
      `Analiza esta foto como revisión técnica vehicular (${docLabel}).`,
      'NO digas que el documento no es una matrícula. No evalúes vigencia de matrícula.',
      'Si EcuadorAPI trae pendiente de revisión, compáralo solo con este certificado RTV.',
      'REGLA DE CARGA: subir la foto a esta sección afirma que la RTV está al día. Si hay pendiente o está vencida, photo_should_not_be_uploaded=true y nombra el monto o la fecha. PROHIBIDO decir "hay discrepancias".',
    ]
  }
  if (docType === 'informe_ant_siat') {
    return [
      `Analiza esta foto como informe ANT (${docLabel}).`,
      'NO digas que no es una matrícula. Céntrate en citaciones, puntos y estado del informe.',
      'REGLA DE CARGA: si el informe muestra deudas o citaciones pendientes, photo_should_not_be_uploaded=true y nombra cuántas citaciones y el valor. PROHIBIDO decir "hay discrepancias".',
    ]
  }
  if (docType === 'poder_contrato') {
    return [
      `Analiza esta foto como poder / contrato (${docLabel}).`,
      'Extrae TODAS las partes: poderdante/propietario, apoderado, placa, lugar de otorgamiento, país, fechas (otorgamiento y las de matrícula si aparecen).',
      'Si hay propietario, lugar, país o fechas de matrícula/registro, contrástalos con las fuentes nombradas (ficha KSI, historial de propietarios, EcuadorAPI). Si el dato aparece en la foto y no coincide, matches_owner/matches_place/matches_country/matches_dates=false y un issue que nombre la fuente (nunca "sistema 1/2").',
      'Si un dato no se ve en la foto, el matches_* de ese dato debe ser null (no inventes desajuste).',
      'REGLA DE CARGA: si la placa, el propietario u otros datos visibles no son de este vehículo, photo_should_not_be_uploaded=true. PROHIBIDO decir "hay discrepancias".',
    ]
  }
  return [
    `Analiza ÚNICAMENTE este archivo como: ${docLabel} (${docType}).`,
    'Céntrate en lo que se ve en ESTA foto: texto, fechas, partes, firmas, cláusulas, placas, propietario, lugar y país si aparecen.',
    'Si el documento muestra propietario, lugar, país o fechas de matrícula/registro, contrástalos con las fuentes nombradas (ficha KSI, historial de propietarios, EcuadorAPI). Si no se ven, matches_owner/place/country/dates=null.',
    'REGLA DE CARGA: si se subió una foto a esta sección, se asume que el documento es válido y corresponde. Si no, photo_should_not_be_uploaded=true y explica qué se ve mal (ilegible, recortada, otro tipo de papel, otro propietario o placa). PROHIBIDO decir "hay discrepancias".',
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
  vehicleRecord: VehicleRecordContext | null
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
    'La foto debe ser una fotografía VÁLIDA y legible de ese documento. Si está borrosa, recortada, no se lee o no es ese documento, indícalo.',
    'Responde SOLO un JSON válido con estas claves:',
    '{',
    '  "summary": "string, 3 a 6 oraciones en español sobre ESTA foto",',
    '  "document_kind_guess": "qué documento parece (del tipo que estás analizando)",',
    '  "matches_expected_type": true | false | null,',
    '  "matches_plate": true | false | null,',
    '  "matches_owner": true | false | null,',
    '  "matches_place": true | false | null,',
    '  "matches_country": true | false | null,',
    '  "matches_dates": true | false | null,',
    '  "plate_read": "placa leída o null",',
    '  "quality": "ok" | "blurry" | "cropped" | "wrong_document" | "unreadable",',
    '  "extracted": { "owner": string|null, "place": string|null, "country": string|null, "issue_date": string|null, "expiry": string|null, "registration_year": string|null, "fields": [{"label","value"}] },',
    '  "issues": ["cada ítem debe nombrar el problema concreto: fecha, monto, cita, calidad de la foto. Nunca digas solo discrepancias"],',
    '  "matricula_expired": true | false | null,',
    '  "vigencia_hasta": "fecha dd/mm/aaaa o null",',
    '  "contraste_mismatch": true | false | null,',
    '  "photo_should_not_be_uploaded": true | false | null,',
    '  "confidence": number entre 0 y 1',
    '}',
    ...typeFocusRules(input.docType, input.docLabel),
    plate
      ? `Placa del inventario (contexto): ${plate}. Si en la foto hay placa, indica si coincide. Si no hay placa, matches_plate=null.`
      : 'No hay placa de inventario. matches_plate debe ser null.',
    'Si en la foto hay propietario, lugar, país o fechas de matrícula/registro, extrae esos campos y marca matches_* (true/false). Si el dato no aparece, matches_*=null. No compares la fecha de firma de un poder con el año del vehículo; sí compara fechas de matrícula, emisión o registro.',
    'No inventes campos ilegibles. No des consejos legales. No menciones que eres un modelo de IA.',
  ]

  if (input.vehicleRecord) {
    lines.push(input.vehicleRecord.snapshotText)
  }

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

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
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
    matches_owner: asBool(parsed.matches_owner),
    matches_place: asBool(parsed.matches_place),
    matches_country: asBool(parsed.matches_country),
    matches_dates: asBool(parsed.matches_dates),
    plate_read: typeof parsed.plate_read === 'string' ? parsed.plate_read : null,
    quality: asQuality(parsed.quality),
    extracted: {
      owner: asStringOrNull(extractedRaw.owner),
      place: asStringOrNull(extractedRaw.place),
      country: asStringOrNull(extractedRaw.country),
      issue_date: asStringOrNull(extractedRaw.issue_date),
      expiry: asStringOrNull(extractedRaw.expiry),
      registration_year: asStringOrNull(extractedRaw.registration_year),
      plate_read: typeof parsed.plate_read === 'string' ? parsed.plate_read : null,
      fields,
    },
    issues,
    confidence,
    matricula_expired: asBool(parsed.matricula_expired),
    vigencia_hasta: typeof parsed.vigencia_hasta === 'string' ? parsed.vigencia_hasta : null,
    contraste_mismatch: asBool(parsed.contraste_mismatch),
    photo_should_not_be_uploaded: asBool(parsed.photo_should_not_be_uploaded),
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
  vehicleRecord?: VehicleRecordContext | null
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
    vehicleRecord: input.vehicleRecord ?? null,
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
    vehicleRecord: input.vehicleRecord ?? null,
  })
  return { analysis, model, rawText }
}

export type VehicleAiSynthesisItem = {
  docType: string
  docLabel: string
  fileName: string
  fileId?: string | null
  summary: string
  issues: string[]
  error?: string | null
  missing?: boolean
  detailText?: string | null
  photoIndex?: number | null
  photoShouldNotBeUploaded?: boolean | null
}

export type VehicleAiSource = {
  docType: string
  docLabel: string
  photoIndex: number | null
  fileName: string | null
  fileId?: string | null
  kind: 'photo' | 'missing' | 'detail' | 'api'
  label: string
}

export type VehicleAiFinding = {
  text: string
  sources: VehicleAiSource[]
}

export type VehicleAiSynthesis = {
  overall_summary: string
  alerts: VehicleAiFinding[]
  blocks: { docType: string; title: string; conclusion: string; alerts: VehicleAiFinding[] }[]
}

export function normalizeFindings(raw: unknown): VehicleAiFinding[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string' && item.trim()) return { text: clarifyAiSystemWording(item.trim()), sources: [] as VehicleAiSource[] }
      if (!item || typeof item !== 'object') return null
      const row = item as { text?: unknown; sources?: unknown }
      if (typeof row.text !== 'string' || !row.text.trim()) return null
      const sources = Array.isArray(row.sources)
        ? row.sources
            .map((source) => {
              if (!source || typeof source !== 'object') return null
              const s = source as VehicleAiSource
              if (typeof s.label !== 'string' && typeof s.docType !== 'string') return null
              return {
                docType: s.docType || '',
                docLabel: s.docLabel || s.docType || '',
                photoIndex: typeof s.photoIndex === 'number' ? s.photoIndex : null,
                fileName: s.fileName ?? null,
                fileId: s.fileId ?? null,
                kind: s.kind || 'photo',
                label: s.label || s.docLabel || 'Fuente',
              } satisfies VehicleAiSource
            })
            .filter((s): s is VehicleAiSource => Boolean(s))
        : []
      return { text: clarifyAiSystemWording(row.text.trim()), sources }
    })
    .filter((item): item is VehicleAiFinding => Boolean(item))
}

function sourceLabel(input: {
  docLabel: string
  photoIndex: number | null
  kind: VehicleAiSource['kind']
}): string {
  if (input.kind === 'missing') return `Sin archivo · ${input.docLabel}`
  if (input.kind === 'detail') return `Detalle · ${input.docLabel}`
  if (input.kind === 'api') return 'EcuadorAPI (contraste)'
  if (input.photoIndex) return `Foto ${input.photoIndex} · ${input.docLabel}`
  return input.docLabel
}

function parseSource(raw: unknown, items: VehicleAiSynthesisItem[]): VehicleAiSource | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const docType = typeof row.docType === 'string' ? row.docType : typeof row.tipo === 'string' ? row.tipo : ''
  const kindRaw = typeof row.kind === 'string' ? row.kind : 'photo'
  const kind: VehicleAiSource['kind'] =
    kindRaw === 'missing' || kindRaw === 'detail' || kindRaw === 'api' ? kindRaw : 'photo'
  const photoIndex =
    typeof row.foto === 'number' ? row.foto : typeof row.photoIndex === 'number' ? row.photoIndex : null
  const matched =
    items.find((item) => item.docType === docType && (photoIndex == null || item.photoIndex === photoIndex)) ||
    items.find((item) => item.docType === docType)
  const docLabel =
    typeof row.docLabel === 'string'
      ? row.docLabel
      : typeof row.seccion === 'string'
        ? row.seccion
        : matched?.docLabel || docType || 'Documento'
  return {
    docType,
    docLabel,
    photoIndex: kind === 'photo' ? photoIndex ?? matched?.photoIndex ?? null : null,
    fileName: kind === 'photo' ? matched?.fileName || (typeof row.fileName === 'string' ? row.fileName : null) : null,
    fileId: kind === 'photo' ? matched?.fileId || (typeof row.fileId === 'string' ? row.fileId : null) : null,
    kind,
    label: sourceLabel({
      docLabel,
      photoIndex: kind === 'photo' ? photoIndex ?? matched?.photoIndex ?? null : null,
      kind,
    }),
  }
}

function parseFinding(raw: unknown, items: VehicleAiSynthesisItem[]): VehicleAiFinding | null {
  if (typeof raw === 'string' && raw.trim()) return { text: clarifyAiSystemWording(raw.trim()), sources: [] }
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const text = typeof row.text === 'string' ? clarifyAiSystemWording(row.text.trim()) : ''
  if (!text) return null
  const sourcesRaw = Array.isArray(row.sources) ? row.sources : row.source != null ? [row.source] : []
  return {
    text,
    sources: sourcesRaw.map((s) => parseSource(s, items)).filter((s): s is VehicleAiSource => Boolean(s)),
  }
}

function parseFindings(raw: unknown, items: VehicleAiSynthesisItem[]): VehicleAiFinding[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => parseFinding(item, items)).filter((item): item is VehicleAiFinding => Boolean(item))
}

function specificInvalidUploadText(item: VehicleAiSynthesisItem): string | null {
  const concrete = item.issues.find(
    (issue) => issue.toLowerCase().includes('no debió') && !isVagueDiscrepancyText(issue)
  )
  if (concrete) return concrete
  const details = item.issues.filter((issue) => !issue.toLowerCase().includes('no debió') && !isVagueDiscrepancyText(issue))
  if (details.length === 0) return null
  if (details.length === 1) {
    return `Esta fotografía no debió haberse subido a «${item.docLabel}». Esta sección solo se usa cuando el documento está al día y la foto es válida. Lo encontrado: ${details[0]}`
  }
  const listed = details.map((reason, index) => `${index + 1}) ${reason}`).join(' ')
  return `Esta fotografía no debió haberse subido a «${item.docLabel}». Esta sección solo se usa cuando el documento está al día y la foto es válida. Lo encontrado: ${listed}`
}

function findingMentionsInvalidUpload(finding: VehicleAiFinding, item: VehicleAiSynthesisItem): boolean {
  const text = finding.text.toLowerCase()
  if (!text.includes('no debió') && !text.includes('no debio')) return false
  return finding.sources.some(
    (source) =>
      source.kind === 'photo' &&
      source.docType === item.docType &&
      (item.photoIndex == null || source.photoIndex == null || source.photoIndex === item.photoIndex)
  )
}

function rewriteVagueFindings(findings: VehicleAiFinding[], items: VehicleAiSynthesisItem[]): VehicleAiFinding[] {
  return findings.map((finding) => {
    if (!isVagueDiscrepancyText(finding.text)) return finding
    const item = items.find((row) =>
      finding.sources.some(
        (source) => source.docType === row.docType && (source.photoIndex == null || row.photoIndex === source.photoIndex)
      )
    )
    const replacement = item ? specificInvalidUploadText(item) : null
    if (!replacement) return finding
    return { ...finding, text: replacement }
  })
}

function mergeInvalidUploadFindings(synthesis: VehicleAiSynthesis, items: VehicleAiSynthesisItem[]): VehicleAiSynthesis {
  const extras: VehicleAiFinding[] = []
  for (const item of items) {
    if (item.missing || !item.photoShouldNotBeUploaded) continue
    const already = synthesis.alerts.some(
      (finding) => findingMentionsInvalidUpload(finding, item) && !isVagueDiscrepancyText(finding.text)
    )
    if (already) continue
    const text = specificInvalidUploadText(item)
    if (!text) continue
    const photoIndex = item.photoIndex ?? null
    extras.push({
      text,
      sources: [
        {
          docType: item.docType,
          docLabel: item.docLabel,
          photoIndex,
          fileName: item.fileName || null,
          kind: 'photo',
          label: sourceLabel({ docLabel: item.docLabel, photoIndex, kind: 'photo' }),
          fileId: item.fileId ?? null,
        },
      ],
    })
  }
  const alerts = rewriteVagueFindings([...extras, ...synthesis.alerts], items)
  const blocks = synthesis.blocks.map((block) => {
    const sectionItems = items.filter((item) => item.docType === block.docType)
    const flagged = sectionItems.find((item) => item.photoShouldNotBeUploaded)
    const concrete =
      isVagueDiscrepancyText(block.conclusion) && flagged ? specificInvalidUploadText(flagged) : null
    return {
      ...block,
      alerts: rewriteVagueFindings(block.alerts, sectionItems),
      conclusion: concrete || block.conclusion,
    }
  })
  const overall =
    isVagueDiscrepancyText(synthesis.overall_summary) && extras[0]
      ? extras[0].text
      : synthesis.overall_summary
  return { ...synthesis, overall_summary: overall, alerts, blocks }
}

export async function synthesizeVehicleAiReport(input: {
  placa: string
  vehicleLabel: string
  items: VehicleAiSynthesisItem[]
}): Promise<VehicleAiSynthesis> {
  const model = getOpenAiModel()
  const compact = input.items.map((item) => ({
    seccion: item.docLabel,
    tipo: item.docType,
    foto: item.photoIndex ?? null,
    archivo: item.fileName,
    sin_archivo: Boolean(item.missing),
    detalle_encargado: item.detailText || null,
    resumen: item.summary,
    alertas: item.issues,
    no_debio_subirse: Boolean(item.photoShouldNotBeUploaded),
    error: item.error || null,
  }))
  const prompt = [
    'Eres un analista documental de un concesionario en Ecuador.',
    `Vehículo: ${input.vehicleLabel}. Placa: ${input.placa}.`,
    'Cada ítem tiene seccion, tipo y foto (número de foto DENTRO de esa sección: 1, 2, 3…).',
    'TODA conclusión o alerta DEBE citar de dónde sale: sección + número de foto. Ejemplo: Foto 3 · Poder / Contrato.',
    'Si un dato no coincide, nombra la fuente: ficha de inventario KSI, historial de propietarios del expediente, EcuadorAPI (consulta guardada), SRI o ANT. PROHIBIDO escribir "sistema", "sistema 1" o "sistema 2".',
    'Subir una foto a una sección (sobre todo Matrícula vigente) significa que el encargado afirma que ESE documento está válido, al día, sin atraso ni pendientes ni multas.',
    'Si no_debio_subirse=true, copia el motivo concreto de alertas: fecha de vencimiento, monto SRI, citaciones, o por qué la foto no es válida. Cita Foto N.',
    'PROHIBIDO escribir "hay discrepancias", "existen inconsistencias" o frases equivalentes sin nombrar el hecho.',
    'Si sin_archivo=true, kind=missing. Si usas el detalle del encargado, kind=detail. Si el dato es de EcuadorAPI/SRI, kind=api Y además la foto de matrícula con la que se contrastó.',
    'NO inventes fotos. No mezcles tipos.',
    'Responde SOLO JSON:',
    '{',
    '  "overall_summary": "párrafo panorama",',
    '  "alerts": [{ "text": "hallazgo", "sources": [{ "docType": "matricula", "foto": 2, "kind": "photo" }] }],',
    '  "blocks": [{ "docType": "...", "title": "...", "conclusion": "...", "alerts": [{ "text": "...", "sources": [{ "docType": "...", "foto": 1, "kind": "photo" }] }] }]',
    '}',
    'Un bloque por cada tipo. JSON de entrada:',
    JSON.stringify(compact),
  ].join('\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const body = (await res.json()) as {
    error?: { message?: string }
    choices?: { message?: { content?: string } }[]
  }
  if (!res.ok) throw new Error(body.error?.message?.trim() || `OpenAI respondió ${res.status}`)
  const rawText = body.choices?.[0]?.message?.content?.trim()
  if (!rawText) throw new Error('OpenAI no devolvió la síntesis')
  const start = rawText.indexOf('{')
  const end = rawText.lastIndexOf('}')
  const parsed = JSON.parse(start >= 0 && end > start ? rawText.slice(start, end + 1) : rawText) as Record<string, unknown>
  const blocksRaw = Array.isArray(parsed.blocks) ? parsed.blocks : []
  const synthesis: VehicleAiSynthesis = {
    overall_summary:
      typeof parsed.overall_summary === 'string' && parsed.overall_summary.trim()
        ? clarifyAiSystemWording(parsed.overall_summary.trim())
        : 'Sin conclusiones generales.',
    alerts: parseFindings(parsed.alerts, input.items),
    blocks: blocksRaw
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        if (typeof row.docType !== 'string' || typeof row.conclusion !== 'string') return null
        return {
          docType: row.docType,
          title: typeof row.title === 'string' ? row.title : row.docType,
          conclusion: clarifyAiSystemWording(row.conclusion),
          alerts: parseFindings(row.alerts, input.items.filter((i) => i.docType === row.docType)),
        }
      })
      .filter((row): row is VehicleAiSynthesis['blocks'][number] => Boolean(row)),
  }
  return mergeInvalidUploadFindings(synthesis, input.items)
}


