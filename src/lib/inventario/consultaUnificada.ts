import type { SupabaseClient } from '@supabase/supabase-js'
import { EcuadorApiError, fetchEcuadorContraste, fetchEcuadorPath, isEcuadorApiConfigured, normalizeConsultaPlaca } from '@/lib/inventario/ecuador-api'
import {
  extractIdentityHints,
  fetchJuiciosRaw,
  isConsultasEcConfigured,
  normalizeCedulaOrRuc,
} from '@/lib/inventario/consultas-ec'
import { resolveOwnerIdentityForContraste } from '@/services/vehicleLegal.service'
import type { EcuadorContrastePayload } from '@/lib/inventario/ecuadorContraste'
import type { Database } from '@/types/supabase'
import { buildReadableReport } from '@/lib/inventario/consultaUnificada.report'
import type {
  UnifiedConsultaResult,
  UnifiedFact,
  UnifiedKsiMatch,
  UnifiedQueryKind,
  UnifiedRow,
  UnifiedSection,
} from '@/lib/inventario/consultaUnificada.types'

export type {
  UnifiedConsultaResult,
  UnifiedFact,
  UnifiedKsiMatch,
  UnifiedQueryKind,
  UnifiedRow,
  UnifiedSection,
}

const LABEL_KEYS: Record<string, string> = {
  nombre: 'Nombre',
  nombreCompleto: 'Nombre',
  nombre_completo: 'Nombre',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  razonSocial: 'Razón social',
  razon_social: 'Razón social',
  cedula: 'Cédula',
  ruc: 'RUC',
  identificacion: 'Identificación',
  fechaNacimiento: 'Fecha de nacimiento',
  fecha_nacimiento: 'Fecha de nacimiento',
  sexo: 'Sexo',
  genero: 'Género',
  estadoCivil: 'Estado civil',
  estado_civil: 'Estado civil',
  lugarNacimiento: 'Lugar de nacimiento',
  lugar_nacimiento: 'Lugar de nacimiento',
  nacionalidad: 'Nacionalidad',
  marca: 'Marca',
  modelo: 'Modelo',
  anio: 'Año',
  year: 'Año',
  color: 'Color',
  tipo: 'Tipo',
  clase: 'Clase',
  placa: 'Placa',
  propietario: 'Propietario',
  titular: 'Titular',
  canton: 'Cantón',
  estado: 'Estado',
  tipoContribuyente: 'Tipo de contribuyente',
  regimen: 'Régimen',
  actividadEconomica: 'Actividad económica',
  actividad_economica: 'Actividad económica',
  representanteLegal: 'Representante legal',
  direccion: 'Dirección',
  domicilio: 'Domicilio',
  causa: 'Causa',
  accion: 'Acción',
  rol: 'Rol',
  fecha: 'Fecha',
  infraccion: 'Infracción',
  valor: 'Valor',
  total: 'Total',
  articulo: 'Artículo',
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && Array.isArray(value) === false) {
    return value as Record<string, unknown>
  }
  return null
}

function prettyLabel(key: string): string {
  return LABEL_KEYS[key] || key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function stringifyValue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return null
}

function normToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function factsFromObject(value: unknown, max = 400): UnifiedFact[] {
  const facts: UnifiedFact[] = []
  const skip = new Set(['certificado', 'informe', 'fuente', 'secciones'])

  function walk(node: unknown, prefix: string, depth: number) {
    if (facts.length >= max || node == null || depth > 8) return
    if (Array.isArray(node)) {
      if (node.every((item) => stringifyValue(item) || item == null)) {
        const joined = node.map(stringifyValue).filter(Boolean).join(', ')
        if (joined) facts.push({ label: prefix || 'Lista', value: joined })
      }
      return
    }
    const rec = asRecord(node)
    if (!rec) {
      const simple = stringifyValue(node)
      if (simple && prefix) facts.push({ label: prefix, value: simple })
      return
    }
    for (const [key, nested] of Object.entries(rec)) {
      if (skip.has(key) && asRecord(nested)) continue
      const label = prefix ? `${prefix} · ${prettyLabel(key)}` : prettyLabel(key)
      const simple = stringifyValue(nested)
      if (simple) {
        facts.push({ label, value: simple })
        continue
      }
      walk(nested, label, depth + 1)
    }
  }

  walk(value, '', 0)
  return facts
}

