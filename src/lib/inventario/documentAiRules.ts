import {
  formatContrasteConsultedPretty,
  sriRubros,
  type EcuadorContrastePayload,
} from '@/lib/inventario/ecuadorContraste'
import { docCatalogByType } from '@/lib/inventario/vehicleDocumentCatalog'
import type { DocumentAiAnalysis } from '@/lib/inventario/openaiDocumentVision'
import type { VehicleDocType } from '@/types/vehicleLegal.types'

/** Vigencia de la matrícula física en Ecuador para este flujo. */
export const MATRICULA_VALIDITY_YEARS = 4

export type ContrasteAiContext = {
  consultedAt: string | null
  snapshotText: string
  sriMatriculaPending: number
  sriRevisionPending: number
  sriTotalPending: number
  citationsPendingCount: number
  citationsPendingTotal: number
  matriculaVigente: boolean | null
  lastRegistrationDate: string | null
  lastPaidYear: number | null
  registrationExpiry: string | null
}

/** Datos internos (inventario + contraste guardado). No es una llamada nueva a EcuadorAPI. */
export type VehicleRecordContext = {
  owners: string[]
  place: string | null
  country: string | null
  years: number[]
  snapshotText: string
  ownerSourceLabel: string
  placeSourceLabel: string
  countrySourceLabel: string
  yearsSourceLabel: string
}

function joinSourceLabels(labels: string[]): string {
  const unique = [...new Set(labels.filter(Boolean))]
  if (unique.length === 0) return 'ficha de inventario KSI'
  if (unique.length === 1) return unique[0]
  return `${unique.slice(0, -1).join(', ')} y ${unique[unique.length - 1]}`
}

/** Textos viejos del modelo: "sistema 1/2" → nombre real de la fuente. */
export function clarifyAiSystemWording(text: string): string {
  return text
    .replace(/\bsistema\s*2\b/gi, 'EcuadorAPI (consulta guardada)')
    .replace(/\bsistema\s*1\b/gi, 'ficha de inventario KSI')
    .replace(/\blas del sistema\b/gi, 'las de la ficha de inventario KSI o EcuadorAPI')
    .replace(/\bcon el sistema\b/gi, 'con la ficha de inventario KSI o EcuadorAPI')
    .replace(/\bdel sistema\b/gi, 'de la ficha de inventario KSI / EcuadorAPI')
    .replace(/\bel sistema\b/gi, 'la ficha de inventario KSI o EcuadorAPI')
}

