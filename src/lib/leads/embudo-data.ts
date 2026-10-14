import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  CANCELACION_LABELS,
  ETAPAS,
  OBJECION_LABELS,
  POST_FOTO_PASOS,
  SEGUIMIENTO_LABELS,
  SENALES_NEGATIVAS,
  SENAL_LABELS,
  SENAL_ORIGEN_LABELS,
  TEMPERATURA_LABELS,
  TEMPERATURA_RANK,
  TICKET_LABELS,
  labelOf,
} from '@/lib/leads/embudo-labels'
import type {
  EmbudoCambioTemperatura,
  EmbudoConteo,
  EmbudoConversacion,
  EmbudoPasoFotos,
  EmbudoPayload,
  EmbudoRetoma,
  EmbudoSenal,
  EmbudoSenales,
  EmbudoVehiculo,
} from '@/lib/leads/embudo-types'

const PAGE = 1000
const LIST_LIMIT = 150
const SENALES_POR_LEAD = 8
const VEHICLE_LIMIT = 12
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Row = Record<string, unknown>

function admin(): SupabaseClient {
  return createServiceRoleClient() as unknown as SupabaseClient
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function bool(value: unknown): boolean {
  return value === true
}

async function fetchAll(db: SupabaseClient, table: string, columns: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as unknown as Row[]
    rows.push(...batch)
    if (batch.length < PAGE) break
  }
  return rows
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function conteos(map: Map<string, number>, labels: Record<string, string>): EmbudoConteo[] {
  return [...map.entries()]
    .map(([key, total]) => ({ key, label: labelOf(labels, key, key), total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'es'))
}

function motivo(value: unknown): string | null {
  return text(value)
}

const DIAS_SERIE = 30
const ZONA = 'America/Guayaquil'

function fechaEcuador(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: ZONA })
}

function ultimosDias(cantidad: number): string[] {
  const hoy = new Date()
  const dias: string[] = []
  for (let i = cantidad - 1; i >= 0; i -= 1) {
    dias.push(fechaEcuador(new Date(hoy.getTime() - i * 86_400_000)))
  }
  return dias
}

function emptyPanel() {
  return { programadas: 0, enviadas: 0, pendientes: 0, canceladas: 0 }
}

async function loadVehicles(db: SupabaseClient, ids: string[]): Promise<Map<string, EmbudoVehiculo>> {
  const found = new Map<string, EmbudoVehiculo>()
  for (let i = 0; i < ids.length; i += 80) {
    const slice = ids.slice(i, i + 80)
    const { data, error } = await db
      .from('inventoryoracle')
      .select('id, brand, model, year, price, status')
      .in('id', slice)
    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as Row[]) {
      const id = text(row.id)
      if (!id) continue
      const brand = text(row.brand) ?? ''
      const model = text(row.model) ?? ''
      const nombre = `${brand} ${model}`.trim() || 'Vehículo sin nombre'
      found.set(id, {
        id,
        nombre,
        anio: num(row.year),
        precio: num(row.price),
        estado: text(row.status),
        consultas: 0,
      })
    }
  }
  return found
}

