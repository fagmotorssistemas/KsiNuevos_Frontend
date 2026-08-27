'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileText, Loader2, Printer, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  buildContrastMatrix,
  contrastShowAmt,
  contrasteEstadoLabel,
  contrasteEstadoMessage,
  citationAmountClass,
  citationHistorySectionTitle,
  citationStatusCardClass,
  citationStatusClass,
  citationStatusLabel,
  citationsFromPayload,
  formatContrasteConsultedPretty,
  groupItemsByCitationStatus,
  sriRubros,
  summarizeMatrix,
  type ContrastResultKind,
  type ContrastStaffTone,
  type EcuadorContrastePayload,
} from '@/lib/inventario/ecuadorContraste'
import { docCatalogByType, VEHICLE_DOCUMENT_CATALOG } from '@/lib/inventario/vehicleDocumentCatalog'
import { getCatalogDocumentRow, getDocumentCheckStatus, statusLabel } from '@/lib/inventario/vehicleLegalUi'
import { listContrasteConsultas, payloadFromConsulta } from '@/services/contrasteConsultas.service'
import type { VehiculoInventario } from '@/types/inventario.types'
import type { VehicleLegalDossier } from '@/types/vehicleLegal.types'

type Props = {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
  onClose: () => void
}

function usd(n: number | null | undefined): string {
  return `$${(n ?? 0).toFixed(2)}`
}

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  const text = value == null || String(value).trim() === '' ? '—' : String(value)
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5 break-words">{text}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h4 className="text-sm font-bold text-slate-900 mb-3">{title}</h4>
      {children}
    </section>
  )
}

function checklistLabel(status: ContrastStaffTone, extra?: string | null): string {
  if (status === 'na') return '—'
  if (status === 'ok') return extra ? `Sí · ${extra}` : 'Sí / al día'
  if (status === 'warn') return extra ? `Pendiente · ${extra}` : 'Pendiente'
  return extra ? `No · ${extra}` : 'No / no revisado'
}

function matrixCellClass(kind: ContrastResultKind): string {
  if (kind === 'ok') return 'text-emerald-700'
  if (kind === 'missing') return 'text-red-700 font-semibold'
  if (kind === 'warn') return 'text-amber-700'
  return 'text-slate-400'
}