function rowsFromRecords(items: unknown[], fallbackTitle: string): UnifiedRow[] {
  return items.map((item, index) => {
    const rec = asRecord(item)
    const title =
      (rec &&
        (stringifyValue(rec.causa) ||
          stringifyValue(rec.numeroCausa) ||
          stringifyValue(rec.numero_causa) ||
          stringifyValue(rec.nroCausa) ||
          stringifyValue(rec.citation_number) ||
          stringifyValue(rec.infraccion) ||
          stringifyValue(rec.infraction))) ||
      `${fallbackTitle} ${index + 1}`
    const subtitle =
      stringifyValue(rec?.estado) ||
      stringifyValue(rec?.status) ||
      stringifyValue(rec?.resolucion) ||
      stringifyValue(rec?.resolucion_texto) ||
      null
    return {
      title,
      subtitle,
      facts: factsFromObject(item),
      rawJson: item == null ? null : JSON.stringify(item, null, 2),
    }
  })
}

function collectRecordArrays(value: unknown): unknown[] {
  if (Array.isArray(value) && value.some((item) => asRecord(item))) return value
  const rec = asRecord(value)
  if (!rec) return []
  const fromRoles: unknown[] = []
  for (const [key, nested] of Object.entries(rec)) {
    const k = key.toLowerCase()
    if ((k.includes('actor') || k.includes('demand')) && Array.isArray(nested) && nested.some((item) => asRecord(item))) {
      fromRoles.push(
        ...nested.map((item) => {
          const itemRec = asRecord(item)
          if (!itemRec) return item
          const hasRol = stringifyValue(itemRec.rol) || stringifyValue(itemRec.calidad) || stringifyValue(itemRec.parte)
          if (hasRol) return item
          return { ...itemRec, rol: k.includes('demand') ? 'Demandado' : 'Actor' }
        })
      )
    }
  }
  if (fromRoles.length > 0) return fromRoles
  for (const key of ['procesos', 'juicios', 'causas', 'actuaciones', 'resoluciones', 'citations', 'items', 'data', 'results', 'multas']) {
    const nested = rec[key]
    if (Array.isArray(nested) && nested.some((item) => asRecord(item))) return nested
  }
  return []
}

function dumpConsultasBody(data: unknown, origin = 'Consultas.ec'): { facts: UnifiedFact[]; rows: UnifiedRow[] } {
  const rows = rowsFromRecords(collectRecordArrays(data), 'Registro')
  let facts = factsFromObject(data)
  if (rows.length > 0) {
    const rowTitles = new Set(rows.map((row) => normToken(row.title)))
    facts = facts.filter((fact) => !rowTitles.has(normToken(fact.value)))
  }
  return {
    facts: facts.map((fact) => ({ ...fact, origin })),
    rows,
  }
}

function mergeFacts(primary: UnifiedFact[], extra: UnifiedFact[], extraOrigin: string): UnifiedFact[] {
  const out = primary.map((fact) => ({ ...fact }))
  for (const fact of extra) {
    const same = out.find(
      (row) => normToken(row.label) === normToken(fact.label) && normToken(row.value) === normToken(fact.value)
    )
    if (same) {
      if (!same.origin?.includes(extraOrigin)) {
        same.origin = same.origin ? `${same.origin} y ${extraOrigin}` : `EcuadorAPI y ${extraOrigin}`
      }
      continue
    }
    const sameLabel = out.find((row) => normToken(row.label) === normToken(fact.label))
    if (sameLabel && normToken(sameLabel.value) !== normToken(fact.value)) {
      out.push({ ...fact, origin: extraOrigin, label: `${fact.label} (${extraOrigin})` })
      continue
    }
    if (sameLabel) continue
    out.push({ ...fact, origin: extraOrigin })
  }
  return out
}

function mergeRows(primary: UnifiedRow[], extra: UnifiedRow[], extraOrigin: string): UnifiedRow[] {
  const out = [...primary]
  for (const row of extra) {
    const match = out.find((item) => normToken(item.title) === normToken(row.title) && normToken(item.title).length > 4)
    if (match) {
      match.facts = mergeFacts(match.facts, row.facts, extraOrigin)
      if (!match.rawJson && row.rawJson) match.rawJson = row.rawJson
      continue
    }
    out.push({ ...row, facts: row.facts.map((fact) => ({ ...fact, origin: extraOrigin })) })
  }
  return out
}

