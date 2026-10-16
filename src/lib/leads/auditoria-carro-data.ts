import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { OBJECION_LABELS, labelOf } from '@/lib/leads/embudo-labels'
import type {
  AuditoriaCarro,
  AuditoriaCarroCaida,
  AuditoriaCarroFilters,
  AuditoriaCarroInsight,
  AuditoriaCarroPayload,
  AuditoriaCarroSort,
} from '@/lib/leads/auditoria-carro-types'

type Row = Record<string, unknown>

function admin(): SupabaseClient {
  return createServiceRoleClient() as unknown as SupabaseClient
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function int(value: unknown): number {
  return Math.round(num(value) ?? 0)
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return part / total
}

function caida(de: string, a: string, deValor: number, aValor: number): AuditoriaCarroCaida {
  return {
    de,
    a,
    deValor,
    aValor,
    perdidos: Math.max(0, deValor - aValor),
    tasaRetencion: pct(aValor, deValor),
  }
}

function buildCaidas(c: {
  conversaciones: number
  vioPrecio: number
  pidioCuota: number
  agendo: number
  visitoEmbudo: number
}): AuditoriaCarroCaida[] {
  return [
    caida('conversaciones', 'precio', c.conversaciones, c.vioPrecio),
    caida('precio', 'cuota', c.vioPrecio, c.pidioCuota),
    caida('cuota', 'agendó', c.pidioCuota, c.agendo),
    caida('agendó', 'visitó', c.agendo, c.visitoEmbudo),
  ]
}

function peorCaida(caidas: AuditoriaCarroCaida[]): AuditoriaCarroCaida | null {
  if (caidas.length === 0) return null
  return [...caidas].sort((a, b) => b.perdidos - a.perdidos || a.tasaRetencion - b.tasaRetencion)[0] ?? null
}

function pickInsight(car: {
  conversaciones: number
  vioPrecio: number
  pidioCuota: number
  agendo: number
  visitasPatio: number
  status: string | null
  diasEnPatio: number | null
  objecionTop: string | null
  objPlata: number
  objCarro: number
  gastoAds: number
  leadsAds: number
  pendientesBot: number
  cambiosPrecio: number
  pidieronRebaja: number
  ofertas: number
  ofertaBajoPrecioPct: number | null
  peor: AuditoriaCarroCaida | null
}): { insight: AuditoriaCarroInsight; label: string | null } {
  const { conversaciones: conv, agendo, visitasPatio, peor } = car

  if (conv >= 20 && agendo <= Math.max(2, conv * 0.05)) {
    return { insight: 'atrae_no_cierra', label: 'Atrae pero no agenda' }
  }
  if (agendo >= 8 && visitasPatio >= 10 && car.status === 'disponible' && (car.diasEnPatio ?? 0) >= 60) {
    return { insight: 'problema_patio', label: 'Problema en el patio' }
  }
  if (car.gastoAds >= 100 && car.leadsAds >= 50 && (car.objecionTop === 'modelo' || car.objPlata > car.objCarro)) {
    if (car.objecionTop === 'modelo' || (car.objCarro > 0 && car.objCarro >= car.objPlata)) {
      return { insight: 'ads_mal', label: 'Ads traen gente equivocada' }
    }
  }
  if ((car.diasEnPatio ?? 0) >= 90 && car.cambiosPrecio >= 3 && agendo < 5 && car.objPlata >= car.objCarro) {
    return { insight: 'bajar_precio_no_funciona', label: 'Bajar precio no está funcionando' }
  }
  if (car.ofertas >= 3 && (car.ofertaBajoPrecioPct ?? 0) >= 15) {
    return { insight: 'ofertan_bajo', label: `Ofertan ${Math.round(car.ofertaBajoPrecioPct ?? 0)}% bajo el precio` }
  }
  if (car.pidieronRebaja >= 5 && car.pidieronRebaja >= conv * 0.1) {
    return { insight: 'piden_rebaja', label: 'Muchos piden rebaja' }
  }
  if (car.pendientesBot >= 3) {
    return { insight: 'bot_ciego', label: 'Bot sin respuestas de este carro' }
  }
  if (peor) {
    if (peor.de === 'conversaciones' && peor.a === 'precio' && peor.perdidos >= 10) {
      return { insight: 'cae_precio', label: 'Se cae fuerte en el precio' }
    }
    if (peor.de === 'precio' && peor.a === 'cuota' && peor.perdidos >= 10) {
      return { insight: 'cae_cuota', label: 'Se cae al pedir cuota' }
    }
    if (peor.de === 'cuota' && peor.a === 'agendó' && peor.perdidos >= 5) {
      return { insight: 'cae_agenda', label: 'Se cae al agendar' }
    }
  }
  return { insight: null, label: null }
}

function mapRow(row: Row): AuditoriaCarro {
  const brand = text(row.brand) ?? ''
  const model = text(row.model) ?? ''
  const conversaciones = int(row.conversaciones)
  const soloUnCarro = int(row.solo_un_carro)
  const vioPrecio = int(row.vio_precio)
  const pidioCuota = int(row.pidio_cuota)
  const agendo = int(row.agendo)
  const visitoEmbudo = int(row.visito_embudo)
  const objecionTop = text(row.objecion_top)
  const caidas = buildCaidas({ conversaciones, vioPrecio, pidioCuota, agendo, visitoEmbudo })
  const peor = peorCaida(caidas)
  const status = text(row.status)
  const diasEnPatio = num(row.dias_en_patio)
  const objPlata = int(row.obj_plata)
  const objCarro = int(row.obj_carro)
  const gastoAds = int(row.gasto_ads)
  const leadsAds = int(row.leads_ads)
  const pendientesBot = int(row.pendientes_bot)
  const cambiosPrecio = int(row.cambios_precio)
  const visitasPatio = int(row.visitas_patio)
  const pidieronRebaja = int(row.pidieron_rebaja)
  const ofertas = int(row.ofertas)
  const ofertaBajoPrecioPct = num(row.oferta_bajo_precio_pct)
  const { insight, label } = pickInsight({
    conversaciones,
    vioPrecio,
    pidioCuota,
    agendo,
    visitasPatio,
    status,
    diasEnPatio,
    objecionTop,
    objPlata,
    objCarro,
    gastoAds,
    leadsAds,
    pendientesBot,
    cambiosPrecio,
    pidieronRebaja,
    ofertas,
    ofertaBajoPrecioPct,
    peor,
  })

  const multiCarro = conversaciones > 0 && soloUnCarro < conversaciones

  return {
    inventoryId: text(row.inventory_id) ?? '',
    brand,
    model,
    nombre: `${brand} ${model}`.trim() || 'Vehículo sin nombre',
    year: num(row.year),
    price: num(row.price),
    status,
    location: text(row.location),
    diasEnPatio: diasEnPatio == null ? null : Math.round(diasEnPatio),
    conversaciones,
    soloUnCarro,
    pctSoloUnCarro: pct(soloUnCarro, conversaciones),
    vioPrecio,
    pidioCuota,
    agendo,
    visitoEmbudo,
    visitasPatio,
    testDrives: int(row.test_drives),
    objecionTop,
    objecionTopLabel: labelOf(OBJECION_LABELS, objecionTop, 'Sin objeción'),
    objPlata,
    objCarro,
    presupuestoProm: num(row.presupuesto_prom),
    entradaProm: num(row.entrada_prom),
    gastoAds,
    leadsAds,
    pendientesBot,
    cambiosPrecio,
    pidieronRebaja,
    ofertas,
    ofertaProm: num(row.oferta_prom),
    ofertaMax: num(row.oferta_max),
    ofertaBajoPrecioPct,
    caidas,
    peorCaida: peor,
    insight,
    insightLabel: label,
    ubicaciones: [],
    sinUbicacion: conversaciones,
    atribucionAproximada: multiCarro,
  }
}

function cityOf(value: unknown): string | null {
  const raw = text(value)
  if (!raw || raw.toLowerCase() === 'null') return null
  return raw
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Ciudades por carro, cruzando las conversaciones con leads.ciudad_cliente */
async function loadUbicaciones(db: SupabaseClient): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>()

  const { data: leads, error: leadsError } = await db
    .from('leads')
    .select('id, ciudad_cliente')
    .not('ciudad_cliente', 'is', null)
    .neq('ciudad_cliente', '')
  if (leadsError) throw new Error(leadsError.message)

  const cityByLead = new Map<number, string>()
  for (const l of (leads ?? []) as Row[]) {
    const city = cityOf(l.ciudad_cliente)
    const id = num(l.id)
    if (city && id != null) cityByLead.set(id, city)
  }
  if (cityByLead.size === 0) return out

  const leadIds = [...cityByLead.keys()]
  for (let i = 0; i < leadIds.length; i += 500) {
    const { data, error } = await db
      .from('lead_conversation_analysis')
      .select('lead_id, vehiculos_consultados, resumen')
      .in('lead_id', leadIds.slice(i, i + 500))
    if (error) throw new Error(error.message)

    for (const a of (data ?? []) as Row[]) {
      if (/^\s*\[vacante\]/i.test(text(a.resumen) ?? '')) continue
      const city = cityByLead.get(num(a.lead_id) ?? -1)
      if (!city) continue
      const cars = Array.isArray(a.vehiculos_consultados) ? (a.vehiculos_consultados as unknown[]) : []
      for (const inv of cars) {
        if (typeof inv !== 'string' || !/^[0-9a-f-]{36}$/.test(inv)) continue
        const perCar = out.get(inv) ?? new Map<string, number>()
        perCar.set(city, (perCar.get(city) ?? 0) + 1)
        out.set(inv, perCar)
      }
    }
  }
  return out
}

const SORT_KEYS: Record<AuditoriaCarroSort, (c: AuditoriaCarro) => number> = {
  conversaciones: (c) => c.conversaciones,
  agendo: (c) => c.agendo,
  dias_en_patio: (c) => c.diasEnPatio ?? -1,
  gasto_ads: (c) => c.gastoAds,
  visitas_patio: (c) => c.visitasPatio,
  vio_precio: (c) => c.vioPrecio,
  pidieron_rebaja: (c) => c.pidieronRebaja,
}

export async function loadAuditoriaCarro(filters: AuditoriaCarroFilters = {}): Promise<AuditoriaCarroPayload> {
  const db = admin()
  const [{ data, error }, ubicaciones] = await Promise.all([
    db.from('v_auditoria_carro').select('*'),
    loadUbicaciones(db),
  ])
  if (error) throw new Error(error.message)

  let carros = ((data ?? []) as unknown as Row[]).map(mapRow).filter((c) => Boolean(c.inventoryId))

  for (const car of carros) {
    const perCar = ubicaciones.get(car.inventoryId)
    if (!perCar) continue
    car.ubicaciones = [...perCar.entries()]
      .map(([ciudad, n]) => ({ ciudad, n }))
      .sort((a, b) => b.n - a.n || a.ciudad.localeCompare(b.ciudad, 'es'))
    const conUbicacion = car.ubicaciones.reduce((sum, u) => sum + u.n, 0)
    car.sinUbicacion = Math.max(0, car.conversaciones - conUbicacion)
  }

  const status = text(filters.status)
  if (status && status !== 'todos') {
    carros = carros.filter((c) => (c.status ?? '').toLowerCase() === status.toLowerCase())
  }
  if (filters.soloConChat !== false) {
    carros = carros.filter((c) => c.conversaciones > 0)
  }

  const sort = filters.sort ?? 'conversaciones'
  const order = filters.order ?? 'desc'
  const keyFn = SORT_KEYS[sort] ?? SORT_KEYS.conversaciones
  carros.sort((a, b) => {
    const diff = keyFn(a) - keyFn(b)
    if (diff !== 0) return order === 'asc' ? diff : -diff
    return a.nombre.localeCompare(b.nombre, 'es')
  })

  const conChat = carros.filter((c) => c.conversaciones > 0).length
  const conversaciones = carros.reduce((sum, c) => sum + c.conversaciones, 0)

  return {
    carros,
    totales: {
      carros: carros.length,
      conChat,
      conversaciones,
    },
    atribucionAproximada: true,
  }
}