function resultadoBadgeClass(kind: ContrastResultKind): string {
  if (kind === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (kind === 'missing') return 'bg-red-50 text-red-700 border-red-200'
  if (kind === 'warn') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-slate-50 text-slate-500 border-slate-200'
}

function estadoBadgeClass(estado: string): string {
  if (estado === 'revision_requerida') return 'bg-red-50 text-red-700 border-red-200'
  if (estado === 'alineado') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

export function VehicleCompleteReportModal({ vehiculo, dossier, onClose }: Props) {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<EcuadorContrastePayload | null>(null)
  const [consultedAt, setConsultedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listContrasteConsultas(supabase, vehiculo.placa)
      .then((rows) => {
        if (cancelled) return
        const latest = rows[0]
        if (!latest) return
        const saved = payloadFromConsulta(latest)
        if (saved) {
          setPayload(saved)
          setConsultedAt(latest.created_at)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [supabase, vehiculo.placa])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const citations = useMemo(() => citationsFromPayload(payload), [payload])
  const citationGroups = useMemo(() => groupItemsByCitationStatus(citations), [citations])
  const sri = payload?.sri ? sriRubros(payload.sri) : null
  const lookup = payload?.lookup
  const hasFullHistory = payload?.citations != null

  const staffFinesByStatus = useMemo(() => {
    const map = new Map<string, typeof dossier.fines>()
    for (const fine of dossier.fines) {
      const list = map.get(fine.status) ?? []
      list.push(fine)
      map.set(fine.status, list)
    }
    return [...map.entries()]
  }, [dossier.fines])

  const linked = Boolean(dossier.inventoryoracleId)
  const matrix = useMemo(() => {
    const byType = new Map(dossier.documents.map((d) => [d.doc_type, d]))
    const pendingFines = dossier.fines.filter((f) => f.status === 'pendiente').length
    const staff = {
      matricula: { text: '—', status: 'na' as ContrastStaffTone },
      revision_tecnica: { text: '—', status: 'na' as ContrastStaffTone },
      ant: { text: '—', status: 'na' as ContrastStaffTone },
    }
    for (const key of ['matricula', 'revision_tecnica'] as const) {
      const catalog = docCatalogByType(key)
      const doc = getCatalogDocumentRow(byType, key)
      const status = linked && catalog ? getDocumentCheckStatus(doc, catalog) : 'na'
      const extra =
        key === 'matricula' && doc?.expires_at
          ? doc.expires_at
          : doc
            ? statusLabel(doc.status)
            : null
      staff[key] = { text: checklistLabel(status, extra), status }
    }
    const informeCatalog = docCatalogByType('informe_ant_siat')
    const informeDoc = getCatalogDocumentRow(byType, 'informe_ant_siat')
    const informeStatus = linked && informeCatalog ? getDocumentCheckStatus(informeDoc, informeCatalog) : 'na'
    staff.ant = {
      text: `Informe ${checklistLabel(informeStatus, informeDoc ? statusLabel(informeDoc.status) : null)} · ${
        pendingFines > 0
          ? `${pendingFines} multa${pendingFines === 1 ? '' : 's'} interna${pendingFines === 1 ? '' : 's'} por pagar`
          : dossier.fines.length > 0
            ? 'internas al día'
            : 'sin pendientes internas'
      }`,
      status: !linked ? 'na' : pendingFines > 0 ? 'missing' : 'ok',
    }
    return buildContrastMatrix(payload, staff)
  }, [dossier.documents, dossier.fines, linked, payload])

  const showAmt = contrastShowAmt(payload)
  const contrastSummary = useMemo(() => summarizeMatrix(matrix, showAmt), [matrix, showAmt])
  const differenceLabels = matrix.filter((row) => row.resultado.kind === 'missing').map((row) => row.label)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:static print:bg-white print:p-0" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="informe-completo-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col print:shadow-none print:max-h-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0 print:border-b">
          <div>
            <p id="informe-completo-title" className="text-lg font-bold text-slate-900">
              Informe completo
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {vehiculo.marca} {vehiculo.modelo} · {vehiculo.placa}
              {consultedAt ? ` · consulta oficial ${formatContrasteConsultedPretty(consultedAt)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full" aria-label="Cerrar informe">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-6 print:overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Cargando informe…
            </div>
          ) : (
            <>
              <Section title="Ficha del vehículo">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Fact label="Marca" value={vehiculo.marca} />
                  <Fact label="Modelo" value={vehiculo.modelo} />
                  <Fact label="Año" value={vehiculo.anioModelo} />
                  <Fact label="Placa" value={vehiculo.placa} />
                  <Fact label="Color" value={vehiculo.color} />
                  <Fact label="Tipo" value={vehiculo.tipo} />
                  <Fact label="Motor" value={vehiculo.motor} />
                  <Fact label="Chasis" value={vehiculo.chasis} />
                  <Fact label="Cilindraje" value={vehiculo.cilindraje} />
                  <Fact label="Combustible" value={vehiculo.combustible} />
                  <Fact label="País origen" value={vehiculo.paisOrigen} />
                  <Fact label="Año matrícula" value={vehiculo.anioMatricula} />
                  <Fact label="Lugar matrícula" value={vehiculo.lugarMatricula} />
                  <Fact label="Proveedor" value={vehiculo.proveedor} />
                  <Fact label="Kilometraje" value={vehiculo.mileage} />
                </div>
                {vehiculo.descripcion ? <p className="text-sm text-slate-600 mt-3">{vehiculo.descripcion}</p> : null}
              </Section>

              <Section title="Consulta oficial">
                {payload ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Fact label="Propietario SRI/ANT" value={lookup?.ownerName} />
                    <Fact label="Cantón" value={lookup?.canton} />
                    <Fact label="Último año pagado" value={lookup?.lastPaidYear} />
                    <Fact label="Última matrícula" value={lookup?.lastRegistrationDate} />
                    <Fact label="Vigente hasta" value={lookup?.registrationExpiry} />
                    <Fact label="Marca/modelo oficial" value={payload.vehicleLabel} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Aún no hay consulta oficial. Usa Consultar nuevamente en Contraste oficial (~$0.03) para incluir SRI y el historial ANT.
                  </p>
                )}
              </Section>

              <Section title="Valores SRI">
                {sri ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Fact label="Matrícula" value={usd(sri.matricula)} />
                    <Fact label="Transferencia" value={usd(sri.transferencia)} />
                    <Fact label="Revisión" value={usd(sri.revision)} />
                    <Fact label="Total" value={usd(sri.total)} />
                    {sri.otros.map((o) => (
                      <Fact key={o.label} label={o.label} value={usd(o.amount)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin datos SRI en la última consulta.</p>
                )}
              </Section>

              <Section title="Multas ANT">
                {!payload ? (
                  <p className="text-sm text-slate-500">Sin consulta oficial.</p>
                ) : citations.length === 0 ? (
                  <p className="text-sm text-emerald-700 font-medium">No hay citaciones en el historial consultado.</p>
                ) : (
                  <div className="space-y-4">
                    {!hasFullHistory ? (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        Esta consulta antigua solo guardó pendientes. Vuelve a Consultar nuevamente para ver pagadas, impugnadas y anuladas (mismo costo, cambia ANT por el historial completo).
                      </p>
                    ) : null}
                    {citationGroups.map((group) => (
                      <div key={group.status}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h5 className="text-sm font-bold text-slate-900">{citationHistorySectionTitle(group.status)}</h5>
                          <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${citationStatusClass(group.status)}`}>
                            {citationStatusLabel(group.status)} · {group.items.length}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {group.items.map((c, i) => (
                            <li key={`${c.citationNumber || c.id}-${i}`} className={`rounded-xl border px-4 py-3 ${citationStatusCardClass(c.status)}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900">{c.infraction || c.article || 'Citación'}</p>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    {[
                                      c.entity,
                                      c.citationNumber ? `N.º ${c.citationNumber}` : null,
                                      c.issueDate ? `emitida ${c.issueDate}` : null,
                                      c.notificationDate ? `notificada ${c.notificationDate}` : null,
                                      c.paymentDeadline ? `vence ${c.paymentDeadline}` : null,
                                      c.points != null ? `${c.points} pts` : null,
                                      c.article,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                                <p className={`text-sm font-bold whitespace-nowrap ${citationAmountClass(c.status)}`}>
                                  {usd(c.total ?? c.fine)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {dossier.fines.length > 0 ? (
                <Section title="Multas registradas internamente">
                  <div className="space-y-3">
                    {staffFinesByStatus.map(([status, items]) => (
                      <div key={status}>
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          {statusLabel(status)} · {items.length}
                        </p>
                        <ul className="space-y-2">
                          {items.map((fine) => (
                            <li key={fine.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                              <div className="flex justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{fine.title}</p>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    {[fine.fine_date, fine.location, fine.payer_notes].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                                <p className="font-bold">{usd(fine.amount)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Documentos del encargado">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {VEHICLE_DOCUMENT_CATALOG.map((item) => {
                    const doc = dossier.documents.find((d) => d.doc_type === item.docType)
                    return (
                      <div key={item.docType} className="rounded-xl border border-slate-200 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doc ? statusLabel(doc.status) : 'Sin registro'}
                          {doc?.expires_at ? ` · vence ${doc.expires_at}` : ''}
                          {doc?.file_name ? ` · ${doc.file_name}` : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Section>

              {dossier.owners.length > 0 ? (
                <Section title="Propietarios internos">
                  <ul className="space-y-1 text-sm">
                    {dossier.owners.map((o) => (
                      <li key={o.id} className="text-slate-700">
                        {o.owner_name}
                        {o.id_number ? ` · ${o.id_number}` : ''}
                        {o.is_current ? ' · actual' : ''}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {dossier.notes.length > 0 ? (
                <Section title="Notas internas">
                  <ul className="space-y-2">
                    {dossier.notes.map((n) => (
                      <li key={n.id} className="text-sm text-slate-700">
                        <span className="font-semibold">{n.author_name}: </span>
                        {n.note_text}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section title="Fuentes consultadas">
                {!payload ? (
                  <p className="text-sm text-slate-500">
                    Sin consulta oficial. La tabla se completa al consultar en Contraste oficial.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2.5">Dato</th>
                          <th className="px-3 py-2.5">Encargado</th>
                          <th className="px-3 py-2.5">SRI</th>
                          <th className="px-3 py-2.5">ANT</th>
                          {showAmt ? <th className="px-3 py-2.5">AMT</th> : null}
                          <th className="px-3 py-2.5">Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.map((row) => (
                          <tr key={row.key} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{row.label}</td>
                            <td className="px-3 py-2.5 text-slate-600">{row.encargado}</td>
                            <td className={`px-3 py-2.5 ${matrixCellClass(row.sri.kind)}`}>{row.sri.text}</td>
                            <td className={`px-3 py-2.5 ${matrixCellClass(row.ant.kind)}`}>{row.ant.text}</td>
                            {showAmt ? (
                              <td className={`px-3 py-2.5 ${matrixCellClass(row.amt.kind)}`}>{row.amt.text}</td>
                            ) : null}
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold ${resultadoBadgeClass(row.resultado.kind)}`}>
                                {row.resultado.text}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section title="Resumen del contraste">
                {!payload ? (
                  <p className="text-sm text-slate-500">Aún no hay datos oficiales para resumir el contraste.</p>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {contrastSummary.coinciden} coinciden
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        {contrastSummary.diferencias} diferencia{contrastSummary.diferencias === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-600 border border-slate-200">
                        {contrastSummary.sinVerificar} sin verificar
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${estadoBadgeClass(contrastSummary.estadoGeneral)}`}>
                        {contrasteEstadoLabel(contrastSummary.estadoGeneral)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{contrasteEstadoMessage(contrastSummary.estadoGeneral)}</p>
                    {differenceLabels.length > 0 ? (
                      <p className="text-sm text-slate-600">
                        Revisar: <span className="font-semibold text-slate-900">{differenceLabels.join(', ')}</span>.
                      </p>
                    ) : contrastSummary.coinciden > 0 ? (
                      <p className="text-sm text-emerald-800">No hay diferencias pendientes de revisión en esta consulta.</p>
                    ) : null}
                    {sri && sri.total > 0 ? (
                      <p className="text-sm font-semibold text-red-700">SRI · total pendiente {usd(sri.total)}.</p>
                    ) : null}
                    {consultedAt ? (
                      <p className="text-[11px] text-slate-500">
                        Consulta oficial del {formatContrasteConsultedPretty(consultedAt)}.
                      </p>
                    ) : null}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function VehicleCompleteReportButton({
  vehiculo,
  dossier,
}: {
  vehiculo: VehiculoInventario
  dossier: VehicleLegalDossier
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-slate-800 text-sm font-semibold text-white hover:bg-slate-900"
      >
        <FileText className="h-5 w-5" />
        Informe completo
      </button>
      {open ? <VehicleCompleteReportModal vehiculo={vehiculo} dossier={dossier} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
