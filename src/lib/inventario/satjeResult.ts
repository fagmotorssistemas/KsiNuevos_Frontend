function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

export type SatjeProcesoRow = {
  numero: string
  fecha: string
  accion: string
  halladoPor: string
}

function campo(campos: Record<string, unknown> | null, keys: string[]): string {
  if (!campos) return ''
  for (const key of keys) {
    const value = campos[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function origenLabel(origenes: unknown): string {
  const list = Array.isArray(origenes) ? origenes.map(String) : []
  const hasNombre = list.some((o) => o.includes('nombre'))
  const hasCedula = list.some((o) => o.includes('cedula') || o.includes('cédula'))
  if (hasNombre && hasCedula) return 'Nombre y cédula'
  if (hasCedula) return 'Cédula'
  if (hasNombre) return 'Nombre'
  return 'SATJE'
}

function parseDateSort(fecha: string): number {
  const m = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

function procesosFromList(list: unknown): SatjeProcesoRow[] {
  if (!Array.isArray(list)) return []
  const byNumero = new Map<string, SatjeProcesoRow>()
  for (const item of list) {
    const rec = asRecord(item)
    if (!rec) continue
    const campos = asRecord(rec.campos)
    const numero =
      (typeof rec.numero_proceso === 'string' && rec.numero_proceso.trim()) ||
      campo(campos, ['No. proceso', 'No. proceso ', 'numero'])
    if (!numero) continue
    const fecha = campo(campos, ['Fecha de ingreso', 'Fecha'])
    const accion = campo(campos, ['Acción /Infracción', 'Acción/Infracción', 'Accion /Infraccion'])
    const row: SatjeProcesoRow = {
      numero,
      fecha,
      accion,
      halladoPor: origenLabel(rec.origenes),
    }
    const prev = byNumero.get(numero)
    if (!prev) {
      byNumero.set(numero, row)
      continue
    }
    if (row.halladoPor === 'Nombre y cédula' || (row.halladoPor === 'Cédula' && prev.halladoPor === 'Nombre')) {
      byNumero.set(numero, { ...prev, halladoPor: row.halladoPor === 'Cédula' && prev.halladoPor === 'Nombre' ? 'Nombre y cédula' : row.halladoPor })
    }
  }
  return [...byNumero.values()].sort((a, b) => parseDateSort(b.fecha) - parseDateSort(a.fecha))
}

function innerResultado(data: unknown): Record<string, unknown> | null {
  const rec = asRecord(data)
  if (!rec) return null
  const nested = asRecord(rec.resultado)
  if (nested && (nested.procesos != null || nested.persona || nested.consultas)) return nested
  if (rec.procesos != null || rec.persona || rec.consultas) return rec
  return rec
}

export function satjePersona(data: unknown): { nombre: string; cedula: string } | null {
  const inner = innerResultado(data)
  const persona = asRecord(inner?.persona)
  if (!persona) return null
  const nombre = typeof persona.nombre === 'string' ? persona.nombre.trim() : ''
  const cedula = typeof persona.cedula === 'string' ? persona.cedula.trim() : ''
  if (!nombre && !cedula) return null
  return { nombre, cedula }
}

export function satjeProcesosUnicos(data: unknown): SatjeProcesoRow[] {
  const inner = innerResultado(data)
  if (!inner) return []
  const fromRoot = procesosFromList(inner.procesos)
  if (fromRoot.length > 0) return fromRoot
  const consultas = asRecord(inner.consultas)
  if (!consultas) return []
  const merged: unknown[] = []
  for (const value of Object.values(consultas)) {
    const block = asRecord(value)
    if (block?.procesos) merged.push(...(Array.isArray(block.procesos) ? block.procesos : []))
  }
  return procesosFromList(merged)
}

export function satjeResumenConsultas(data: unknown): { etiqueta: string; valor: string; cantidad: number }[] {
  const inner = innerResultado(data)
  const consultas = asRecord(inner?.consultas)
  if (!consultas) return []
  const out: { etiqueta: string; valor: string; cantidad: number }[] = []
  for (const block of Object.values(consultas)) {
    const rec = asRecord(block)
    if (!rec) continue
    const rol = typeof rec.rol === 'string' ? rec.rol : 'Consulta'
    const criterio = typeof rec.criterio === 'string' ? rec.criterio : ''
    const valor = typeof rec.valor === 'string' ? rec.valor : ''
    const unique = procesosFromList(rec.procesos).length
    out.push({
      etiqueta: criterio ? `${rol} · ${criterio}` : rol,
      valor,
      cantidad: unique,
    })
  }
  return out
}

export function satjeFiscaliaOk(data: unknown): boolean {
  const inner = innerResultado(data)
  const fiscalia = asRecord(inner?.fiscalia)
  const consultas = asRecord(fiscalia?.consultas)
  if (!consultas) return true
  for (const block of Object.values(consultas)) {
    const rec = asRecord(block)
    if (typeof rec?.error === 'string' && rec.error.trim()) return false
  }
  return true
}
