export type EcuadorPlateLookup = {
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  ownerName: string | null
  canton: string | null
  lastPaidYear: number | null
  lastRegistrationDate?: string | null
  registrationExpiry: string | null
  fetchedAt: string | null
}

export type ContrastApiCell = {
  text: string
  vigente: boolean | null
}

export type EcuadorContrastePayload = {
  plate: string
  fetchedAt: string | null
  vehicleLabel: string | null
  lookup?: EcuadorPlateLookup | null
  sri?: EcuadorPendientes | null
  ant?: EcuadorPendientes | null
  amt?: EcuadorPendientes | null
  citations?: EcuadorCitation[]
  citationsPendingCount?: number | null
  citationsPendingTotal?: number | null
  matricula: ContrastApiCell
  revision_tecnica: ContrastApiCell
  prenda_industrial: ContrastApiCell
  informe_ant_siat: ContrastApiCell
  multas: ContrastApiCell
}

export type EcuadorCitationStatus = 'pending' | 'paid' | 'appealed' | 'annulled' | 'agreement'

export type EcuadorCitation = {
  id: string | null
  entity: string | null
  citationNumber: string | null
  issueDate: string | null
  notificationDate: string | null
  paymentDeadline: string | null
  points: number | null
  fine: number | null
  total: number | null
  article: string | null
  infraction: string | null
  status: EcuadorCitationStatus | string
}

export function citationStatusLabel(status: string | null | undefined): string {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente') return 'Pendiente'
  if (key === 'paid' || key === 'pagada') return 'Pagada'
  if (key === 'appealed' || key === 'impugnada') return 'Impugnada'
  if (key === 'annulled' || key === 'anulada') return 'Anulada'
  if (key === 'agreement' || key === 'convenio') return 'Convenio'
  return status || 'Sin estado'
}

export function citationStatusClass(status: string | null | undefined): string {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente') return 'bg-red-600 text-white'
  if (key === 'paid' || key === 'pagada') return 'bg-emerald-600 text-white'
  if (key === 'appealed' || key === 'impugnada') return 'bg-amber-500 text-white'
  if (key === 'annulled' || key === 'anulada') return 'bg-slate-600 text-white'
  if (key === 'agreement' || key === 'convenio') return 'bg-blue-600 text-white'
  return 'bg-slate-500 text-white'
}

export function citationStatusCardClass(status: string | null | undefined): string {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente') return 'border-red-200 bg-red-50'
  if (key === 'paid' || key === 'pagada') return 'border-emerald-200 bg-emerald-50'
  if (key === 'appealed' || key === 'impugnada') return 'border-amber-200 bg-amber-50'
  if (key === 'annulled' || key === 'anulada') return 'border-slate-200 bg-slate-50'
  if (key === 'agreement' || key === 'convenio') return 'border-blue-200 bg-blue-50'
  return 'border-slate-200 bg-slate-50'
}

export function citationAmountClass(status: string | null | undefined): string {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente') return 'text-red-700'
  if (key === 'paid' || key === 'pagada') return 'text-emerald-700'
  if (key === 'appealed' || key === 'impugnada') return 'text-amber-800'
  return 'text-slate-800'
}

export function citationHistorySectionTitle(status: string | null | undefined): string {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente') return 'Historial de citaciones ANT (pendientes)'
  if (key === 'paid' || key === 'pagada') return 'Historial de citaciones ANT (pagadas)'
  if (key === 'appealed' || key === 'impugnada') return 'Historial de citaciones ANT (impugnadas)'
  if (key === 'annulled' || key === 'anulada') return 'Historial de citaciones ANT (anuladas)'
  if (key === 'agreement' || key === 'convenio') return 'Historial de citaciones ANT (convenio)'
  return `Historial de citaciones ANT (${citationStatusLabel(status).toLowerCase()})`
}

export const CITATION_STATUS_ORDER = ['pending', 'appealed', 'agreement', 'paid', 'annulled']

export function groupItemsByCitationStatus<T extends { status?: string | null }>(
  items: T[]
): { status: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = (item.status || 'pending').toLowerCase()
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  const keys = [
    ...CITATION_STATUS_ORDER.filter((k) => map.has(k)),
    ...[...map.keys()].filter((k) => !CITATION_STATUS_ORDER.includes(k)),
  ]
  return keys.map((status) => ({ status, items: map.get(status) ?? [] }))
}

