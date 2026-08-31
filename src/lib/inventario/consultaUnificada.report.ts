import type {
  ReportCitation,
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
  if (n.includes('cint') && (n.includes('seg') || n.includes('exija') || n.includes('exigi'))) {
    return 'Conducir sin cinturón de seguridad o no exigir su uso a pasajeros y acompañantes'
  }
  if (n.includes('estacione') && n.includes('prohibid')) {
    return 'Estacionar en sitios prohibidos por la ley y el reglamento'
  }
  if (n.includes('exceda') || n.includes('velocidad') || ((n.includes('lit06') || n.includes('lit6')) && n.includes('391'))) {
    return 'Exceso de velocidad dentro del rango moderado permitido'
  }
  if ((n.includes('desobedezca') || n.includes('senal') || n.includes('senal')) && (n.includes('ord') || n.includes('transito'))) {
    return 'Incumplir órdenes o señales de los agentes o de la señalización de tránsito'
  }
  if (n.includes('maltrato') || n.includes('mascota') || n.includes('animal')) {
    return 'Maltrato o muerte de mascotas o animales de compañía'
  }
  if (n.includes('contravencion') && n.includes('transito')) return 'Contravención de tránsito'
  return expandInfractionAbbreviations(raw)
}

function expandInfractionAbbreviations(text: string): string {
  const cleaned = text.replace(/^art\.?\s*\d+\s*-?\s*lit\.?\s*\d+\.?\s*/i, '').trim()
  const expanded = cleaned
    .replace(/\bCINT\.?\s*DE\.?\s*SEG\.?/gi, 'cinturón de seguridad')
    .replace(/\bNO EXIJA EL USO\b/gi, 'no exigir el uso')
    .replace(/\bUSUARIOS\/ACOMPAÑA\w*/gi, 'usuarios o acompañantes')
    .replace(/\bESTACIONE\b/gi, 'estacionar')
    .replace(/\bREGLAM\.?\b/gi, 'reglamento')
    .replace(/\bCOND\.?\s*SIN\b/gi, 'conducir sin')
    .replace(/\bCOND\.?\s+/gi, 'conductor: ')
    .replace(/\bArt\.?\s*/gi, 'Artículo ')
    .replace(/\bLit\.?\s*/gi, 'literal ')
    .replace(/\s+/g, ' ')
    .trim()
  return titleCaseEs(expanded)
}

function cleanEntity(value: string | null): string {
  if (!value) return '—'
  const raw = value.trim()
  const key = norm(raw)
  if (key === 'gadcte' || key.startsWith('gadcte')) return 'Comisión de Tránsito del Ecuador'
  if (key.includes('emov') || key.includes('misicata')) return 'EMOV EP (Cuenca)'
  if (key.includes('loj') && key.includes('loja')) return 'GAD Municipal de Loja'
  if (key.includes('dur') && key.includes('duran')) return 'GAD Municipal de Durán'
  if (key.includes('amt') && key.includes('quito')) return 'AMT Quito'
  if (key.includes('policianacional') || key.startsWith('polpol')) return 'Policía Nacional del Ecuador'
  return titleCaseEs(
    raw
      .replace(/^MIS-MISICATA\s+/i, '')
      .replace(/^GAD-CTE$/i, 'Comisión de Tránsito del Ecuador')
      .replace(/^ATM-/, 'AMT ')
      .replace(/^LOJ-GAD\s*/i, 'GAD Municipal de ')
      .replace(/^GAD-/, 'GAD ')
  )
}

function yearOf(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/(19|20)\d{2}/)
  return match ? match[0] : null
}

function isClosedCitationStatus(status: string | null): boolean {
  const key = (status || '').toLowerCase()
  return (
    key === 'paid' ||
    key === 'pagada' ||
    key === 'sí' ||
    key === 'si' ||
    key === 'appealed' ||
    key === 'impugnada' ||
    key === 'annulled' ||
    key === 'anulada' ||
    key === 'agreement' ||
    key === 'convenio'
  )
}