export async function loadEmbudo(): Promise<EmbudoPayload> {
  const db = admin()
  const [analysis, followups, postFotos, senalRows] = await Promise.all([
    fetchAll(
      db,
      'lead_conversation_analysis',
      'id, lead_id, etapa_max, objecion_principal, segmento_ticket, seguimiento, cerrada, vehiculos_consultados, precio_max_mostrado, presupuesto_monto, entrada_disponible, forma_pago, created_at, updated_at'
    ),
    fetchAll(db, 'lead_followup', 'id, retoma, programada, enviada, respondio, cancelada'),
    fetchAll(db, 'lead_post_fotos', 'id, paso, programada, enviada, cancelada'),
    fetchAll(db, 'lead_senales', 'id, lead_id, senal, valor, fragmento, origen, detectada_at'),
  ])

  const senales = resumirSenales(senalRows)
  const senalesPorLead = agruparSenales(senalRows)

  const etapaStopped = new Map<number, number>()
  const objeciones = new Map<string, number>()
  const tickets = new Map<string, number>()
  const vehiculoCounts = new Map<string, number>()
  let cerradas = 0
  let seguimientoActivo = 0
  let seguimientoAplazado = 0
  let seguimientoCerrado = 0
  let sinObjecion = 0
  let sinSegmento = 0
  const dias = ultimosDias(DIAS_SERIE)
  const porDiaMap = new Map(dias.map((fecha) => [fecha, 0]))

  for (const row of analysis) {
    const creada = text(row.created_at)
    if (creada) {
      const fecha = fechaEcuador(creada)
      if (porDiaMap.has(fecha)) porDiaMap.set(fecha, (porDiaMap.get(fecha) ?? 0) + 1)
    }
    const etapa = num(row.etapa_max)
    if (etapa != null) etapaStopped.set(etapa, (etapaStopped.get(etapa) ?? 0) + 1)
    const objecion = text(row.objecion_principal)
    if (objecion) bump(objeciones, objecion)
    else sinObjecion += 1
    const ticket = text(row.segmento_ticket)
    if (ticket) bump(tickets, ticket)
    else sinSegmento += 1
    const seguimiento = text(row.seguimiento)
    if (seguimiento === 'activo') seguimientoActivo += 1
    else if (seguimiento === 'aplazado') seguimientoAplazado += 1
    else if (seguimiento === 'cerrado') seguimientoCerrado += 1
    if (bool(row.cerrada)) cerradas += 1
    const cars = Array.isArray(row.vehiculos_consultados) ? row.vehiculos_consultados : []
    for (const car of cars) {
      const id = text(car)
      if (id && UUID_RE.test(id)) bump(vehiculoCounts, id)
    }
  }

  const embudo = ETAPAS.map((item) => {
    let alcanzaron = 0
    for (const [etapa, total] of etapaStopped) {
      if (etapa >= item.etapa) alcanzaron += total
    }
    return {
      etapa: item.etapa,
      label: item.label,
      seQuedaron: etapaStopped.get(item.etapa) ?? 0,
      alcanzaron,
    }
  })

  const ticketOrder = ['high', 'medio', 'low']
  const ticketRows = ticketOrder.map((key) => ({
    key,
    label: TICKET_LABELS[key],
    total: tickets.get(key) ?? 0,
  }))
  for (const [key, total] of tickets) {
    if (!ticketOrder.includes(key)) ticketRows.push({ key, label: labelOf(TICKET_LABELS, key, key), total })
  }

  const topVehicleIds = [...vehiculoCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, VEHICLE_LIMIT)
    .map(([id]) => id)
  const inventory = await loadVehicles(db, topVehicleIds)
  const vehiculos: EmbudoVehiculo[] = topVehicleIds.map((id) => {
    const car = inventory.get(id)
    return {
      id,
      nombre: car?.nombre ?? 'Sin ficha en patio',
      anio: car?.anio ?? null,
      precio: car?.precio ?? null,
      estado: car?.estado ?? null,
      consultas: vehiculoCounts.get(id) ?? 0,
    }
  })

  const latest = [...analysis]
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    .slice(0, LIST_LIMIT)
  const latestIds = latest.map((row) => text(row.id)).filter((id): id is string => Boolean(id))
  const leadIds = [...new Set(latest.map((row) => num(row.lead_id)).filter((id): id is number => id != null))]

  const detailById = new Map<string, Row>()
  const leadById = new Map<number, Row>()
  if (latestIds.length > 0) {
    const { data, error } = await db
      .from('lead_conversation_analysis')
      .select('id, resumen, objecion_texto, objecion_evidencia, presupuesto_declarado, analizado_hasta, cerrada_at')
      .in('id', latestIds)
    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as Row[]) {
      const id = text(row.id)
      if (id) detailById.set(id, row)
    }
  }
  if (leadIds.length > 0) {
    const { data, error } = await db.from('leads').select('id, name, bot_apagado, lead_id_kommo').in('id', leadIds)
    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as Row[]) {
      const id = num(row.id)
      if (id != null) leadById.set(id, row)
    }
  }

  const conversaciones: EmbudoConversacion[] = latest.map((row) => {
    const id = text(row.id) ?? ''
    const leadId = num(row.lead_id)
    const detail = detailById.get(id)
    const lead = leadId == null ? undefined : leadById.get(leadId)
    const etapa = num(row.etapa_max)
    const objecion = text(row.objecion_principal)
    const segmento = text(row.segmento_ticket)
    const seguimiento = text(row.seguimiento)
    return {
      id,
      leadId,
      leadIdKommo: num(lead?.lead_id_kommo),
      nombre: text(lead?.name) ?? (leadId != null ? `Lead ${leadId}` : 'Sin lead'),
      etapa,
      etapaLabel: etapa == null ? 'Sin etapa' : (ETAPAS.find((item) => item.etapa === etapa)?.label ?? `Etapa ${etapa}`),
      objecion,
      objecionLabel: labelOf(OBJECION_LABELS, objecion, 'Sin objeción'),
      objecionTexto: text(detail?.objecion_texto),
      objecionEvidencia: text(detail?.objecion_evidencia),
      resumen: text(detail?.resumen),
      presupuestoMonto: num(row.presupuesto_monto),
      presupuestoDeclarado: text(detail?.presupuesto_declarado),
      analizadoHasta: text(detail?.analizado_hasta),
      cerradaAt: text(detail?.cerrada_at),
      entradaDisponible: num(row.entrada_disponible),
      formaPago: text(row.forma_pago),
      segmento,
      segmentoLabel: labelOf(TICKET_LABELS, segmento, 'Sin segmento'),
      seguimiento,
      seguimientoLabel: labelOf(SEGUIMIENTO_LABELS, seguimiento),
      cerrada: bool(row.cerrada),
      precioMax: num(row.precio_max_mostrado),
      humano: bool(lead?.bot_apagado),
      actualizado: text(row.updated_at),
      senales: leadId == null ? [] : (senalesPorLead.get(leadId) ?? []),
    }
  })

  const retomaMap = new Map<number, EmbudoRetoma>()
  const retomaMotivos = new Map<string, number>()
  const retomas = { ...emptyPanel(), respondieron: 0 }
  for (const row of followups) {
    const retoma = num(row.retoma) ?? 0
    const slot = retomaMap.get(retoma) ?? {
      retoma,
      programadas: 0,
      enviadas: 0,
      respondieron: 0,
      pendientes: 0,
      canceladas: 0,
    }
    slot.programadas += 1
    retomas.programadas += 1
    const cancelada = motivo(row.cancelada)
    const enviada = row.enviada != null
    if (cancelada) {
      slot.canceladas += 1
      retomas.canceladas += 1
      bump(retomaMotivos, cancelada)
    } else if (enviada) {
      slot.enviadas += 1
      retomas.enviadas += 1
      if (bool(row.respondio)) {
        slot.respondieron += 1
        retomas.respondieron += 1
      }
    } else {
      slot.pendientes += 1
      retomas.pendientes += 1
    }
    retomaMap.set(retoma, slot)
  }

  const fotoMap = new Map<number, EmbudoPasoFotos>()
  const fotoMotivos = new Map<string, number>()
  const post = emptyPanel()
  for (const row of postFotos) {
    const paso = num(row.paso) ?? 0
    const slot = fotoMap.get(paso) ?? {
      paso,
      label: POST_FOTO_PASOS[paso] ?? `Paso ${paso}`,
      programadas: 0,
      enviadas: 0,
      pendientes: 0,
      canceladas: 0,
    }
    slot.programadas += 1
    post.programadas += 1
    const cancelada = motivo(row.cancelada)
    if (cancelada) {
      slot.canceladas += 1
      post.canceladas += 1
      bump(fotoMotivos, cancelada)
    } else if (row.enviada != null) {
      slot.enviadas += 1
      post.enviadas += 1
    } else {
      slot.pendientes += 1
      post.pendientes += 1
    }
    fotoMap.set(paso, slot)
  }

  return {
    totales: {
      conversaciones: analysis.length,
      cerradas,
      seguimientoActivo,
      seguimientoAplazado,
      seguimientoCerrado,
      sinObjecion,
      sinSegmento,
    },
    porDia: dias.map((fecha) => ({ fecha, total: porDiaMap.get(fecha) ?? 0 })),
    embudo,
    objeciones: conteos(objeciones, OBJECION_LABELS),
    tickets: ticketRows,
    vehiculos,
    retomas: {
      ...retomas,
      tasaRespuesta: retomas.enviadas > 0 ? retomas.respondieron / retomas.enviadas : 0,
      porRetoma: [...retomaMap.values()].sort((a, b) => a.retoma - b.retoma),
      motivos: conteos(retomaMotivos, CANCELACION_LABELS),
    },
    postFotos: {
      ...post,
      porPaso: [...fotoMap.values()].sort((a, b) => a.paso - b.paso),
      motivos: conteos(fotoMotivos, CANCELACION_LABELS),
    },
    senales,
    conversaciones,
  }
}