export function citationsFromPayload(payload: EcuadorContrastePayload | null): EcuadorCitation[] {
  if (!payload) return []
  if (payload.citations && payload.citations.length > 0) return payload.citations
  return (payload.ant?.items ?? []).map((item) => ({
    id: item.citation_number ?? null,
    entity: item.beneficiary || payload.ant?.entity || 'ANT',
    citationNumber: item.citation_number ?? null,
    issueDate: item.date || item.issued_at || null,
    notificationDate: null,
    paymentDeadline: item.due_date ?? null,
    points: null,
    fine: item.amount ?? 0,
    total: item.amount ?? 0,
    article: item.article ?? null,
    infraction: item.infraction || item.description || item.type_description || null,
    status: 'pending',
  }))
}

export function antPendientesFromCitations(
  citations: EcuadorCitation[],
  pendingCount?: number | null,
  pendingTotal?: number | null
): EcuadorPendientes {
  const pending = citations.filter((c) => (c.status || '').toLowerCase() === 'pending')
  return {
    source: 'ant',
    entity: 'ANT',
    status: 'ok',
    total: pendingTotal ?? pending.reduce((sum, c) => sum + (c.total ?? c.fine ?? 0), 0),
    items: pending.map((c) => ({
      type: 'CITACION',
      type_description: 'Citación',
      description: c.infraction || c.article || 'Citación ANT',
      amount: c.total ?? c.fine ?? 0,
      citation_number: c.citationNumber,
      beneficiary: c.entity,
      date: c.issueDate,
      due_date: c.paymentDeadline,
      infraction: c.infraction,
      article: c.article,
    })),
  }
}

function ecuadorYear(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric' }).format(
      new Date()
    )
  )
}

function ecuadorTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())
}

export type EcuadorPendientes = {
  source?: string | null
  entity?: string | null
  status?: string | null
  total?: number | null
  matricula?: number | null
  revision?: number | null
  by_type?: Record<string, number> | null
  items?: Array<{
    type?: string | null
    type_description?: string | null
    description?: string | null
    amount?: number | null
    citation_number?: string | null
    beneficiary?: string | null
    year_from?: number | null
    year_to?: number | null
    date?: string | null
    issued_at?: string | null
    due_date?: string | null
    infraction?: string | null
    article?: string | null
    location?: string | null
  }> | null
}

export type ContrasteFineItem = {
  source: string
  citationNumber: string | null
  description: string
  amount: number
  yearFrom: number | null
  yearTo: number | null
}

export type ContrastePendienteLine = {
  source: string
  type: string | null
  description: string
  amount: number
  citationNumber: string | null
  beneficiary: string | null
  yearFrom: number | null
  yearTo: number | null
  date: string | null
  dueDate: string | null
  infraction: string | null
  article: string | null
  location: string | null
  status: string | null
}

export type ContrasteTopicFact = { label: string; value: string }

export type ContrasteTopicDetail = {
  facts: ContrasteTopicFact[]
  lines: ContrastePendienteLine[]
  emptyHint: string
}

function sriRubroKind(blob: string): 'matricula' | 'transferencia' | 'revision' | 'otro' {
  const k = normalizeRubroKey(blob)
  if (k.includes('TRANSFER')) return 'transferencia'
  if (k.includes('REVISION') || k === 'REV' || k.includes(' REV ')) return 'revision'
  if (k.includes('MATRICULA')) return 'matricula'
  return 'otro'
}

function toPendienteLine(
  item: NonNullable<EcuadorPendientes['items']>[number],
  sourceLabel: string,
  entity?: string | null
): ContrastePendienteLine {
  return {
    source: sourceLabel,
    type: item.type_description || item.type || null,
    description: item.description || item.type_description || item.type || 'Pendiente',
    amount: item.amount ?? 0,
    citationNumber: item.citation_number ?? null,
    beneficiary: item.beneficiary || entity || null,
    yearFrom: item.year_from ?? null,
    yearTo: item.year_to ?? null,
    date: item.date || item.issued_at || null,
    dueDate: item.due_date ?? null,
    infraction: item.infraction ?? null,
    article: item.article ?? null,
    location: item.location ?? null,
    status: 'pending',
  }
}