function mergeOverlappingSections(sections: UnifiedSection[]): UnifiedSection[] {
  const used = new Set<string>()
  const out: UnifiedSection[] = []

  for (const section of sections) {
    if (used.has(section.id)) continue
    const pairId =
      section.id === 'ecuador-vehiculo'
        ? 'consultas-vehiculo'
        : section.id.startsWith('ecuador-vehiculo-')
          ? section.id.replace('ecuador-vehiculo-', 'consultas-vehiculo-')
          : section.id === 'consultas-multas-placa'
            ? null
            : section.id.includes('procesos_judiciales')
              ? 'juicios'
              : null
    if (section.id.startsWith('consultas-vehiculo') || section.id === 'consultas-multas-placa') {
      const hasPrimary = sections.some(
        (item) =>
          (section.id === 'consultas-vehiculo' && item.id === 'ecuador-vehiculo') ||
          (section.id.startsWith('consultas-vehiculo-') &&
            item.id === `ecuador-vehiculo-${section.id.replace('consultas-vehiculo-', '')}`)
      )
      if (hasPrimary) {
        used.add(section.id)
        continue
      }
    }
    if (section.id.includes('procesos_judiciales')) {
      used.add(section.id)
      continue
    }

    const pair = pairId ? sections.find((item) => item.id === pairId) : null
    if (pair && pair.id !== section.id) {
      used.add(section.id)
      used.add(pair.id)
      const uniqueFacts = mergeFacts(section.facts, pair.facts, pair.source)
      const uniqueRows = mergeRows(section.rows, pair.rows, pair.source)
      out.push({
        ...section,
        source: uniqueFacts.some((fact) => fact.origin?.includes('Consultas'))
          ? 'EcuadorAPI + Consultas.ec (sin repetir coincidencias)'
          : section.source,
        facts: uniqueFacts,
        rows: uniqueRows,
      })
      continue
    }
    used.add(section.id)
    out.push(section)
  }

  const multasConsultas = sections.find((item) => item.id === 'consultas-multas-placa')
  const vehicle = out.find((item) => item.id === 'ecuador-vehiculo')
  if (multasConsultas && vehicle) {
    vehicle.rows = mergeRows(vehicle.rows, multasConsultas.rows, 'Consultas.ec')
    vehicle.facts = mergeFacts(vehicle.facts, multasConsultas.facts.filter((fact) => /multa|citacion|pendiente/i.test(fact.label)), 'Consultas.ec')
  }

  return out.filter((section) => section.id !== 'consultas-multas-placa')
}

async function ecuadorPathSafe(path: string): Promise<unknown | null> {
  try {
    return await fetchEcuadorPath(path)
  } catch {
    return null
  }
}

function sectionFromDump(input: {
  id: string
  title: string
  source: string
  data: unknown
  emptySummary: string
}): UnifiedSection {
  if (input.data == null) {
    return {
      id: input.id,
      title: input.title,
      source: input.source,
      status: 'empty',
      error: null,
      summary: input.emptySummary,
      facts: [],
      rows: [],
    }
  }
  const dumped = dumpConsultasBody(input.data, input.source)
  return {
    id: input.id,
    title: input.title,
    source: input.source,
    status: dumped.facts.length || dumped.rows.length ? 'ok' : 'empty',
    error: null,
    summary: dumped.rows.length ? `${dumped.rows.length} registro(s)` : null,
    facts: dumped.facts,
    rows: dumped.rows,
  }
}

function ownerIdFromEcuadorPlate(raw: unknown): string | null {
  const rec = asRecord(raw)
  const owner = asRecord(rec?.owner)
  if (!owner) return null
  const id =
    stringifyValue(owner.id) ||
    stringifyValue(owner.cedula) ||
    stringifyValue(owner.ruc) ||
    stringifyValue(owner.identificacion)
  return normalizeCedulaOrRuc(id)
}

function parseCedulaNameHits(body: unknown): { id: string; name: string }[] {
  const rows = collectRecordArrays(body)
  const list = rows.length ? rows : asRecord(body) ? [body] : []
  const out: { id: string; name: string }[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const rec = asRecord(item)
    const id = normalizeCedulaOrRuc(
      stringifyValue(rec?.id) || stringifyValue(rec?.cedula) || stringifyValue(rec?.identificacion)
    )
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: stringifyValue(rec?.full_name) || stringifyValue(rec?.nombre) || stringifyValue(rec?.nombreCompleto) || '',
    })
  }
  return out
}