type ValorSenal = {
  de?: unknown
  a?: unknown
  monto?: unknown
  precio?: unknown
  contado?: unknown
  porcentaje?: unknown
  fecha?: unknown
}

function valorDe(row: Row): ValorSenal {
  return row.valor && typeof row.valor === 'object' ? (row.valor as ValorSenal) : {}
}

function detalleSenal(key: string, valor: ValorSenal): string | null {
  const dinero = (v: unknown) => {
    const n = num(v)
    return n == null ? null : `$${Math.round(n).toLocaleString('es-EC')}`
  }
  if (key === 'cambio_temperatura') {
    const de = text(valor.de)
    const a = text(valor.a)
    if (!de || !a) return null
    return `${labelOf(TEMPERATURA_LABELS, de)} → ${labelOf(TEMPERATURA_LABELS, a)}`
  }
  if (key === 'presupuesto_mencionado') return dinero(valor.monto)
  if (key === 'entrada_concreta') {
    const partes = [
      dinero(valor.monto) ? `entrada ${dinero(valor.monto)}` : null,
      num(valor.porcentaje) != null ? `${num(valor.porcentaje)}%` : null,
      valor.contado === true ? 'de contado' : null,
      dinero(valor.precio) ? `carro de ${dinero(valor.precio)}` : null,
    ].filter(Boolean)
    return partes.length ? partes.join(' · ') : null
  }
  if (key === 'visita_con_fecha' || key === 'confirma_visita') return text(valor.fecha)
  return null
}