function linesFromBlock(
  block: EcuadorPendientes | null | undefined,
  sourceLabel: string,
  pred?: (item: NonNullable<EcuadorPendientes['items']>[number]) => boolean
): ContrastePendienteLine[] {
  if (!block || block.status !== 'ok') return []
  const out: ContrastePendienteLine[] = []
  const items = block.items ?? []
  if (items.length > 0) {
    for (const item of items) {
      if (pred && !pred(item)) continue
      out.push(toPendienteLine(item, sourceLabel, block.entity))
    }
    return out
  }
  for (const [key, amount] of Object.entries(block.by_type ?? {})) {
    if (typeof amount !== 'number' || amount <= 0) continue
    const item = { type: key, type_description: key, description: key, amount }
    if (pred && !pred(item)) continue
    out.push(toPendienteLine(item, sourceLabel, block.entity))
  }
  if (out.length === 0 && !pred && (block.total ?? 0) > 0) {
    out.push(
      toPendienteLine(
        { description: 'Valor pendiente', amount: block.total },
        sourceLabel,
        block.entity
      )
    )
  }
  return out
}

function sriItemBlob(item: NonNullable<EcuadorPendientes['items']>[number]): string {
  return [item.type, item.type_description, item.description].filter(Boolean).join(' ')
}

export function contrastePendingFines(payload: EcuadorContrastePayload | null): ContrasteFineItem[] {
  return contrasteTopicDetail(payload, 'multas').lines.map((line) => ({
    source: line.beneficiary || line.source,
    citationNumber: line.citationNumber,
    description: line.description,
    amount: line.amount,
    yearFrom: line.yearFrom,
    yearTo: line.yearTo,
  }))
}

export function contrasteTopicDetail(
  payload: EcuadorContrastePayload | null,
  key: string
): ContrasteTopicDetail {
  if (!payload) {
    return { facts: [], lines: [], emptyHint: 'Aún no hay consulta oficial para mostrar el detalle.' }
  }

  const lookup = payload.lookup
  const sri = payload.sri
  const ant = payload.ant
  const amt = payload.amt
  const facts: ContrasteTopicFact[] = []
  let lines: ContrastePendienteLine[] = []
  let emptyHint = 'La fuente oficial no reportó ítems para este rubro.'

  if (key === 'matricula') {
    if (lookup?.ownerName) facts.push({ label: 'Propietario', value: lookup.ownerName })
    if (lookup?.canton) facts.push({ label: 'Cantón', value: lookup.canton })
    if (lookup?.lastPaidYear != null) facts.push({ label: 'Último año pagado', value: String(lookup.lastPaidYear) })
    if (lookup?.lastRegistrationDate) facts.push({ label: 'Última matrícula', value: lookup.lastRegistrationDate })
    if (lookup?.registrationExpiry) facts.push({ label: 'Vigente hasta', value: lookup.registrationExpiry })
    lines = linesFromBlock(sri, 'SRI', (item) => sriRubroKind(sriItemBlob(item)) === 'matricula')
    emptyHint =
      lines.length === 0 && (sriRubros(sri ?? null).matricula ?? 0) <= 0
        ? 'SRI no reporta valor pendiente de matrícula.'
        : 'SRI reporta un saldo de matrícula, pero no envió el desglose de ítems.'
  } else if (key === 'transferencia') {
    lines = linesFromBlock(sri, 'SRI', (item) => sriRubroKind(sriItemBlob(item)) === 'transferencia')
    emptyHint =
      sriRubros(sri ?? null).transferencia <= 0
        ? 'SRI no reporta pendiente de transferencia.'
        : 'Hay un saldo de transferencia, pero SRI no envió el desglose.'
  } else if (key === 'revision_tecnica') {
    lines = [
      ...linesFromBlock(sri, 'SRI', (item) => sriRubroKind(sriItemBlob(item)) === 'revision'),
      ...linesFromBlock(amt, 'AMT', (item) => {
        const k = normalizeRubroKey(sriItemBlob(item) || item.type || '')
        return k.includes('REVISION') || k === 'REV'
      }),
    ]
    emptyHint = 'SRI/AMT no reportan ítems de revisión técnica.'
  } else if (key === 'informe_ant_siat' || key === 'multas' || key === 'ant') {
    if (ant?.status) facts.push({ label: 'Estado ANT', value: ant.status })
    if (ant?.total != null) facts.push({ label: 'Total pendiente ANT', value: `$${ant.total.toFixed(2)}` })
    const citations = citationsFromPayload(payload)
    if (citations.length > 0) {
      lines = citations.map((c) => ({
        source: c.entity || 'ANT',
        type: citationStatusLabel(c.status),
        description: c.infraction || c.article || 'Citación',
        amount: c.total ?? c.fine ?? 0,
        citationNumber: c.citationNumber,
        beneficiary: c.entity,
        yearFrom: null,
        yearTo: null,
        date: c.issueDate,
        dueDate: c.paymentDeadline,
        infraction: c.infraction,
        article: c.article,
        location: null,
        status: c.status,
      }))
      emptyHint = 'No hay citaciones en el historial ANT.'
    } else {
      lines = [
        ...linesFromBlock(ant, 'ANT', (item) => {
          const typeKey = (item.type || '').toUpperCase()
          return !(typeKey === 'REV' || typeKey.includes('REVISION'))
        }),
        ...linesFromBlock(amt, 'AMT', (item) => {
          const typeKey = (item.type || '').toUpperCase()
          return !typeKey || typeKey === 'CITACION' || typeKey.includes('CITACION')
        }),
      ]
      emptyHint =
        lines.length === 0
          ? 'No hay citaciones reportadas por ANT. Vuelve a Consultar para traer pagadas e impugnadas.'
          : 'Sin ítems para mostrar.'
    }
  } else if (key.startsWith('sri-otro-')) {
    const label = key.slice('sri-otro-'.length)
    lines = linesFromBlock(sri, 'SRI', (item) => {
      if (sriRubroKind(sriItemBlob(item)) !== 'otro') return false
      const itemLabel = item.type_description || item.description || item.type || 'Otro'
      return itemLabel === label
    })
    emptyHint = 'SRI no envió el desglose de este rubro.'
  }

  return { facts, lines, emptyHint }
}