async function enrichVehicleSection(placa: string, section: UnifiedSection): Promise<UnifiedSection> {
  const extras = await Promise.all(
    [
      `/placas/${encodeURIComponent(placa)}/propietario`,
      `/placas/${encodeURIComponent(placa)}/matriculacion`,
      `/placas/${encodeURIComponent(placa)}/pagos`,
      `/placas/${encodeURIComponent(placa)}/duenos`,
    ].map((path) => ecuadorPathSafe(path))
  )
  for (const data of extras) {
    if (data == null) continue
    const dumped = dumpConsultasBody(data, 'EcuadorAPI')
    section.facts = mergeFacts(section.facts, dumped.facts, 'EcuadorAPI')
    section.rows = mergeRows(section.rows, dumped.rows, 'EcuadorAPI')
  }
  return section
}

export function classifyConsultaQuery(raw: string): { kind: UnifiedQueryKind; value: string } | { error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { error: 'Escribe una placa, cédula, RUC o nombre.' }
  const digits = trimmed.replace(/\D/g, '')
  const hasLetters = /[A-Za-zÁÉÍÓÚÜÑáéíóúñ]/.test(trimmed)
  const hasSpace = /\s/.test(trimmed)
  if (!hasLetters && digits.length === 10) return { kind: 'cedula', value: digits }
  if (!hasLetters && digits.length === 13) return { kind: 'ruc', value: digits }
  if (hasLetters && hasSpace) {
    const nombre = trimmed.replace(/\s+/g, ' ')
    if (nombre.length < 5) return { error: 'El nombre es demasiado corto.' }
    return { kind: 'nombre', value: nombre }
  }
  const placa = normalizeConsultaPlaca(trimmed)
  if (placa) return { kind: 'placa', value: placa }
  if (hasLetters && trimmed.length >= 5) return { kind: 'nombre', value: trimmed }
  if (!hasLetters && digits.length > 0) {
    return { error: 'La cédula debe tener 10 dígitos y el RUC 13. Si es placa, incluye letras.' }
  }
  return { error: 'No se reconoció el dato. Usa placa, cédula (10 dígitos), RUC (13 dígitos) o nombre completo.' }
}

function sectionFromConsultas(input: {
  id: string
  title: string
  result: { data: unknown; error: string | null }
  emptySummary: string
}): UnifiedSection {
  if (input.result.error) {
    return {
      id: input.id,
      title: input.title,
      source: 'Consultas.ec',
      status: 'error',
      error: input.result.error,
      summary: null,
      facts: [],
      rows: [],
    }
  }
  if (input.result.data == null) {
    return {
      id: input.id,
      title: input.title,
      source: 'Consultas.ec',
      status: 'empty',
      error: null,
      summary: input.emptySummary,
      facts: [],
      rows: [],
    }
  }
  const dumped = dumpConsultasBody(input.result.data)
  return {
    id: input.id,
    title: input.title,
    source: 'Consultas.ec',
    status: dumped.facts.length || dumped.rows.length ? 'ok' : 'empty',
    error: null,
    summary: dumped.rows.length ? `${dumped.rows.length} registro(s)` : null,
    facts: dumped.facts,
    rows: dumped.rows,
  }
}

function skipped(id: string, title: string, source: string, reason: string): UnifiedSection {
  return {
    id,
    title,
    source,
    status: 'skipped',
    error: null,
    summary: reason,
    facts: [],
    rows: [],
  }
}

