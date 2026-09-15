export type EmovSnapshot = {
  jobId?: string
  estado: 'pendiente' | 'en_proceso' | 'esperando_intervencion' | 'completada' | 'error'
  actualizadoEn: string
  total: number | null
  conceptos: { concepto: string; total: number }[]
  error?: string | null
}

export function emovActive(emov?: EmovSnapshot | null): boolean {
  return !!emov && ['pendiente', 'en_proceso', 'esperando_intervencion'].includes(emov.estado)
}

export function emovText(emov?: EmovSnapshot | null): string {
  if (!emov) return 'EMOV: sin consultar'
  if (emov.estado === 'error') return `EMOV: ${emov.error || 'consulta no disponible'}`
  if (emov.estado === 'esperando_intervencion') return 'EMOV: esperando intervención del operador'
  if (emovActive(emov)) return 'EMOV: consulta en proceso'
  if (emov.total === null) return 'EMOV: total no disponible'
  return `EMOV: ${emov.total === 0 ? 'sin valores pendientes' : `$${emov.total.toFixed(2)}`}\n${emov.conceptos.map(c => `${c.concepto}: $${c.total.toFixed(2)}`).join('\n')}`
}

/** Validate the plate and amounts before attaching remote data to a vehicle. */
export function emovResult(raw: unknown, plate: string, jobId: string): EmovSnapshot {
  const result = raw as { generado_en?: string; consulta?: { valor?: string; sin_deudas?: boolean; total_a_pagar?: number; deudas?: { concepto: string; total: number }[] } }
  const c = result?.consulta
  const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!c || normalize(c.valor || '') !== normalize(plate)) throw new Error('EMOV devolvió una placa diferente.')
  const total = c.total_a_pagar ?? (c.sin_deudas === true ? 0 : null)
  if (total === null || !Number.isFinite(total) || total < 0) throw new Error('EMOV no devolvió un total válido.')
  if (c.sin_deudas === true && total !== 0) throw new Error('EMOV devolvió valores inconsistentes.')
  const conceptos = Array.isArray(c.deudas) ? c.deudas.filter(d => typeof d.concepto === 'string' && Number.isFinite(d.total) && d.total >= 0) : []
  return { jobId, estado: 'completada', actualizadoEn: result.generado_en || new Date().toISOString(), total, conceptos }
}