export type SriRubros = {
  matricula: number
  transferencia: number
  revision: number
  otros: { label: string; amount: number }[]
  total: number
}

function normalizeRubroKey(value: string): string {
  return value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function classifySriAmount(blob: string, amount: number, acc: SriRubros): boolean {
  const k = normalizeRubroKey(blob)
  if (k.includes('TRANSFER')) {
    acc.transferencia += amount
    return true
  }
  if (k.includes('REVISION') || k === 'REV' || k.includes(' REV ')) {
    acc.revision += amount
    return true
  }
  if (k.includes('MATRICULA')) {
    acc.matricula += amount
    return true
  }
  return false
}

export function sriRubros(sri: EcuadorPendientes | null): SriRubros {
  const acc: SriRubros = { matricula: 0, transferencia: 0, revision: 0, otros: [], total: 0 }
  if (!sri) return acc

  if (sri.items && sri.items.length > 0) {
    for (const item of sri.items) {
      const amount = item.amount ?? 0
      if (amount <= 0) continue
      const blob = [item.type, item.type_description, item.description].filter(Boolean).join(' ')
      if (!classifySriAmount(blob || 'OTRO', amount, acc)) {
        acc.otros.push({
          label: item.type_description || item.description || item.type || 'Otro',
          amount,
        })
      }
    }
  } else if (sri.by_type) {
    for (const [key, amount] of Object.entries(sri.by_type)) {
      if (typeof amount !== 'number' || amount <= 0) continue
      if (!classifySriAmount(key, amount, acc)) {
        acc.otros.push({ label: key, amount })
      }
    }
  } else {
    acc.matricula = sri.matricula ?? 0
    acc.revision = sri.revision ?? 0
  }

  if (acc.matricula === 0 && (sri.matricula ?? 0) > 0) acc.matricula = sri.matricula ?? 0
  if (acc.revision === 0 && (sri.revision ?? 0) > 0) acc.revision = sri.revision ?? 0
  acc.total = sri.total ?? acc.matricula + acc.transferencia + acc.revision + acc.otros.reduce((s, o) => s + o.amount, 0)
  return acc
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`
}

function typeAmount(data: EcuadorPendientes | null, key: string): number {
  if (!data) return 0
  const fromType = data.by_type?.[key]
  if (typeof fromType === 'number') return fromType
  return 0
}

export function inferMatriculaVigente(lookup: {
  lastPaidYear: number | null
  registrationExpiry: string | null
}, sri?: EcuadorPendientes | null): ContrastApiCell {
  let cell: ContrastApiCell
  if (lookup.registrationExpiry) {
    const vigente = lookup.registrationExpiry >= ecuadorTodayYmd()
    cell = {
      vigente,
      text: vigente
        ? `Vigente hasta ${lookup.registrationExpiry}`
        : `Vencida (${lookup.registrationExpiry})`,
    }
  } else if (lookup.lastPaidYear != null) {
    const vigente = lookup.lastPaidYear >= ecuadorYear()
    cell = {
      vigente,
      text: vigente
        ? `Año pagado ${lookup.lastPaidYear}`
        : `Último pago ${lookup.lastPaidYear}`,
    }
  } else {
    cell = { vigente: null, text: 'Sin fecha de matrícula' }
  }

  if (sri?.status === 'unavailable') {
    return { ...cell, text: `${cell.text} · SRI no disponible` }
  }
  if (sri?.status === 'ok') {
    const pending = (sri.matricula ?? typeAmount(sri, 'MATRICULA')) || 0
    if (pending > 0) {
      return {
        vigente: false,
        text: `${cell.text} · SRI pendiente ${usd(pending)}`,
      }
    }
  }
  return cell
}

function inferRevision(sri: EcuadorPendientes | null, amt: EcuadorPendientes | null): ContrastApiCell {
  if (amt?.status === 'unavailable') {
    return { vigente: null, text: 'AMT Quito no disponible (horario o bloqueo)' }
  }
  if (amt?.status === 'ok') {
    const pending = amt.revision ?? typeAmount(amt, 'REV')
    if (pending > 0) {
      return { vigente: false, text: `AMT Quito: revisión pendiente ${usd(pending)}` }
    }
    return { vigente: true, text: 'AMT Quito: sin pendiente de revisión' }
  }
  if (sri?.status === 'unavailable') {
    return { vigente: null, text: 'SRI no disponible para revisión' }
  }
  if (sri?.status === 'ok') {
    const pending = sri.revision ?? typeAmount(sri, 'REVISION')
    if (pending > 0) {
      return { vigente: false, text: `SRI: revisión pendiente ${usd(pending)}` }
    }
    return { vigente: true, text: 'SRI: sin pendiente de revisión' }
  }
  if (sri == null && amt == null) {
    return { vigente: null, text: 'No se pudo consultar revisión (SRI/AMT)' }
  }
  return { vigente: null, text: 'Sin dato de revisión técnica' }
}

function inferAnt(ant: EcuadorPendientes | null): { informe: ContrastApiCell; multas: ContrastApiCell } {
  if (ant == null) {
    const miss: ContrastApiCell = { vigente: null, text: 'No se pudo consultar ANT' }
    return { informe: miss, multas: miss }
  }
  if (ant.status === 'unavailable') {
    const miss: ContrastApiCell = { vigente: null, text: 'ANT no disponible' }
    return { informe: miss, multas: miss }
  }
  if (ant.status === 'not_applicable') {
    const miss: ContrastApiCell = { vigente: null, text: 'ANT: sin registro para esta placa' }
    return { informe: miss, multas: miss }
  }
  if (ant.status === 'ok') {
    const total = ant.total ?? 0
    const count = ant.items?.length ?? 0
    const alDia = total <= 0
    return {
      informe: {
        vigente: alDia,
        text: alDia
          ? 'ANT: sin valores pendientes'
          : `ANT: pendiente ${usd(total)}`,
      },
      multas: {
        vigente: alDia,
        text: alDia
          ? 'Sin citaciones pendientes (ANT)'
          : `${count} citación${count === 1 ? '' : 'es'} pendiente${count === 1 ? '' : 's'} · ${usd(total)}`,
      },
    }
  }
  const miss: ContrastApiCell = { vigente: null, text: 'Sin dato ANT' }
  return { informe: miss, multas: miss }
}

const PRENDA_SIN_FUENTE: ContrastApiCell = {
  text: 'Sin fuente oficial (EcuadorAPI no publica prenda)',
  vigente: null,
}

export function buildContrastePayload(input: {
  lookup: EcuadorPlateLookup
  sri: EcuadorPendientes | null
  ant: EcuadorPendientes | null
  amt: EcuadorPendientes | null
  citations?: EcuadorCitation[]
  citationsPendingCount?: number | null
  citationsPendingTotal?: number | null
}): EcuadorContrastePayload {
  const vehicleLabel =
    [input.lookup.brand, input.lookup.model, input.lookup.year].filter(Boolean).join(' ') || null
  const citations = input.citations
  const ant =
    input.ant ??
    (citations
      ? antPendientesFromCitations(citations, input.citationsPendingCount, input.citationsPendingTotal)
      : null)
  const antCells = inferAnt(ant)
  const pendingCount =
    input.citationsPendingCount ??
    citations?.filter((c) => (c.status || '').toLowerCase() === 'pending').length ??
    0
  const paidCount = citations?.filter((c) => (c.status || '').toLowerCase() === 'paid').length ?? 0
  const appealedCount = citations?.filter((c) => (c.status || '').toLowerCase() === 'appealed').length ?? 0
  if (citations) {
    antCells.multas = {
      vigente: pendingCount <= 0,
      text:
        pendingCount <= 0
          ? `Sin pendientes · ${paidCount} pagada${paidCount === 1 ? '' : 's'}${appealedCount ? ` · ${appealedCount} impugnada${appealedCount === 1 ? '' : 's'}` : ''}`
          : `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} · ${usd(input.citationsPendingTotal ?? ant?.total ?? 0)}`,
    }
  }
  return {
    plate: input.lookup.plate,
    fetchedAt: input.lookup.fetchedAt,
    vehicleLabel,
    lookup: input.lookup,
    sri: input.sri,
    ant,
    amt: input.amt,
    citations: citations ?? [],
    citationsPendingCount: input.citationsPendingCount ?? (citations ? pendingCount : null),
    citationsPendingTotal: input.citationsPendingTotal ?? ant?.total ?? null,
    matricula: inferMatriculaVigente(input.lookup, input.sri),
    revision_tecnica: inferRevision(input.sri, input.amt),
    prenda_industrial: PRENDA_SIN_FUENTE,
    informe_ant_siat: antCells.informe,
    multas: antCells.multas,
  }
}

export type ContrastResultKind = 'idle' | 'ok' | 'warn' | 'missing'
export type ContrastStaffTone = 'ok' | 'warn' | 'missing' | 'na'
export type ContrasteEstadoGeneral = 'alineado' | 'revision_requerida' | 'sin_verificar'

export type ContrasteSummary = {
  coinciden: number
  diferencias: number
  sinVerificar: number
  estadoGeneral: ContrasteEstadoGeneral
}

export function compareContrastRow(
  staff: ContrastStaffTone,
  apiVigente: boolean | null
): { label: string; kind: ContrastResultKind } {
  if (apiVigente == null) return { label: 'Sin dato oficial', kind: 'warn' }
  const staffOk = staff === 'ok'
  const staffNo = staff === 'missing' || staff === 'warn'
  if (staff === 'na') {
    return { label: apiVigente ? 'Solo API · al día' : 'Solo API · no al día', kind: apiVigente ? 'ok' : 'missing' }
  }
  if (staffOk === apiVigente) return { label: 'Coincide', kind: 'ok' }
  if (staffNo && !apiVigente) return { label: 'Coincide', kind: 'ok' }
  return { label: 'Discrepancia', kind: 'missing' }
}

export type MatrixCell = { text: string; kind: ContrastResultKind }

export type ContrastMatrixRow = {
  key: string
  label: string
  encargado: string
  sri: MatrixCell
  ant: MatrixCell
  amt: MatrixCell
  resultado: MatrixCell
}

const DASH: MatrixCell = { text: '—', kind: 'idle' }

function moneyCell(pending: number, staff: ContrastStaffTone, payLabel: string, okText: string): MatrixCell {
  const alDia = pending <= 0
  const compared = compareContrastRow(staff, alDia)
  return {
    kind: compared.kind,
    text: alDia ? okText : `${payLabel} ${usd(pending)}`,
  }
}

function formatLastPago(lookup: EcuadorPlateLookup): string {
  const parts: string[] = []
  if (lookup.lastRegistrationDate) {
    parts.push(`Última matrícula ${lookup.lastRegistrationDate}`)
  }
  if (lookup.lastPaidYear != null) {
    parts.push(`Último pago ${lookup.lastPaidYear}`)
  }
  if (lookup.registrationExpiry) {
    parts.push(`Vigente hasta ${lookup.registrationExpiry}`)
  }
  return parts.join(' · ') || 'Sin fecha de matrícula'
}

export function contrastShowAmt(payload: EcuadorContrastePayload | null): boolean {
  if (!payload) return false
  if (payload.amt) return true
  return /quito/i.test(payload.lookup?.canton || '')
}

function rowResultado(sri: MatrixCell, ant: MatrixCell, amt: MatrixCell): MatrixCell {
  const cells = [sri, ant, amt].filter((c) => c.kind !== 'idle' && c.text !== '—')
  if (cells.length === 0) return { text: 'Sin consultar', kind: 'idle' }
  if (cells.some((c) => c.kind === 'missing')) return { text: 'Revisar', kind: 'missing' }
  if (cells.every((c) => c.kind === 'ok')) return { text: 'Coincide', kind: 'ok' }
  return { text: 'Sin verificar', kind: 'warn' }
}

export function buildContrastMatrix(
  payload: EcuadorContrastePayload | null,
  staff: Record<
    'matricula' | 'revision_tecnica' | 'ant',
    { text: string; status: ContrastStaffTone }
  >
): ContrastMatrixRow[] {
  const lookup = payload?.lookup
  const sri = payload?.sri ?? null
  const ant = payload?.ant ?? null
  const amt = payload?.amt ?? null
  const rubros = sriRubros(sri)
  const plateVigente = lookup ? inferMatriculaVigente(lookup, null).vigente : null
  const antMatText = lookup ? formatLastPago(lookup) : 'Sin consultar'
  const antMatKind = lookup
    ? compareContrastRow(staff.matricula.status, plateVigente).kind
    : ('idle' as ContrastResultKind)

  const sriStatusCell = (kind: ContrastResultKind, text: string): MatrixCell => {
    if (!sri) return { text: 'Sin consultar', kind: 'idle' }
    if (sri.status === 'unavailable') return { text: 'SRI no disponible', kind: 'warn' }
    return { kind, text }
  }

  const antStatus = (okText: string, pendingText: string, staffTone: ContrastStaffTone): MatrixCell => {
    if (!ant) return { text: 'Sin consultar', kind: 'idle' }
    if (ant.status === 'unavailable') return { text: 'ANT no disponible', kind: 'warn' }
    if (ant.status === 'not_applicable') return { text: 'ANT: sin registro', kind: 'warn' }
    if (ant.status === 'ok') {
      const alDia = (ant.total ?? 0) <= 0
      const compared = compareContrastRow(staffTone === 'warn' ? 'na' : staffTone, alDia)
      const count = ant.items?.length ?? 0
      return {
        kind: compared.kind,
        text: alDia ? okText : pendingText.replace('{n}', String(count)).replace('{usd}', usd(ant.total ?? 0)),
      }
    }
    return { text: 'Sin dato ANT', kind: 'warn' }
  }

  const amtRev = (): MatrixCell => {
    if (!amt && !payload) return DASH
    if (!amt && !contrastShowAmt(payload)) return DASH
    if (!amt) return { text: 'No se pudo consultar AMT', kind: 'warn' }
    if (amt.status === 'unavailable') return { text: 'AMT no disponible (horario o bloqueo)', kind: 'warn' }
    if (amt.status === 'not_applicable') return { text: 'AMT no aplica', kind: 'idle' }
    if (amt.status === 'ok') {
      const pending = amt.revision ?? 0
      return moneyCell(pending, staff.revision_tecnica.status, 'Revisión pendiente', 'Sin pendiente de revisión')
    }
    return DASH
  }

  return [
    {
      key: 'matricula',
      label: 'Matrícula vigente',
      encargado: staff.matricula.text,
      sri: !sri
        ? { text: 'Sin consultar', kind: 'idle' }
        : sri.status === 'unavailable'
          ? { text: 'SRI no disponible', kind: 'warn' }
          : moneyCell(rubros.matricula, staff.matricula.status, 'Pagar matrícula', 'Sin pendiente de matrícula'),
      ant: { text: antMatText, kind: antMatKind },
      amt: DASH,
      resultado: DASH,
    },
    {
      key: 'transferencia',
      label: 'Transferencia',
      encargado: '—',
      sri: sriStatusCell(
        rubros.transferencia > 0 ? 'missing' : 'ok',
        rubros.transferencia > 0
          ? `Pagar transferencia ${usd(rubros.transferencia)}`
          : 'Sin pendiente de transferencia'
      ),
      ant: DASH,
      amt: DASH,
      resultado: DASH,
    },
    {
      key: 'revision_tecnica',
      label: 'Revisión técnica',
      encargado: staff.revision_tecnica.text,
      sri: !sri
        ? { text: 'Sin consultar', kind: 'idle' }
        : sri.status === 'unavailable'
          ? { text: 'SRI no disponible', kind: 'warn' }
          : moneyCell(rubros.revision, staff.revision_tecnica.status, 'Revisión pendiente', 'Sin pendiente de revisión'),
      ant: DASH,
      amt: amtRev(),
      resultado: DASH,
    },
    {
      key: 'ant',
      label: 'ANT · citaciones',
      encargado: staff.ant.text,
      sri: DASH,
      ant: antStatus(
        'Sin citaciones pendientes',
        '{n} citación(es) · {usd}',
        staff.ant.status
      ),
      amt: DASH,
      resultado: DASH,
    },
    ...rubros.otros.map((o) => ({
      key: `sri-otro-${o.label}`,
      label: o.label,
      encargado: '—',
      sri: { text: `Pagar ${usd(o.amount)}`, kind: 'missing' as ContrastResultKind },
      ant: DASH,
      amt: DASH,
      resultado: DASH,
    })),
  ].map((row) => ({
    ...row,
    resultado: rowResultado(row.sri, row.ant, row.amt),
  }))
}

export function summarizeMatrix(rows: ContrastMatrixRow[], showAmt: boolean): ContrasteSummary {
  const kinds: ContrastResultKind[] = []
  for (const row of rows) {
    for (const cell of showAmt ? [row.sri, row.ant, row.amt] : [row.sri, row.ant]) {
      if (cell.kind === 'idle' || cell.text === '—') continue
      kinds.push(cell.kind)
    }
  }
  return summarizeContrastKinds(kinds)
}

export function summarizeContrastKinds(kinds: ContrastResultKind[]): ContrasteSummary {
  let coinciden = 0
  let diferencias = 0
  let sinVerificar = 0
  for (const kind of kinds) {
    if (kind === 'ok') coinciden += 1
    else if (kind === 'missing') diferencias += 1
    else sinVerificar += 1
  }
  const estadoGeneral: ContrasteEstadoGeneral =
    diferencias > 0 ? 'revision_requerida' : coinciden > 0 ? 'alineado' : 'sin_verificar'
  return { coinciden, diferencias, sinVerificar, estadoGeneral }
}

export function contrasteEstadoLabel(estado: ContrasteEstadoGeneral): string {
  if (estado === 'revision_requerida') return 'Revisión requerida'
  if (estado === 'alineado') return 'Información alineada'
  return 'Sin verificar'
}

export function contrasteEstadoMessage(estado: ContrasteEstadoGeneral): string {
  if (estado === 'revision_requerida') {
    return 'Se detectó una diferencia en la información consultada. Revise el detalle antes de continuar.'
  }
  if (estado === 'alineado') {
    return 'La información consultada coincide con lo cargado por el encargado.'
  }
  return 'Aún no hay datos oficiales suficientes para completar el contraste.'
}

export function formatContrasteConsultedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return iso
  }
}

export function formatContrasteConsultedPretty(iso: string): string {
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    const time = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${date} · ${time}`
  } catch {
    return iso
  }
}

export function formatContrasteRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return 'hace un momento'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `hace ${days} día${days === 1 ? '' : 's'}`
  const months = Math.round(days / 30)
  if (months < 12) return `hace ${months} mes${months === 1 ? '' : 'es'}`
  const years = Math.round(months / 12)
  return `hace ${years} año${years === 1 ? '' : 's'}`
}
