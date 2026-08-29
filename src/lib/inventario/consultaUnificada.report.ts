import type {
  UnifiedConsultaResult,
  UnifiedFact,
  UnifiedReadableReport,
  UnifiedSection,
} from '@/lib/inventario/consultaUnificada.types'

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function titleCaseEs(value: string | null | undefined): string {
  const text = (value || '').trim()
  if (!text) return ''
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (['de', 'del', 'la', 'el', 'y', 'en', 'ep'].includes(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function pick(facts: UnifiedFact[], keys: string[]): string | null {
  const wanted = keys.map(norm)
  for (const fact of facts) {
    const label = norm(fact.label)
    if (wanted.some((key) => {
      if (label === key) return true
      if (key.length < 5) return false
      return label.endsWith(key) || label.startsWith(key)
    })) {
      const value = fact.value.trim()
      if (value) return value
    }
  }
  return null
}

function allFacts(sections: UnifiedSection[], idMatch: (id: string) => boolean): UnifiedFact[] {
  return sections.filter((section) => idMatch(section.id)).flatMap((section) => [...section.facts, ...section.rows.flatMap((row) => row.facts)])
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash) return `${slash[1].padStart(2, '0')}/${slash[2].padStart(2, '0')}/${slash[3]}`
  return value.split(' ')[0] || value
}

function formatMoney(value: string | number | null): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(num)) return String(value)
  return `$${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function citationStatusEs(status: string | null): string {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente') return 'Pendiente de pago'
  if (key === 'paid' || key === 'pagada' || key === 'sí' || key === 'si') return 'Pagada'
  if (key === 'appealed' || key === 'impugnada') return 'Impugnada'
  if (key === 'annulled' || key === 'anulada') return 'Anulada'
  return titleCaseEs(status)
}

function simplifyInfraction(text: string | null): string {
  const raw = (text || '').trim()
  if (!raw) return 'Infracción de tránsito'
  const n = norm(raw)
  if (n.includes('trasp') && n.includes('dominio')) {
    return 'No registrar el traspaso de dominio del vehículo dentro de los 30 días establecidos'
  }
  if (n.includes('exceda') || n.includes('velocidad') || n.includes('lit06') || n.includes('num6')) {
    return 'Exceso de velocidad dentro del rango moderado permitido'
  }
  if (n.includes('desobedezca') || n.includes('senal') || n.includes('ord') || n.includes('lit01') || n.includes('num1')) {
    return 'Incumplimiento de órdenes o señales de tránsito'
  }
  if (n.includes('maltrato') || n.includes('mascota') || n.includes('animal')) {
    return 'Maltrato o muerte de mascotas o animales de compañía'
  }
  if (n.includes('contravencion') && n.includes('transito')) return 'Contravención de tránsito'
  return titleCaseEs(raw.replace(/^art\.?\s*\d+\s*-?\s*lit\.?\s*\d+\.?\s*/i, ''))
}

function cleanEntity(value: string | null): string {
  if (!value) return '—'
  return titleCaseEs(
    value
      .replace(/^MIS-MISICATA\s+/i, '')
      .replace(/^GAD-CTE$/i, 'GAD CTE')
      .replace(/^ATM-/, 'ATM ')
  )
}

function yearOf(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/(19|20)\d{2}/)
  return match ? match[0] : null
}

function isPendingCitation(status: string | null, amount: string | null): boolean {
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente' || key.includes('pendiente de pago')) return true
  const num = Number(String(amount || '').replace(/[^0-9.-]/g, ''))
  return key !== 'paid' && key !== 'pagada' && Number.isFinite(num) && num > 0.009
}

function samePerson(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return norm(a) === norm(b)
}

export function buildReadableReport(result: UnifiedConsultaResult): UnifiedReadableReport {
  const vehicleFacts = allFacts(result.sections, (id) => id.includes('vehiculo') || id === 'ecuador-vehiculo')
  const multaFacts = allFacts(result.sections, (id) => id.includes('multa') || id.includes('vehiculo'))
  const personFacts = allFacts(result.sections, (id) =>
    id.includes('identidad') ||
    id.includes('persona') ||
    id.includes('actividad') ||
    id.includes('empresa') ||
    id.includes('tributario') ||
    id.includes('licencia') ||
    id.includes('puntos')
  )
  const juicios = result.sections.find((section) => section.id === 'juicios')

  const placaFromVehicle = pick(vehicleFacts, ['placa', 'plate'])
  const placa =
    result.kind === 'placa'
      ? placaFromVehicle || result.identity.placa || result.query
      : null
  const marca = titleCaseEs(pick(vehicleFacts, ['marca', 'brand']) || '')
  const modelo = pick(vehicleFacts, ['modelo', 'model']) || ''
  const anio = pick(vehicleFacts, ['año', 'anio', 'year'])
  const color = titleCaseEs(pick(vehicleFacts, ['color']) || '')
  const clase = titleCaseEs(pick(vehicleFacts, ['clase', 'vehicleclass']) || '')
  const uso = titleCaseEs((pick(vehicleFacts, ['servicio', 'service', 'uso']) || '').replace(/^uso\s+/i, ''))
  const pais = titleCaseEs(pick(vehicleFacts, ['paisdeorigen', 'country', 'pais']) || '')
  const chasis = pick(vehicleFacts, ['chasis', 'vin'])
  const canton = titleCaseEs(pick(vehicleFacts, ['cantonregistrado', 'canton']) || '')
  const ultimoAnio = pick(vehicleFacts, ['ultimoanopagado', 'lastpaidyear', 'aniomatricula'])
  const fechaMatricula = formatDate(pick(vehicleFacts, ['fechadematriculacion', 'fechamatricula', 'lastregistrationdate', 'ultimamatricula']))
  const caducidad = formatDate(pick(vehicleFacts, ['caducidaddematricula', 'fechacaducidad', 'registrationexpiry', 'vigenciamatricula']))

  const ecuadorName = pick(vehicleFacts.filter((fact) => (fact.origin || '').includes('Ecuador') || fact.label.toLowerCase().includes('owner')), ['ownerfullname', 'propietario'])
    || pick(vehicleFacts, ['ownerfullname'])
    || result.identity.nombre
  const ecuadorId = pick(vehicleFacts, ['ownerid']) || result.identity.cedula
  const consultasName = pick(
    vehicleFacts.filter((fact) => (fact.origin || '').includes('Consultas') || fact.label.toLowerCase() === 'propietario'),
    ['propietario']
  )
  const consultasId = pick(vehicleFacts, ['cedulapropietario'])

  const ownerEcuador = ecuadorName
    ? { name: titleCaseEs(ecuadorName), cedula: ecuadorId && ecuadorId.length >= 10 ? ecuadorId : null, source: 'EcuadorAPI' }
    : null
  const ownerConsultas =
    consultasName && !samePerson(consultasName, ecuadorName || '')
      ? { name: titleCaseEs(consultasName), cedula: consultasId, source: 'Consultas.ec' }
      : consultasName && consultasId && ecuadorId && consultasId !== ecuadorId
        ? { name: titleCaseEs(consultasName), cedula: consultasId, source: 'Consultas.ec' }
        : consultasName && !ownerEcuador
          ? { name: titleCaseEs(consultasName), cedula: consultasId, source: 'Consultas.ec' }
          : null

  const conflict = Boolean(
    ownerEcuador &&
      ownerConsultas &&
      (!samePerson(ownerEcuador.name, ownerConsultas.name) ||
        Boolean(ownerEcuador.cedula && ownerConsultas.cedula && ownerEcuador.cedula !== ownerConsultas.cedula))
  )

  const sri = formatMoney(pick(vehicleFacts, ['sripendiente']) || (result.kind === 'placa' ? '0' : null))
  const pendingCount = Number(pick(multaFacts, ['citacionespendientes', 'multaspendientes']) || 0)
  const pendingAmount = formatMoney(pick(multaFacts, ['multasantvehiculo', 'totalpendienteusd', 'valorpendiente']) || '0')
  const totalCitations = Number(pick(multaFacts, ['totalcitaciones', 'multastotal']) || 0)

  const citationMap = new Map<string, UnifiedReadableReport['pendingCitations'][number]>()
  for (const section of result.sections) {
    if (!section.id.includes('vehiculo') && !section.id.includes('multa')) continue
    for (const row of section.rows) {
      const facts = row.facts
      const number = pick(facts, ['ncitacion', 'citacion', 'citationnumber']) || ''
      if (!number || number.length < 4) continue
      const status = citationStatusEs(row.subtitle || pick(facts, ['estado', 'status', 'pagada']))
      const amount = pick(facts, ['valor', 'total', 'multa'])
      const motive = simplifyInfraction(pick(facts, ['articulo', 'infraccion', 'motivo']) || row.title)
      const pending = isPendingCitation(row.subtitle ?? null, amount)
      const current = citationMap.get(number)
      if (!current) {
        citationMap.set(number, {
          number,
          date: formatDate(pick(facts, ['fecha', 'issuedate'])),
          entity: cleanEntity(pick(facts, ['entidad', 'entity'])),
          amount: amount ? formatMoney(amount) : null,
          points: pick(facts, ['puntos', 'points']),
          motive,
          status,
          pending,
        })
      }
    }
  }
  const citations = [...citationMap.values()]
  const pendingCitations = citations.filter((row) => row.pending)
  const groups = new Map<string, { years: Set<string>; statuses: Set<string> }>()
  for (const row of citations) {
    const key = row.motive
    const group = groups.get(key) || { years: new Set<string>(), statuses: new Set<string>() }
    const year = yearOf(row.date)
    if (year) group.years.add(year)
    group.statuses.add(row.status)
    groups.set(key, group)
  }

  const personName = titleCaseEs(pick(personFacts, ['nombres', 'nombre', 'razonsocial']) || ownerEcuador?.name || result.identity.nombre || '')
  const activity = pick(personFacts, ['actividad', 'actividadeconomica'])

  const judicialRows = (juicios?.rows ?? []).map((row) => {
    const action = pick(row.facts, ['accion', 'tipoaccion']) || row.title
    return {
      id: pick(row.facts, ['idjuicio', 'causa', 'numero']) || row.title,
      action,
      date: formatDate(pick(row.facts, ['fecha'])),
      status: titleCaseEs(pick(row.facts, ['estado']) || row.subtitle || ''),
      role: titleCaseEs(pick(row.facts, ['rol']) || ''),
      plainAction: simplifyInfraction(action),
    }
  })
  const transit = judicialRows.filter((row) => /transito|velocidad|senal|traspaso|contravencion/i.test(norm(row.action + row.plainAction))).length

  const alerts: string[] = []
  if (conflict) {
    alerts.push('Advertencia: las fuentes no coinciden en el titular. Verificar el nombre del titular del vehículo.')
  }
  if (pendingCitations.length > 0) {
    const total = pendingCitations.reduce((sum, row) => sum + Number(String(row.amount || '').replace(/[^0-9,-]/g, '').replace(',', '.')), 0)
    alerts.push(`Citación pendiente: ${pendingAmount !== '$0,00' ? pendingAmount : pendingCitations[0]?.amount || formatMoney(total)}`)
  }

  const vehicle: UnifiedReadableReport['vehicle'] = [
    placa ? { label: 'Placa', value: placa } : null,
    marca ? { label: 'Marca', value: marca } : null,
    modelo ? { label: 'Modelo', value: modelo } : null,
    anio ? { label: 'Año', value: anio } : null,
    color ? { label: 'Color', value: color } : null,
    clase ? { label: 'Clase', value: clase } : null,
    uso ? { label: 'Uso', value: uso } : null,
    pais ? { label: 'País de origen', value: pais } : null,
    chasis ? { label: 'Chasis', value: chasis } : null,
    canton ? { label: 'Cantón registrado', value: canton } : null,
    ultimoAnio ? { label: 'Último año pagado', value: ultimoAnio } : null,
    fechaMatricula ? { label: 'Fecha de matriculación', value: fechaMatricula } : null,
    caducidad ? { label: 'Caducidad de matrícula', value: caducidad } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row))

  const person: UnifiedReadableReport['person'] = [
    personName ? { label: 'Nombre', value: personName } : null,
    pick(personFacts, ['dni', 'cedula']) || result.identity.cedula
      ? { label: 'Cédula', value: pick(personFacts, ['dni', 'cedula']) || result.identity.cedula || '' }
      : null,
    pick(personFacts, ['ruc']) || result.identity.ruc
      ? { label: 'RUC', value: pick(personFacts, ['ruc']) || result.identity.ruc || '' }
      : null,
    pick(personFacts, ['tipo']) ? { label: 'Tipo', value: titleCaseEs(pick(personFacts, ['tipo']) || '') } : null,
    pick(personFacts, ['estado']) ? { label: 'Estado del RUC', value: titleCaseEs(pick(personFacts, ['estado']) || '') } : null,
    pick(personFacts, ['nombrecomercial']) ? { label: 'Nombre comercial', value: titleCaseEs(pick(personFacts, ['nombrecomercial']) || '') } : null,
    pick(personFacts, ['estadoestablecimiento']) ? { label: 'Establecimiento', value: titleCaseEs(pick(personFacts, ['estadoestablecimiento']) || '') } : null,
    pick(personFacts, ['regimen']) ? { label: 'Régimen', value: titleCaseEs(pick(personFacts, ['regimen']) || '') } : null,
    pick(personFacts, ['fechanacim', 'fechanacimiento'])
      ? { label: 'Fecha de nacimiento', value: formatDate(pick(personFacts, ['fechanacim', 'fechanacimiento'])) || '' }
      : null,
    pick(personFacts, ['direccion']) ? { label: 'Dirección', value: titleCaseEs(pick(personFacts, ['direccion']) || '') } : null,
    pick(personFacts, ['obligadocontabilidad']) ? { label: 'Obligada a llevar contabilidad', value: titleCaseEs(pick(personFacts, ['obligadocontabilidad']) || '') } : null,
    pick(personFacts, ['agenteretencion']) ? { label: 'Agente de retención', value: titleCaseEs(pick(personFacts, ['agenteretencion']) || '') } : null,
    pick(personFacts, ['contribuyenteespecial']) ? { label: 'Contribuyente especial', value: titleCaseEs(pick(personFacts, ['contribuyenteespecial']) || '') } : null,
    pick(personFacts, ['contribuyentefantasma']) ? { label: 'Contribuyente fantasma', value: titleCaseEs(pick(personFacts, ['contribuyentefantasma']) || '') } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row && row.value))

  const kindLabel =
    result.kind === 'placa' ? 'Placa' : result.kind === 'cedula' ? 'Cédula' : result.kind === 'ruc' ? 'RUC' : 'Nombre'

  return {
    title: `Resumen de consulta — ${kindLabel} ${result.query}`,
    kind: result.kind,
    vehicle,
    owners: {
      conflict,
      ecuador: ownerEcuador,
      consultas: conflict ? ownerConsultas : ownerConsultas && !ownerEcuador ? ownerConsultas : null,
      note: conflict ? 'Verificar el nombre del titular del vehículo.' : null,
    },
    debts: {
      sri,
      pendingFinesCount: pendingCitations.length || pendingCount,
      pendingAmount,
      totalCitations: citations.length || totalCitations,
    },
    pendingCitations,
    infractionHistory: [...groups.entries()].map(([label, group]) => ({
      label,
      years: [...group.years].sort(),
      statuses: [...group.statuses],
    })),
    person,
    activity: activity ? activity.replace(/\s+/g, ' ').trim() : null,
    judicial: {
      consulted: Boolean(juicios),
      total: judicialRows.length,
      roleNote:
        judicialRows.length > 0
          ? 'La fuente indica el tipo de proceso y el rol (p. ej. actor). Eso no permite concluir que la persona haya cometido la infracción.'
          : 'Sin procesos en Función Judicial.',
      transit,
      other: judicialRows,
      years: [...new Set(judicialRows.map((row) => yearOf(row.date)).filter(Boolean))].join(', '),
    },
    alerts,
    ksi: result.kind === 'placa' ? result.ksi : [],
    manualReview: conflict
      ? {
          required: true,
          title: 'Advertencia',
          steps: ['Verificar el nombre del titular del vehículo.'],
        }
      : null,
    ai: null,
  }
}