function resumirSenales(rows: Row[]): EmbudoSenales {
  const tipos = new Map<string, number>()
  const origenes = new Map<string, number>()
  const cambios = new Map<string, EmbudoCambioTemperatura>()
  const leads = new Set<number>()
  let desde: string | null = null
  let temperatura = 0
  let subieron = 0
  let bajaron = 0

  for (const row of rows) {
    const key = text(row.senal)
    if (!key) continue
    const leadId = num(row.lead_id)
    if (leadId != null) leads.add(leadId)
    bump(origenes, text(row.origen) ?? 'sin_origen')
    const detectada = text(row.detectada_at)
    if (detectada && (!desde || detectada < desde)) desde = detectada

    if (key !== 'cambio_temperatura') {
      bump(tipos, key)
      continue
    }
    const valor = valorDe(row)
    const de = text(valor.de)
    const a = text(valor.a)
    if (!de || !a) continue
    temperatura += 1
    const sube = (TEMPERATURA_RANK[a] ?? 0) > (TEMPERATURA_RANK[de] ?? 0)
    if (sube) subieron += 1
    else bajaron += 1
    const id = `${de}>${a}`
    const slot = cambios.get(id) ?? {
      de,
      a,
      deLabel: labelOf(TEMPERATURA_LABELS, de),
      aLabel: labelOf(TEMPERATURA_LABELS, a),
      sube,
      total: 0,
    }
    slot.total += 1
    cambios.set(id, slot)
  }

  return {
    total: rows.length,
    leads: leads.size,
    desde,
    tipos: conteos(tipos, SENAL_LABELS).map((row) => ({ ...row, negativa: SENALES_NEGATIVAS.has(row.key) })),
    origenes: conteos(origenes, SENAL_ORIGEN_LABELS),
    temperatura: {
      total: temperatura,
      subieron,
      bajaron,
      cambios: [...cambios.values()].sort((x, y) => Number(y.sube) - Number(x.sube) || y.total - x.total),
    },
  }
}

function agruparSenales(rows: Row[]): Map<number, EmbudoSenal[]> {
  const porLead = new Map<number, EmbudoSenal[]>()
  for (const row of rows) {
    const leadId = num(row.lead_id)
    const key = text(row.senal)
    if (leadId == null || !key) continue
    const list = porLead.get(leadId) ?? []
    const valor = valorDe(row)
    const bajaTemperatura =
      key === 'cambio_temperatura' &&
      (TEMPERATURA_RANK[text(valor.a) ?? ''] ?? 0) < (TEMPERATURA_RANK[text(valor.de) ?? ''] ?? 0)
    list.push({
      id: num(row.id) ?? 0,
      key,
      label: labelOf(SENAL_LABELS, key, key),
      negativa: SENALES_NEGATIVAS.has(key) || bajaTemperatura,
      fragmento: text(row.fragmento),
      detalle: detalleSenal(key, valor),
      origen: labelOf(SENAL_ORIGEN_LABELS, text(row.origen), 'Sin origen'),
      detectada: text(row.detectada_at),
    })
    porLead.set(leadId, list)
  }
  for (const [leadId, list] of porLead) {
    list.sort((x, y) => String(y.detectada ?? '').localeCompare(String(x.detectada ?? '')))
    porLead.set(leadId, list.slice(0, SENALES_POR_LEAD))
  }
  return porLead
}