function ecuadorSection(payload: EcuadorContrastePayload, plateRaw?: unknown): UnifiedSection {
  const dumped = plateRaw ? dumpConsultasBody(plateRaw, 'EcuadorAPI') : { facts: [] as UnifiedFact[], rows: [] as UnifiedRow[] }
  const facts: UnifiedFact[] = dumped.facts.length
    ? dumped.facts
    : [
        payload.lookup?.plate ? { label: 'Placa', value: payload.lookup.plate } : null,
        payload.lookup?.brand ? { label: 'Marca', value: payload.lookup.brand } : null,
        payload.lookup?.model ? { label: 'Modelo', value: payload.lookup.model } : null,
        payload.lookup?.year ? { label: 'Año', value: String(payload.lookup.year) } : null,
        payload.lookup?.ownerName ? { label: 'Propietario', value: payload.lookup.ownerName } : null,
        payload.lookup?.canton ? { label: 'Cantón', value: payload.lookup.canton } : null,
        payload.lookup?.lastPaidYear ? { label: 'Último año pagado', value: String(payload.lookup.lastPaidYear) } : null,
        payload.lookup?.lastRegistrationDate ? { label: 'Última matrícula', value: payload.lookup.lastRegistrationDate } : null,
        payload.lookup?.registrationExpiry ? { label: 'Vigencia matrícula', value: payload.lookup.registrationExpiry } : null,
      ].filter((row): row is UnifiedFact => Boolean(row))

  if (payload.sri?.total != null) facts.push({ label: 'SRI pendiente', value: `$${payload.sri.total}`, origin: 'EcuadorAPI' })
  if (payload.citationsPendingTotal != null) {
    facts.push({ label: 'Multas ANT (vehículo)', value: `$${payload.citationsPendingTotal}`, origin: 'EcuadorAPI' })
  }
  if (payload.citationsPendingCount != null) {
    facts.push({ label: 'Citaciones pendientes', value: String(payload.citationsPendingCount), origin: 'EcuadorAPI' })
  }
  if (payload.amt?.total != null) facts.push({ label: 'AMT Quito pendiente', value: `$${payload.amt.total}`, origin: 'EcuadorAPI' })

  const sriRows = rowsFromRecords(payload.sri?.items ?? [], 'Rubro SRI')
  const amtRows = rowsFromRecords(payload.amt?.items ?? [], 'Rubro AMT')
  const citationRows = (payload.citations ?? []).map((citation) => ({
    title: citation.infraction || citation.citationNumber || 'Citación ANT',
    subtitle: citation.status,
    facts: [
      citation.entity ? { label: 'Entidad', value: citation.entity } : null,
      citation.citationNumber ? { label: 'N° citación', value: citation.citationNumber } : null,
      citation.issueDate ? { label: 'Fecha', value: citation.issueDate } : null,
      citation.notificationDate ? { label: 'Notificación', value: citation.notificationDate } : null,
      citation.total != null ? { label: 'Valor', value: `$${citation.total}` } : null,
      citation.fine != null ? { label: 'Multa', value: `$${citation.fine}` } : null,
      citation.points != null ? { label: 'Puntos', value: String(citation.points) } : null,
      citation.paymentDeadline ? { label: 'Límite de pago', value: citation.paymentDeadline } : null,
      citation.article ? { label: 'Artículo', value: citation.article } : null,
      (citation.plate || payload.lookup?.plate || payload.plate)
        ? { label: 'Placa', value: citation.plate || payload.lookup?.plate || payload.plate }
        : null,
    ].filter((row): row is UnifiedFact => Boolean(row)),
    rawJson: JSON.stringify(citation, null, 2),
  }))

  return {
    id: 'ecuador-vehiculo',
    title: 'Vehículo y deudas',
    source: 'EcuadorAPI',
    status: 'ok',
    error: null,
    summary: payload.lookup?.ownerName ? `Propietario: ${payload.lookup.ownerName}` : null,
    facts,
    rows: [...dumped.rows, ...sriRows, ...amtRows, ...citationRows],
  }
}

function juiciosSection(raw: Awaited<ReturnType<typeof fetchJuiciosRaw>>): UnifiedSection {
  if (raw.error) {
    return {
      id: 'juicios',
      title: 'Procesos judiciales',
      source: 'Consultas.ec · Función Judicial',
      status: 'error',
      error: raw.error,
      summary: null,
      facts: [],
      rows: [],
    }
  }
  const procesos = raw.procesos.length ? raw.procesos : collectRecordArrays(raw.body)
  const rows = rowsFromRecords(procesos, 'Proceso')
  const headerFacts = factsFromObject(asRecord(raw.body) ? { ...asRecord(raw.body), procesos: undefined, juicios: undefined, causas: undefined } : { titular: raw.titular, cedula: raw.cedula })
  return {
    id: 'juicios',
    title: 'Procesos judiciales',
    source: 'Consultas.ec · Función Judicial',
    status: rows.length ? 'ok' : 'empty',
    error: null,
    summary: rows.length
      ? `${rows.length} proceso${rows.length === 1 ? '' : 's'} · se muestra cada campo que envió eSATJE (causa, acción, rol, estado, resolución, etc.)`
      : 'Sin procesos en Función Judicial',
    facts: [
      raw.cedula ? { label: 'Cédula / RUC', value: raw.cedula } : null,
      raw.titular ? { label: 'Titular', value: raw.titular } : null,
      ...headerFacts,
    ].filter((row): row is UnifiedFact => Boolean(row)),
    rows,
  }
}