export function buildVehicleRecordContext(input: {
  owners: string[]
  contrasteOwner: string | null
  registrationPlace: string | null
  canton: string | null
  countryOrigin: string | null
  registrationYear: string | null
  lastRegistrationDate: string | null
  lastPaidYear: number | null
  vehicleYear: number | null
  purchaseDate: string | null
}): VehicleRecordContext {
  const expedienteOwners = uniqueNonEmpty(input.owners)
  const apiOwner = firstNonEmpty(input.contrasteOwner)
  const owners = uniqueNonEmpty([...expedienteOwners, apiOwner])
  const inventoryPlace = firstNonEmpty(input.registrationPlace)
  const apiPlace = firstNonEmpty(input.canton)
  const place = firstNonEmpty(inventoryPlace, apiPlace)
  const country = firstNonEmpty(input.countryOrigin)
  const inventoryYears = uniqueYears([
    yearFromUnknown(input.registrationYear),
    input.vehicleYear,
    yearFromUnknown(input.purchaseDate),
  ])
  const apiYears = uniqueYears([
    yearFromUnknown(input.lastRegistrationDate),
    input.lastPaidYear,
  ])
  const years = uniqueYears([...inventoryYears, ...apiYears])

  const ownerSourceLabel = joinSourceLabels([
    expedienteOwners.length ? 'historial de propietarios del expediente' : '',
    apiOwner ? 'EcuadorAPI (consulta guardada)' : '',
  ])
  const placeSourceLabel = joinSourceLabels([
    inventoryPlace ? 'ficha de inventario (lugar de matrícula)' : '',
    apiPlace ? 'EcuadorAPI (cantón)' : '',
  ])
  const countrySourceLabel = 'ficha de inventario (país de origen)'
  const yearsSourceLabel = joinSourceLabels([
    inventoryYears.length ? 'ficha de inventario (año / matrícula / compra)' : '',
    apiYears.length ? 'EcuadorAPI (último pago / última matrícula)' : '',
  ])

  const lines = [
    'Nombra siempre la fuente real. NUNCA digas "sistema", "sistema 1" ni "sistema 2".',
    '--- FUENTE: Ficha de inventario KSI ---',
    country ? `País / origen: ${country}` : 'País / origen: (sin dato)',
    inventoryPlace ? `Lugar de matrícula: ${inventoryPlace}` : 'Lugar de matrícula: (sin dato)',
    inventoryYears.length ? `Años en ficha: ${inventoryYears.join(', ')}` : 'Años en ficha: (sin dato)',
    '--- FUENTE: Historial de propietarios del expediente ---',
    expedienteOwners.length ? `Propietario(s): ${expedienteOwners.join(' | ')}` : 'Propietario(s): (sin dato)',
    '--- FUENTE: EcuadorAPI (última consulta guardada; no se llama otra vez) ---',
    apiOwner ? `Propietario API: ${apiOwner}` : 'Propietario API: (sin dato)',
    apiPlace ? `Cantón API: ${apiPlace}` : 'Cantón API: (sin dato)',
    apiYears.length ? `Años API: ${apiYears.join(', ')}` : 'Años API: (sin dato)',
  ]
  return {
    owners,
    place,
    country,
    years,
    snapshotText: lines.join('\n'),
    ownerSourceLabel,
    placeSourceLabel,
    countrySourceLabel,
    yearsSourceLabel,
  }
}

export function buildContrasteAiContext(
  payload: EcuadorContrastePayload | null,
  consultedAt: string | null
): ContrasteAiContext | null {
  if (!payload) return null
  const lookup = payload.lookup
  const rubros = sriRubros(payload.sri ?? null)
  const pendingCitations = payload.citationsPendingCount ?? 0
  const pendingCitationsTotal = payload.citationsPendingTotal ?? 0
  const lines = [
    consultedAt
      ? `Última consulta EcuadorAPI (guardada, no se volvió a llamar): ${formatContrasteConsultedPretty(consultedAt)}`
      : 'Última consulta EcuadorAPI: fecha desconocida',
    `Placa API: ${payload.plate}`,
    `Vehículo API: ${payload.vehicleLabel ?? '—'}`,
    `Propietario API: ${lookup?.ownerName ?? '—'}`,
    `Último año pagado (API): ${lookup?.lastPaidYear ?? '—'}`,
    `Última matrícula / fecha registro (API): ${lookup?.lastRegistrationDate ?? '—'}`,
    `Vencimiento reportado por API: ${lookup?.registrationExpiry ?? payload.matricula?.text ?? '—'}`,
    `Estado matrícula API: ${payload.matricula?.text ?? '—'} (vigente=${payload.matricula?.vigente ?? 'sin dato'})`,
    `SRI pendientes: total $${rubros.total.toFixed(2)}; matrícula $${rubros.matricula.toFixed(2)}; transferencia $${rubros.transferencia.toFixed(2)}; revisión $${rubros.revision.toFixed(2)}`,
    payload.sri?.items?.length
      ? `Detalle SRI: ${payload.sri.items
          .filter((item) => (item.amount ?? 0) > 0)
          .map((item) => `${item.type_description || item.description || item.type || 'rubro'} $${(item.amount ?? 0).toFixed(2)}`)
          .join('; ')}`
      : null,
    `Citaciones ANT pendientes: ${pendingCitations} (total $${Number(pendingCitationsTotal).toFixed(2)})`,
  ].filter(Boolean) as string[]

  return {
    consultedAt,
    snapshotText: lines.join('\n'),
    sriMatriculaPending: rubros.matricula,
    sriRevisionPending: rubros.revision,
    sriTotalPending: rubros.total,
    citationsPendingCount: pendingCitations,
    citationsPendingTotal: Number(pendingCitationsTotal) || 0,
    matriculaVigente: payload.matricula?.vigente ?? null,
    lastRegistrationDate: lookup?.lastRegistrationDate ?? null,
    lastPaidYear: lookup?.lastPaidYear ?? null,
    registrationExpiry: lookup?.registrationExpiry ?? null,
  }
}

