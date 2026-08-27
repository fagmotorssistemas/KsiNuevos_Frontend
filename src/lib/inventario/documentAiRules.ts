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
  const fromExpiry = parseLooseDate(analysis.extracted.expiry ?? null)
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

function uniqueIssues(issues: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const issue of issues) {
    const key = issue.trim()
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
    reasons.push(`la placa leída en la foto (${input.analysis.plate_read}) no coincide con la del inventario`)
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
  }
): DocumentAiAnalysis {
  const cleaned = stripMatriculaNoise(analysis, input.docType)
  const issues = [...cleaned.issues]
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
    matricula_expired: matriculaExpired,
    vigencia_hasta: vigenciaHasta,
    contraste_mismatch: contrasteMismatch,
    photo_should_not_be_uploaded: photoShouldNotBeUploaded || null,
  }
}