function informeSections(body: unknown, kind: 'persona' | 'empresa'): UnifiedSection[] {
  const rec = asRecord(body)
  if (!rec) return []
  const resumen = typeof rec.resumen === 'string' ? rec.resumen : null
  const secciones = asRecord(rec.secciones)
  const out: UnifiedSection[] = []
  if (resumen) {
    out.push({
      id: `informe-${kind}-resumen`,
      title: kind === 'persona' ? 'Informe 360 de persona' : 'Informe 360 de empresa',
      source: 'Consultas.ec',
      status: 'ok',
      error: null,
      summary: resumen,
      facts: factsFromObject({
        secciones_cobradas: rec.secciones_cobradas,
        sin_verificar: rec.sin_verificar,
      }),
      rows: [],
    })
  }
  if (!secciones) {
    if (out.length === 0) {
      out.push({
        id: `informe-${kind}`,
        title: kind === 'persona' ? 'Informe 360 de persona' : 'Informe 360 de empresa',
        source: 'Consultas.ec',
        status: 'ok',
        error: null,
        summary: null,
        facts: factsFromObject(body),
        rows: [],
      })
    }
    return out
  }

  const titles: Record<string, string> = {
    identidad: 'Identidad (Registro Civil)',
    actividad_economica: 'Actividad económica (SRI)',
    procesos_judiciales: 'Procesos judiciales',
    multas_transito: 'Multas de tránsito (persona)',
    estado_tributario: 'Estado tributario (SRI)',
    supercias: 'Superintendencia de Compañías',
  }

  for (const [key, value] of Object.entries(secciones)) {
    if (key === 'procesos_judiciales') continue
    const block = asRecord(value)
    const estado = typeof block?.estado === 'string' ? block.estado : null
    const datos = block?.datos ?? block
    const dumped = statusOk(estado, datos) ? dumpConsultasBody(datos) : { facts: [], rows: [] }
    const status: UnifiedSection['status'] =
      estado === 'con_datos' || (datos && estado !== 'sin_registros' && estado !== 'no_disponible' && estado !== 'no_consultado')
        ? 'ok'
        : estado === 'sin_registros'
          ? 'empty'
          : estado === 'no_disponible' || estado === 'no_consultado'
            ? 'error'
            : 'ok'
    out.push({
      id: `informe-${kind}-${key}`,
      title: titles[key] || prettyLabel(key),
      source: 'Consultas.ec',
      status: status === 'ok' && !datos ? 'empty' : status,
      error: estado === 'no_disponible' ? 'Fuente no disponible' : estado === 'no_consultado' ? 'No consultado (sin créditos)' : null,
      summary: estado === 'sin_registros' ? 'Sin registros en esta fuente' : dumped.rows.length ? `${dumped.rows.length} registro(s)` : null,
      facts: status === 'ok' ? dumped.facts : [],
      rows: status === 'ok' ? dumped.rows : [],
    })
  }
  return out
}

function statusOk(estado: string | null, datos: unknown): boolean {
  return estado === 'con_datos' || Boolean(datos && estado !== 'sin_registros' && estado !== 'no_disponible' && estado !== 'no_consultado')
}

async function findKsiMatches(
  supabase: SupabaseClient<Database>,
  identity: { placa: string | null; cedula: string | null; ruc: string | null }
): Promise<UnifiedKsiMatch[]> {
  const matches: UnifiedKsiMatch[] = []
  const seen = new Set<string>()

  function push(row: UnifiedKsiMatch) {
    const key = row.placa || row.idNumber || `${row.brand}-${row.model}`
    if (seen.has(key)) return
    seen.add(key)
    matches.push(row)
  }

  if (identity.placa) {
    const { data } = await supabase
      .from('inventoryoracle')
      .select('plate, brand, model, year')
      .or(`plate.eq.${identity.placa},plate_short.eq.${identity.placa}`)
      .limit(5)
    for (const row of data ?? []) {
      push({
        placa: row.plate || identity.placa,
        brand: row.brand,
        model: row.model,
        year: row.year,
        ownerName: null,
        idNumber: null,
      })
    }
  }

  const id = identity.cedula || identity.ruc
  if (id) {
    const { data: owners } = await supabase
      .from('inventory_vehicle_owners')
      .select('owner_name, id_number, inventoryoracle_id')
      .ilike('id_number', `%${id}%`)
      .limit(20)
    const oracleIds = [...new Set((owners ?? []).map((row) => row.inventoryoracle_id))]
    if (oracleIds.length > 0) {
      const { data: cars } = await supabase
        .from('inventoryoracle')
        .select('id, plate, brand, model, year')
        .in('id', oracleIds)
      const byId = new Map((cars ?? []).map((row) => [row.id, row]))
      for (const owner of owners ?? []) {
        const car = byId.get(owner.inventoryoracle_id)
        if (!car) continue
        push({
          placa: car.plate || '',
          brand: car.brand,
          model: car.model,
          year: car.year,
          ownerName: owner.owner_name,
          idNumber: owner.id_number,
        })
      }
    }
  }

  return matches
}