function todayInEcuador(): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addYears(d: Date, years: number): Date {
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate())
}

function formatYmd(d: Date): string {
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function parseLooseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const text = value.trim()
  if (!text || text === '—') return null

  const dmy = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = Number(dmy[3])
    const d = new Date(year, month - 1, day)
    return Number.isNaN(d.getTime()) ? null : startOfDay(d)
  }

  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    return Number.isNaN(d.getTime()) ? null : startOfDay(d)
  }

  if (/^(19|20)\d{2}$/.test(text)) {
    return new Date(Number(text), 0, 1)
  }

  const parsed = Date.parse(text)
  if (!Number.isNaN(parsed)) return startOfDay(new Date(parsed))
  return null
}

function firstDateFromAnalysis(analysis: DocumentAiAnalysis): Date | null {
  const fromExpiry = parseLooseDate(analysis.extracted.issue_date ?? analysis.extracted.expiry ?? null)
  if (fromExpiry) return fromExpiry
  for (const field of analysis.extracted.fields ?? []) {
    const label = field.label.toLowerCase()
    if (
      label.includes('emisi') ||
      label.includes('expedic') ||
      label.includes('fecha') ||
      label.includes('vigenc') ||
      label.includes('venc') ||
      label.includes('matr')
    ) {
      const d = parseLooseDate(field.value)
      if (d) return d
    }
  }
  return null
}

function amountsFromAnalysis(analysis: DocumentAiAnalysis): number[] {
  const texts = [
    ...(analysis.extracted.fields ?? []).map((f) => f.value),
    analysis.summary,
  ]
  const amounts: number[] = []
  for (const text of texts) {
    const matches = text.matchAll(/\$?\s*(\d{1,5}(?:[.,]\d{2})?)/g)
    for (const match of matches) {
      const n = Number(match[1].replace(',', '.'))
      if (Number.isFinite(n) && n > 0) amounts.push(n)
    }
  }
  return amounts
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const key = foldText(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const NAME_STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'da', 'do', 'van', 'von', 'sa', 'cia'])

function nameTokens(value: string): string[] {
  return foldText(value).split(' ').filter((token) => token.length > 1 && !NAME_STOPWORDS.has(token))
}

function namesLikelyMatch(photo: string, expected: string): boolean {
  const a = nameTokens(photo)
  const b = nameTokens(expected)
  if (!a.length || !b.length) return false
  const hits = a.filter((token) =>
    b.some((other) => token === other || (token.length >= 4 && other.length >= 4 && (token.includes(other) || other.includes(token))))
  )
  return hits.length / Math.min(a.length, b.length) >= 0.5
}

function placesLikelyMatch(a: string, b: string): boolean {
  const fa = foldText(a)
  const fb = foldText(b)
  if (!fa || !fb) return false
  if (fa === fb) return true
  return fa.includes(fb) || fb.includes(fa)
}

function normalizeCountryKey(value: string): string {
  const folded = foldText(value)
  if (!folded) return ''
  if (/\b(ecuador|ecu|republica del ecuador)\b/.test(folded) || folded === 'ec') return 'ecuador'
  return folded
}