function isPendingCitation(status: string | null, amount: string | null): boolean {
  if (isClosedCitationStatus(status)) return false
  const key = (status || '').toLowerCase()
  if (key === 'pending' || key === 'pendiente' || key.includes('pendiente de pago')) return true
  const num = Number(String(amount || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(num) && num > 0.009
}

function normPlate(value: string | null | undefined): string | null {
  const n = (value || '').replace(/[\s-]/g, '').toUpperCase()
  return n || null
}

function sectionCitationScope(id: string): 'vehicle' | 'owner' | null {
  if (id.includes('multas-persona') || id.includes('persona') || id.includes('licencia') || id.includes('puntos')) {
    return 'owner'
  }
  if (id.includes('vehiculo') || id.includes('multa')) return 'vehicle'
  return null
}

function moneySum(rows: ReportCitation[]): number {
  return rows.reduce((sum, row) => {
    const num = Number(String(row.amount || '').replace(/[^0-9,-]/g, '').replace(',', '.'))
    return sum + (Number.isFinite(num) ? num : 0)
  }, 0)
}

function historyFromCitations(rows: ReportCitation[]) {
  const groups = new Map<string, { years: Set<string>; statuses: Set<string> }>()
  for (const row of rows) {
    const group = groups.get(row.motive) || { years: new Set<string>(), statuses: new Set<string>() }
    const year = yearOf(row.date)
    if (year) group.years.add(year)
    group.statuses.add(row.status)
    groups.set(row.motive, group)
  }
  return [...groups.entries()].map(([label, group]) => ({
    label,
    years: [...group.years].sort(),
    statuses: [...group.statuses],
  }))
}

function samePerson(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return norm(a) === norm(b)
}

export function buildReadableReport(result: UnifiedConsultaResult): UnifiedReadableReport {
  const vehicleFacts = allFacts(result.sections, (id) => id.includes('vehiculo') || id === 'ecuador-vehiculo')
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
  const queriedPlate = normPlate(placa)

  const vehicleCitationMap = new Map<string, ReportCitation>()
  const ownerCitationMap = new Map<string, ReportCitation>()
  for (const section of result.sections) {
    const scope = sectionCitationScope(section.id)
    if (!scope) continue
    for (const row of section.rows) {
      const facts = row.facts
      const number = pick(facts, ['ncitacion', 'citacion', 'citationnumber']) || ''
      if (!number || number.length < 4) continue
      const statusRaw = row.subtitle || pick(facts, ['estado', 'status', 'pagada'])
      const status = citationStatusEs(statusRaw)
      const amount = pick(facts, ['valor', 'total', 'multa'])
      const motive = simplifyInfraction(pick(facts, ['articulo', 'infraccion', 'motivo']) || row.title)
      const citationPlate = normPlate(pick(facts, ['placa', 'plate', 'placadelvehiculo']))
      const otherVehicle = Boolean(
        scope === 'owner' && queriedPlate && (!citationPlate || citationPlate !== queriedPlate)
      )
      const item: ReportCitation = {
        number,
        date: formatDate(pick(facts, ['fecha', 'issuedate'])),
        entity: cleanEntity(pick(facts, ['entidad', 'entity'])),
        amount: amount ? formatMoney(amount) : null,
        points: pick(facts, ['puntos', 'points']),
        motive,
        status,
        pending: isPendingCitation(statusRaw, amount),
        plate: citationPlate,
        scope,
        otherVehicle,
      }
      if (scope === 'vehicle') {
        if (!vehicleCitationMap.has(number)) vehicleCitationMap.set(number, item)
      } else if (!vehicleCitationMap.has(number) && !ownerCitationMap.has(number)) {
        ownerCitationMap.set(number, item)
      }
    }
  }
  const vehicleCitations = [...vehicleCitationMap.values()]
  const ownerCitations = [...ownerCitationMap.values()]
  const pendingCitations = vehicleCitations.filter((row) => row.pending)
  const ownerPendingCitations = ownerCitations.filter((row) => row.pending)
  const vehiclePendingAmount = pendingCitations.length ? formatMoney(moneySum(pendingCitations)) : formatMoney(pick(vehicleFacts, ['multasantvehiculo', 'totalpendienteusd', 'valorpendiente']) || '0')
  const ownerPendingAmount = ownerPendingCitations.length ? formatMoney(moneySum(ownerPendingCitations)) : '$0,00'

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
    alerts.push(
      `Esta placa tiene ${pendingCitations.length} citación${pendingCitations.length === 1 ? '' : 'es'} pendiente${pendingCitations.length === 1 ? '' : 's'}: ${vehiclePendingAmount}.`
    )
  }
  if (ownerPendingCitations.length > 0) {
    const otherPlates = [...new Set(ownerPendingCitations.map((row) => row.plate).filter(Boolean))]
    const plateNote = otherPlates.length
      ? ` Placa${otherPlates.length === 1 ? '' : 's'}: ${otherPlates.join(', ')}.`
      : queriedPlate
        ? ' No corresponde a esta placa.'
        : ''
    alerts.push(
      `El propietario tiene ${ownerPendingCitations.length} citación${ownerPendingCitations.length === 1 ? '' : 'es'} pendiente${ownerPendingCitations.length === 1 ? '' : 's'} de otro vehículo (${ownerPendingAmount}).${plateNote}`
    )
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
      pendingFinesCount: pendingCitations.length,
      pendingAmount: vehiclePendingAmount,
      totalCitations: vehicleCitations.length,
    },
    ownerDebts: {
      pendingFinesCount: ownerPendingCitations.length,
      pendingAmount: ownerPendingAmount,
      totalCitations: ownerCitations.length,
    },
    pendingCitations,
    ownerPendingCitations,
    infractionHistory: historyFromCitations(vehicleCitations),
    ownerInfractionHistory: historyFromCitations(ownerCitations),
    vehicleCitationHistory: vehicleCitations,
    ownerCitationHistory: ownerCitations,
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
    sourcesNote:
      result.kind === 'placa'
        ? {
            title: 'Aviso importante sobre las fuentes',
            body: 'Esta consulta de placa usa únicamente SRI y ANT. Si el vehículo está matriculado en Quito, también AMT Quito. No se consulta EMOV, CTE ni otros GADs de tránsito; esas deudas no aparecen aquí.',
          }
        : null,
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