async function loadPersonDossier(
  id: string,
  isRuc: boolean,
  options?: { includeTrafficFines?: boolean }
): Promise<UnifiedSection[]> {
  const includeTrafficFines = options?.includeTrafficFines !== false
  const out: UnifiedSection[] = []
  if (isEcuadorApiConfigured()) {
    if (isRuc) {
      const empresa = await ecuadorPathSafe(`/rucs/${encodeURIComponent(id)}`)
      out.push(sectionFromDump({
        id: 'empresa',
        title: 'Empresa (SRI)',
        source: 'EcuadorAPI',
        data: empresa,
        emptySummary: 'No hay datos de empresa para ese RUC.',
      }))
    } else {
      const persona = await ecuadorPathSafe(`/cedulas/${encodeURIComponent(id)}`)
      out.push(sectionFromDump({
        id: 'persona',
        title: 'Persona (Registro Civil)',
        source: 'EcuadorAPI',
        data: persona,
        emptySummary: 'No hay datos de persona para esa cédula.',
      }))
      const licencia = await ecuadorPathSafe(`/licencias/${encodeURIComponent(id)}`)
      if (licencia) {
        out.push(sectionFromDump({
          id: 'licencia',
          title: 'Licencia',
          source: 'EcuadorAPI',
          data: licencia,
          emptySummary: 'Sin datos de licencia.',
        }))
      }
      const puntos = await ecuadorPathSafe(`/cedulas/${encodeURIComponent(id)}/puntos`)
      if (puntos) {
        out.push(sectionFromDump({
          id: 'puntos',
          title: 'Puntos de licencia',
          source: 'EcuadorAPI',
          data: puntos,
          emptySummary: 'Sin puntos de licencia.',
        }))
      }
    }
    if (includeTrafficFines) {
      const multas = await ecuadorPathSafe(`/multas/${encodeURIComponent(id)}`)
      out.push(sectionFromDump({
        id: 'multas-persona',
        title: 'Multas de tránsito (persona)',
        source: 'EcuadorAPI',
        data: multas,
        emptySummary: 'Sin multas para esa identificación.',
      }))
    }
  } else {
    out.push(skipped(isRuc ? 'empresa' : 'persona', isRuc ? 'Empresa (SRI)' : 'Persona', 'EcuadorAPI', 'EcuadorAPI no está configurada'))
  }

  if (isConsultasEcConfigured()) {
    out.push(juiciosSection(await fetchJuiciosRaw(id)))
  } else {
    out.push(skipped('juicios', 'Procesos judiciales', 'Consultas.ec', 'Consultas.ec no está configurada'))
  }
  return out
}