function yearFromUnknown(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1990 && value <= 2100) return value
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = parseLooseDate(value)
  if (parsed) return parsed.getFullYear()
  const match = value.match(/\b(19|20)\d{2}\b/)
  if (!match) return null
  const year = Number(match[0])
  return year >= 1990 && year <= 2100 ? year : null
}

function uniqueYears(values: Array<number | null | undefined>): number[] {
  return [...new Set(values.filter((year): year is number => typeof year === 'number' && year >= 1990 && year <= 2100))].sort()
}

function fieldValuesByLabel(analysis: DocumentAiAnalysis, matcher: (label: string) => boolean): string[] {
  const out: string[] = []
  for (const field of analysis.extracted.fields ?? []) {
    if (!matcher(foldText(field.label))) continue
    if (field.value.trim()) out.push(field.value.trim())
  }
  return out
}

function photoOwnerTexts(analysis: DocumentAiAnalysis): string[] {
  return uniqueNonEmpty([
    analysis.extracted.owner,
    ...fieldValuesByLabel(analysis, (label) =>
      /propiet|titular|poderdante|comparecient|otorgant|dueno|duenio|vendedor|cedente/.test(label)
    ),
  ])
}

function photoPlaceTexts(analysis: DocumentAiAnalysis): string[] {
  return uniqueNonEmpty([
    analysis.extracted.place,
    ...fieldValuesByLabel(analysis, (label) =>
      /lugar|canton|ciudad|provincia|matriculad|jurisdicc/.test(label)
    ),
  ])
}

function photoCountryTexts(analysis: DocumentAiAnalysis): string[] {
  return uniqueNonEmpty([
    analysis.extracted.country,
    ...fieldValuesByLabel(analysis, (label) => /pais|origen|nacionalidad/.test(label)),
  ])
}

function photoIdentityYears(analysis: DocumentAiAnalysis): number[] {
  const years: number[] = []
  years.push(yearFromUnknown(analysis.extracted.issue_date), yearFromUnknown(analysis.extracted.registration_year))
  for (const field of analysis.extracted.fields ?? []) {
    const label = foldText(field.label)
    const skipContractOnly = /poder|otorg|contrato|firma|notari/.test(label) && !/matricul|registro|emisi|expedic|vigenc|venc/.test(label)
    if (skipContractOnly) continue
    if (!/matricul|registro|emisi|expedic|vigenc|venc|anio|ano/.test(label)) continue
    years.push(yearFromUnknown(field.value))
  }
  return uniqueYears(years)
}