export async function runUnifiedConsulta(
  supabase: SupabaseClient<Database>,
  rawQuery: string
): Promise<UnifiedConsultaResult> {
  const classified = classifyConsultaQuery(rawQuery)
  if ('error' in classified) {
    throw new Error(classified.error)
  }

  const queriedAt = new Date().toISOString()
  const identity = {
    placa: classified.kind === 'placa' ? classified.value : null,
    cedula: classified.kind === 'cedula' ? classified.value : null,
    ruc: classified.kind === 'ruc' ? classified.value : null,
    nombre: classified.kind === 'nombre' ? classified.value : null,
  }
  const sections: UnifiedSection[] = []

  if (classified.kind === 'placa') {
    if (isEcuadorApiConfigured()) {
      try {
        const plateRaw = await fetchEcuadorPath(`/placas/${encodeURIComponent(classified.value)}`).catch(() => null)
        const contraste = await fetchEcuadorContraste(classified.value)
        const vehicle = await enrichVehicleSection(classified.value, ecuadorSection(contraste, plateRaw))
        sections.push(vehicle)
        const hints = extractIdentityHints(plateRaw)
        const ownerId = ownerIdFromEcuadorPlate(plateRaw)
        identity.nombre = contraste.lookup?.ownerName ?? hints.nombre ?? identity.nombre
        identity.cedula = identity.cedula || (ownerId && ownerId.length === 10 ? ownerId : hints.cedula)
        identity.ruc = identity.ruc || (ownerId && ownerId.length === 13 ? ownerId : hints.ruc)
        const owner = await resolveOwnerIdentityForContraste(supabase, classified.value)
        identity.cedula = identity.cedula || owner.cedula
        identity.nombre = identity.nombre || owner.ownerName
        if (owner.cedula && owner.cedula.length === 13) identity.ruc = owner.cedula
      } catch (error) {
        const message =
          error instanceof EcuadorApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'No se pudo consultar EcuadorAPI'
        sections.push({
          id: 'ecuador-vehiculo',
          title: 'Vehículo y deudas (EcuadorAPI)',
          source: 'EcuadorAPI',
          status: 'error',
          error: message,
          summary: null,
          facts: [],
          rows: [],
        })
      }
    } else {
      sections.push(skipped('ecuador-vehiculo', 'Vehículo y deudas (EcuadorAPI)', 'EcuadorAPI', 'EcuadorAPI no está configurada'))
    }

    if (!identity.cedula && !identity.ruc && identity.nombre && isEcuadorApiConfigured()) {
      const search = await ecuadorPathSafe(`/cedulas/search?name=${encodeURIComponent(identity.nombre)}`)
      const hits = parseCedulaNameHits(search)
      if (hits.length === 1) {
        if (hits[0].id.length === 13) identity.ruc = hits[0].id
        else identity.cedula = hits[0].id
      }
    }
  }

  if (classified.kind === 'nombre') {
    if (isEcuadorApiConfigured()) {
      const search = await ecuadorPathSafe(`/cedulas/search?name=${encodeURIComponent(classified.value)}`)
      const hits = parseCedulaNameHits(search)
      if (hits.length === 1) {
        identity.cedula = hits[0].id
        identity.nombre = hits[0].name || classified.value
      } else if (hits.length > 1) {
        sections.push({
          id: 'persona',
          title: 'Coincidencias por nombre',
          source: 'EcuadorAPI',
          status: 'ok',
          error: null,
          summary: 'Hay varias personas con ese nombre. Consulta la cédula exacta para ver procesos y multas.',
          facts: [],
          rows: hits.map((hit) => ({
            title: hit.name || hit.id,
            subtitle: hit.id,
            facts: [
              { label: 'Nombre', value: hit.name || '—' },
              { label: 'Cédula', value: hit.id },
            ],
            rawJson: null,
          })),
        })
      } else {
        sections.push({
          id: 'persona',
          title: 'Persona',
          source: 'EcuadorAPI',
          status: 'empty',
          error: null,
          summary: 'No se encontró una cédula para ese nombre.',
          facts: [],
          rows: [],
        })
      }
    } else {
      sections.push(skipped('persona', 'Persona', 'EcuadorAPI', 'EcuadorAPI no está configurada'))
    }
  }

  const personId = identity.cedula || identity.ruc || (classified.kind === 'cedula' || classified.kind === 'ruc' ? classified.value : null)
  if (personId) {
    if (personId.length === 13) identity.ruc = identity.ruc || personId
    if (personId.length === 10) identity.cedula = identity.cedula || personId
    sections.push(
      ...(await loadPersonDossier(personId, personId.length === 13, {
        includeTrafficFines: classified.kind !== 'placa',
      }))
    )
  }

  const ksi = classified.kind === 'placa' ? await findKsiMatches(supabase, { placa: identity.placa, cedula: null, ruc: null }) : []

  const merged = mergeOverlappingSections(sections)

  return {
    query: classified.value,
    kind: classified.kind,
    queriedAt,
    sourcesReady: {
      ecuador: isEcuadorApiConfigured(),
      consultas: isConsultasEcConfigured(),
    },
    identity,
    ksi,
    sections: merged,
    report: buildReadableReport({
      query: classified.value,
      kind: classified.kind,
      queriedAt,
      sourcesReady: {
        ecuador: isEcuadorApiConfigured(),
        consultas: isConsultasEcConfigured(),
      },
      identity,
      ksi,
      sections: merged,
    }),
  }
}