function applyVehicleIdentityChecks(
  analysis: DocumentAiAnalysis,
  record: VehicleRecordContext | null
): {
  analysis: DocumentAiAnalysis
  identityIssues: string[]
} {
  if (!record) {
    return {
      analysis: {
        ...analysis,
        matches_owner: null,
        matches_place: null,
        matches_country: null,
        matches_dates: null,
      },
      identityIssues: [],
    }
  }

  const identityIssues: string[] = []

  const ownersPhoto = photoOwnerTexts(analysis)
  const placesPhoto = photoPlaceTexts(analysis)
  const countriesPhoto = photoCountryTexts(analysis)
  const yearsPhoto = photoIdentityYears(analysis)

  let matches_owner: boolean | null = null
  if (ownersPhoto.length && record.owners.length) {
    matches_owner = ownersPhoto.some((photo) => record.owners.some((expected) => namesLikelyMatch(photo, expected)))
    if (!matches_owner) {
      identityIssues.push(
        `el propietario leído (${ownersPhoto.join('; ')}) no coincide con ${record.ownerSourceLabel} (${record.owners.join('; ')})`
      )
    }
  }

  let matches_place: boolean | null = null
  if (placesPhoto.length && record.place) {
    matches_place = placesPhoto.some((photo) => placesLikelyMatch(photo, record.place as string))
    if (!matches_place) {
      identityIssues.push(
        `el lugar leído (${placesPhoto.join('; ')}) no coincide con ${record.placeSourceLabel} (${record.place})`
      )
    }
  }

  let matches_country: boolean | null = null
  if (countriesPhoto.length && record.country) {
    const expected = normalizeCountryKey(record.country)
    matches_country = countriesPhoto.some((photo) => {
      const key = normalizeCountryKey(photo)
      return Boolean(key) && (key === expected || key.includes(expected) || expected.includes(key))
    })
    if (!matches_country) {
      identityIssues.push(
        `el país leído (${countriesPhoto.join('; ')}) no coincide con ${record.countrySourceLabel} (${record.country})`
      )
    }
  }

  let matches_dates: boolean | null = null
  if (yearsPhoto.length && record.years.length) {
    matches_dates = yearsPhoto.some((year) => record.years.some((expected) => Math.abs(year - expected) <= 1))
    if (!matches_dates) {
      identityIssues.push(
        `las fechas leídas (${yearsPhoto.join(', ')}) no coinciden con ${record.yearsSourceLabel} (${record.years.join(', ')})`
      )
    }
  }

  return {
    analysis: {
      ...analysis,
      matches_owner,
      matches_place,
      matches_country,
      matches_dates,
      extracted: {
        ...analysis.extracted,
        owner: analysis.extracted.owner || ownersPhoto[0] || null,
        place: analysis.extracted.place || placesPhoto[0] || null,
        country: analysis.extracted.country || countriesPhoto[0] || null,
      },
    },
    identityIssues,
  }
}

function uniqueIssues(issues: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const issue of issues) {
    const key = clarifyAiSystemWording(issue.trim())
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function mentionsUnwantedMatriculaCheck(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    t.includes('no es una matricula') ||
    t.includes('no es de una matricula') ||
    t.includes('no corresponde a una matricula') ||
    t.includes('no es matricula') ||
    t.includes('no se trata de una matricula') ||
    t.includes('falta la matricula') ||
    t.includes('no es el documento de matricula') ||
    (t.includes('matricula') && (t.includes('esperado') || t.includes('esperada') || t.includes('tipo de documento')))
  )
}

function stripMatriculaNoise(analysis: DocumentAiAnalysis, docType: string): DocumentAiAnalysis {
  if (docType === 'matricula') return analysis
  const issues = analysis.issues.filter((issue) => !mentionsUnwantedMatriculaCheck(issue))
  let summary = analysis.summary
  const summaryHadMatriculaNag = mentionsUnwantedMatriculaCheck(summary)
  if (summaryHadMatriculaNag) {
    summary = summary
      .replace(/[^.]*no es(?: de)? una matr[ií]cula[^.]*\.?/gi, '')
      .replace(/[^.]*no corresponde a una matr[ií]cula[^.]*\.?/gi, '')
      .replace(/[^.]*no es el documento de matr[ií]cula[^.]*\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
  const forcedWrongType = analysis.quality === 'wrong_document' && (summaryHadMatriculaNag || issues.length < analysis.issues.length)
  return {
    ...analysis,
    summary: summary || analysis.summary,
    issues,
    quality: forcedWrongType ? 'ok' : analysis.quality,
    matricula_expired: null,
    vigencia_hasta: null,
    contraste_mismatch: docType === 'revision_tecnica' || docType === 'informe_ant_siat' ? analysis.contraste_mismatch : null,
    photo_should_not_be_uploaded: analysis.photo_should_not_be_uploaded ?? null,
    matches_expected_type: forcedWrongType ? true : analysis.matches_expected_type,
  }
}

export function isVagueDiscrepancyText(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!t.includes('discrepancia') && !t.includes('inconsistencia') && !t.includes('no coincide con lo esperado')) {
    return false
  }
  return !/(\$\s*\d|vencid|citacion|multa|pendiente|ilegibl|borros|recortad|4 anos|sri|ant)/.test(t)
}

function qualityInvalidReason(analysis: DocumentAiAnalysis): string | null {
  if (analysis.quality === 'unreadable') {
    return 'la foto es ilegible: no se puede leer el documento, así que no demuestra que esté al día'
  }
  if (analysis.quality === 'blurry') {
    return 'la foto está borrosa: no se puede verificar fechas, montos ni estado del documento'
  }
  if (analysis.quality === 'cropped') {
    return 'la foto está recortada y no muestra el documento completo'
  }
  if (analysis.quality === 'wrong_document') {
    const guess = analysis.document_kind_guess?.trim()
    return guess
      ? `el archivo no es el documento de esta sección (parece ${guess})`
      : 'el archivo no es el documento de esta sección'
  }
  return null
}

function invalidUploadReasons(input: {
  docType: string
  analysis: DocumentAiAnalysis
  contraste: ContrasteAiContext | null
  matriculaExpired: boolean | null
  vigenciaHasta: string | null
  sriAmountMismatch: string | null
}): string[] {
  const reasons: string[] = []
  const qualityReason = qualityInvalidReason(input.analysis)
  if (qualityReason) reasons.push(qualityReason)
  if (input.analysis.matches_expected_type === false && input.analysis.quality !== 'wrong_document') {
    const guess = input.analysis.document_kind_guess?.trim()
    reasons.push(
      guess
        ? `el archivo no corresponde a esta sección (parece ${guess})`
        : 'el archivo no corresponde al documento de esta sección'
    )
  }
  if (input.analysis.matches_plate === false && input.analysis.plate_read) {
    reasons.push(`la placa leída en la foto (${input.analysis.plate_read}) no coincide con la placa de la ficha de inventario KSI`)
  }
  if (input.analysis.matches_owner === false) {
    const photo = input.analysis.extracted.owner?.trim()
    reasons.push(
      photo
        ? `el propietario leído (${photo}) no coincide con el historial de propietarios del expediente ni con EcuadorAPI`
        : 'el propietario del documento no coincide con el historial de propietarios del expediente ni con EcuadorAPI'
    )
  }
  if (input.analysis.matches_place === false) {
    const photo = input.analysis.extracted.place?.trim()
    reasons.push(
      photo
        ? `el lugar leído (${photo}) no coincide con la ficha de inventario KSI ni con el cantón de EcuadorAPI`
        : 'el lugar del documento no coincide con la ficha de inventario KSI ni con EcuadorAPI'
    )
  }
  if (input.analysis.matches_country === false) {
    const photo = input.analysis.extracted.country?.trim()
    reasons.push(
      photo
        ? `el país leído (${photo}) no coincide con el país de origen de la ficha de inventario KSI`
        : 'el país del documento no coincide con la ficha de inventario KSI'
    )
  }
  if (input.analysis.matches_dates === false) {
    reasons.push(
      'las fechas del documento no coinciden con los años de la ficha de inventario KSI ni con EcuadorAPI (matrícula / último pago)'
    )
  }

  const contraste = input.contraste
  if (input.docType === 'matricula') {
    if (input.matriculaExpired) {
      reasons.push(
        input.vigenciaHasta
          ? `la matrícula está vencida: solo vale ${MATRICULA_VALIDITY_YEARS} años y esa vigencia terminó el ${input.vigenciaHasta}`
          : `la matrícula está vencida (vigencia de ${MATRICULA_VALIDITY_YEARS} años ya cumplida)`
      )
    }
    if (contraste?.matriculaVigente === false) {
      reasons.push(
        contraste.registrationExpiry
          ? `EcuadorAPI reporta la matrícula no vigente (vencimiento ${contraste.registrationExpiry})`
          : 'EcuadorAPI reporta la matrícula no vigente'
      )
    }
    if (contraste && contraste.sriMatriculaPending > 0.009) {
      reasons.push(
        `SRI tiene matrícula pendiente de $${contraste.sriMatriculaPending.toFixed(2)}; esta sección solo admite matrícula pagada y al día`
      )
    }
    if (contraste && contraste.sriTotalPending > (contraste.sriMatriculaPending || 0) + 0.009) {
      reasons.push(`SRI reporta otros valores pendientes (total $${contraste.sriTotalPending.toFixed(2)})`)
    }
    if (contraste && contraste.citationsPendingCount > 0) {
      reasons.push(
        `hay ${contraste.citationsPendingCount} citación(es) ANT pendiente(s)` +
          (contraste.citationsPendingTotal > 0.009 ? ` por $${contraste.citationsPendingTotal.toFixed(2)}` : '') +
          '; esta sección no admite vehículo con multas'
      )
    }
    if (input.sriAmountMismatch) reasons.push(input.sriAmountMismatch)
  }

  if (input.docType === 'revision_tecnica' && contraste && contraste.sriRevisionPending > 0.009) {
    reasons.push(
      `SRI tiene revisión técnica pendiente de $${contraste.sriRevisionPending.toFixed(2)}; esta sección solo admite RTV al día`
    )
  }

  if (input.docType === 'informe_ant_siat' && contraste && contraste.citationsPendingCount > 0) {
    reasons.push(
      `el informe ANT no está al día: ${contraste.citationsPendingCount} citación(es) pendiente(s)` +
        (contraste.citationsPendingTotal > 0.009 ? ` por $${contraste.citationsPendingTotal.toFixed(2)}` : '')
    )
  }

  if (reasons.length === 0) {
    for (const issue of input.analysis.issues) {
      const trimmed = issue.trim()
      if (!trimmed || isVagueDiscrepancyText(trimmed)) continue
      if (trimmed.toLowerCase().includes('no debió')) continue
      reasons.push(trimmed)
    }
  }

  return uniqueIssues(reasons)
}

function formatInvalidUploadAlert(sectionLabel: string, reasons: string[]): string {
  const why = `Esta sección solo se usa cuando el documento está al día y la foto es válida`
  if (reasons.length === 1) {
    return `Esta fotografía no debió haberse subido a «${sectionLabel}». ${why}. Lo encontrado: ${reasons[0]}.`
  }
  const listed = reasons.map((reason, index) => `${index + 1}) ${reason}`).join(' ')
  return `Esta fotografía no debió haberse subido a «${sectionLabel}». ${why}. Lo encontrado: ${listed}`
}

export function applyDocumentAiBusinessRules(
  analysis: DocumentAiAnalysis,
  input: {
    docType: string
    contraste: ContrasteAiContext | null
    vehicleRecord?: VehicleRecordContext | null
  }
): DocumentAiAnalysis {
  const stripped = stripMatriculaNoise(analysis, input.docType)
  const { analysis: cleaned, identityIssues } = applyVehicleIdentityChecks(stripped, input.vehicleRecord ?? null)
  const issues = [...cleaned.issues, ...identityIssues]
  let summary = cleaned.summary
  let matriculaExpired = input.docType === 'matricula' ? cleaned.matricula_expired ?? null : null
  let vigenciaHasta = input.docType === 'matricula' ? cleaned.vigencia_hasta ?? null : null
  let contrasteMismatch = cleaned.contraste_mismatch ?? null
  let sriAmountMismatch: string | null = null

  const issued =
    firstDateFromAnalysis(cleaned) ||
    parseLooseDate(input.contraste?.lastRegistrationDate) ||
    (input.contraste?.lastPaidYear != null ? new Date(input.contraste.lastPaidYear, 0, 1) : null)

  if (input.docType === 'matricula') {
    if (!input.contraste) {
      issues.push('No hay consulta EcuadorAPI guardada para esta placa. El análisis no pudo contrastar con el reporte oficial.')
    }
    if (issued) {
      const hasta = addYears(issued, MATRICULA_VALIDITY_YEARS)
      vigenciaHasta = formatYmd(hasta)
      const expired = todayInEcuador() > hasta
      matriculaExpired = expired
      const hasVigenciaField = (cleaned.extracted.fields ?? []).some((f) => f.label === 'Vigencia (4 años)')
      cleaned.extracted = {
        ...cleaned.extracted,
        expiry: cleaned.extracted.expiry || vigenciaHasta,
        fields: hasVigenciaField
          ? cleaned.extracted.fields
          : [...(cleaned.extracted.fields ?? []), { label: 'Vigencia (4 años)', value: `Hasta ${vigenciaHasta}` }],
      }
      if (expired) {
        const alert = `Matrícula vencida: vigencia de ${MATRICULA_VALIDITY_YEARS} años (hasta ${vigenciaHasta}).`
        issues.unshift(alert)
        if (!summary.toLowerCase().includes('vencid')) {
          summary = `${alert} ${summary}`
        }
      }
    } else {
      issues.push(
        `No se pudo leer la fecha de emisión. Recuerda: la matrícula solo vale ${MATRICULA_VALIDITY_YEARS} años; si se pasa, está expirada.`
      )
    }
  }

  if (input.contraste && (input.docType === 'matricula' || input.docType === 'revision_tecnica')) {
    const sriPending =
      input.docType === 'revision_tecnica'
        ? input.contraste.sriRevisionPending
        : input.contraste.sriMatriculaPending
    const pendingLabel = input.docType === 'revision_tecnica' ? 'revisión' : 'matrícula'
    if (sriPending > 0.009) {
      const photoAmounts = amountsFromAnalysis(cleaned)
      const matchesAmount = photoAmounts.some((n) => Math.abs(n - sriPending) < 0.51)
      if (!matchesAmount) {
        contrasteMismatch = true
        sriAmountMismatch = `en la foto no aparece el valor SRI de ${pendingLabel} pendiente ($${sriPending.toFixed(2)})`
        const alert = `La API (SRI) tiene ${pendingLabel} pendiente de $${sriPending.toFixed(2)} y ese monto no se lee en este documento.`
        issues.unshift(alert)
        if (!summary.toLowerCase().includes('pendiente')) {
          summary = `${alert} ${summary}`
        }
      }
    }
    if (input.contraste.sriTotalPending > sriPending + 0.009 && input.docType === 'matricula') {
      const extra = input.contraste.sriTotalPending - sriPending
      if (extra > 0.009) {
        issues.push(
          `SRI también reporta otros pendientes (total $${input.contraste.sriTotalPending.toFixed(2)}). Verifica que el documento no omita esos valores.`
        )
      }
    }
  }

  const reasons = invalidUploadReasons({
    docType: input.docType,
    analysis: cleaned,
    contraste: input.contraste,
    matriculaExpired,
    vigenciaHasta,
    sriAmountMismatch,
  })
  const photoShouldNotBeUploaded = reasons.length > 0
  if (photoShouldNotBeUploaded) {
    const sectionLabel = docCatalogByType(input.docType as VehicleDocType)?.label ?? input.docType
    const alert = formatInvalidUploadAlert(sectionLabel, reasons)
    issues.unshift(alert)
    if (!summary.toLowerCase().includes('no debió')) {
      summary = `${alert} ${summary}`
    }
  }

  return {
    ...cleaned,
    summary,
    issues: uniqueIssues(issues),
    matches_owner: cleaned.matches_owner ?? null,
    matches_place: cleaned.matches_place ?? null,
    matches_country: cleaned.matches_country ?? null,
    matches_dates: cleaned.matches_dates ?? null,
    matricula_expired: matriculaExpired,
    vigencia_hasta: vigenciaHasta,
    contraste_mismatch: contrasteMismatch,
    photo_should_not_be_uploaded: photoShouldNotBeUploaded || null,
  }
}
