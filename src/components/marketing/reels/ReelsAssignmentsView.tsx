'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, MessageSquareText, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { reelsService } from '@/services/reels.service'
import {
  findReelScriptForAssignment,
  getReelAssigneeLabel,
  isReelMarketingFormato,
  type ReelAssignmentRow,
  type ReelScript,
} from '@/types/reel'
import { ReelAssignmentStatusBadge, ReelFormatoBadge } from './reel-badges'
import { ReelScriptDetail } from './ReelScriptDetail'
import { ReelVehicleSummary } from './ReelVehicleSummary'

export function ReelsAssignmentsView({
  fecha,
  assignments,
  loading,
  onSwitchToVendorTab,
  onRefresh,
  selectedId,
  onSelect,
  listTitle,
  listSubtitle,
  expectedCount,
}: {
  fecha: string
  assignments: ReelAssignmentRow[]
  loading: boolean
  onSwitchToVendorTab?: (vendedorId: string) => void
  onRefresh?: () => void
  selectedId: string | null
  onSelect: (assignmentId: string | null) => void
  listTitle?: string
  listSubtitle?: string
  expectedCount?: number
}) {
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [scriptsByAssignment, setScriptsByAssignment] = useState<Record<string, ReelScript>>({})
  const [loadingScriptId, setLoadingScriptId] = useState<string | null>(null)
  const [scriptLoadFailedIds, setScriptLoadFailedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setScriptsByAssignment({})
    setScriptLoadFailedIds({})
    const stillValid = selectedId != null && assignments.some((a) => a.assignment_id === selectedId)
    if (!stillValid) {
      onSelect(assignments[0]?.assignment_id ?? null)
    }
    // Solo cuando cambia el set de asignaciones (recarga del día); no en cada cambio de selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments])

  const groups = useMemo(() => {
    // Ficha/Duelo/Financiamiento: todos son "Marketing" → lista plana por auto.
    // POV/Detrás: agrupar por Vanessa / Felipe / Xavier.
    const allMarketing =
      assignments.length > 0 && assignments.every((a) => isReelMarketingFormato(a.formato))
    if (allMarketing) {
      return [{ vendedorNombre: null as string | null, items: assignments }]
    }
    const map = new Map<string, ReelAssignmentRow[]>()
    for (const r of assignments) {
      const name = getReelAssigneeLabel(r)
      map.set(name, [...(map.get(name) ?? []), r])
    }
    return Array.from(map.entries()).map(([vendedorNombre, items]) => ({
      vendedorNombre,
      items,
    }))
  }, [assignments])

  const selected = assignments.find((a) => a.assignment_id === selectedId) ?? null
  const selectedScript = selectedId ? scriptsByAssignment[selectedId] : null

  // Cuando un assignment ya tiene guion generado, lo busca en by-vendor.
  // Sin filtro de fecha (ese filtro a menudo devuelve []) y prueba también
  // el vendedor secundario (a veces el guion quedó indexado ahí).
  useEffect(() => {
    if (!selected) return
    if (selected.status !== 'guion_generado') return
    if (scriptsByAssignment[selected.assignment_id]) return
    if (scriptLoadFailedIds[selected.assignment_id]) return

    let cancelled = false
    const assignment = selected
  // Solo el vendedor que sale (Vanessa/Felipe/Xavier). La cámara es Marketing
  // y ya no se usa otro vendedor como secundario para buscar el guion.
  const vendorIds = [assignment.vendedor_id].filter(Boolean)

    setLoadingScriptId(assignment.assignment_id)

    ;(async () => {
      try {
        for (const vendorId of vendorIds) {
          if (cancelled) return
          const scripts = await reelsService.getByVendor(vendorId, {
            formato: assignment.formato,
          })
          const match = findReelScriptForAssignment(scripts, assignment)
          if (match) {
            if (!cancelled) {
              setScriptsByAssignment((prev) => ({
                ...prev,
                [assignment.assignment_id]: match,
              }))
            }
            return
          }
        }
        if (!cancelled) {
          setScriptLoadFailedIds((prev) => ({ ...prev, [assignment.assignment_id]: true }))
        }
      } catch {
        if (!cancelled) {
          setScriptLoadFailedIds((prev) => ({ ...prev, [assignment.assignment_id]: true }))
        }
      } finally {
        if (!cancelled) setLoadingScriptId(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selected, scriptsByAssignment, scriptLoadFailedIds])

  const handleGenerate = async (assignmentId: string) => {
    setGeneratingId(assignmentId)
    try {
      const res = await reelsService.generateAssignment(assignmentId)
      if (res.script) {
        setScriptsByAssignment((prev) => ({ ...prev, [assignmentId]: res.script! }))
        toast.success('Guión generado')
      } else {
        toast.message(res.detail || 'No se generó ningún guión')
      }
      onRefresh?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar guión')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleScriptUpdated = (assignmentId: string, script: ReelScript) => {
    setScriptsByAssignment((prev) => ({ ...prev, [assignmentId]: script }))
  }

  if (assignments.length === 0 && !loading) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-10 text-sm text-slate-500">
        {listTitle
          ? `Aún no hay autos asignados para ${listTitle} el ${fecha}.`
          : `No hay asignaciones de reels para el ${fecha}.`}
        {expectedCount != null && expectedCount > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Según el cronograma corresponden {expectedCount}. Usa &quot;Completar&quot; arriba.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[520px]">
      <aside className="lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-indigo-50/40">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-500">
            {listTitle ?? 'Asignaciones'}
          </p>
          <p className="text-sm font-bold text-slate-800 mt-1 leading-snug">
            {listSubtitle ?? fecha}
          </p>
          {expectedCount != null && (
            <p className="text-[11px] text-slate-400 mt-1">
              {assignments.length} de {expectedCount} · {fecha}
            </p>
          )}
        </div>
        <div className="p-2.5 space-y-3 overflow-y-auto max-h-[70vh]">
          {groups.map((g) => (
            <div key={g.vendedorNombre ?? 'marketing'}>
              {g.vendedorNombre && (
                <p className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  {g.vendedorNombre}
                </p>
              )}
              <ul className={`space-y-1.5 ${g.vendedorNombre ? 'mt-1' : ''}`}>
                {g.items.map((a) => {
                  const active = a.assignment_id === selectedId
                  const hasScript = Boolean(scriptsByAssignment[a.assignment_id])
                  return (
                    <li key={a.assignment_id}>
                      <button
                        type="button"
                        onClick={() => onSelect(a.assignment_id)}
                        className={[
                          'w-full text-left rounded-2xl px-3.5 py-3 border transition-all',
                          active
                            ? 'border-indigo-300 bg-white shadow-[0_0_0_3px_rgba(99,102,241,0.15)] ring-1 ring-indigo-100'
                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <ReelVehicleSummary
                          vehicle={a.vehicle_data}
                          vehicle2={a.vehicle_data_2}
                          fallbackLabel={a.vehicle_id}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          <ReelFormatoBadge formato={a.formato} variante={a.variante} />
                          <ReelAssignmentStatusBadge status={a.status} />
                          {hasScript && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                              Listo
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
            <MessageSquareText className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Elige un auto para ver el guión</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <ReelVehicleSummary
                vehicle={selected.vehicle_data}
                vehicle2={selected.vehicle_data_2}
                fallbackLabel={selected.vehicle_id}
                size="lg"
              />
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <ReelFormatoBadge formato={selected.formato} variante={selected.variante} />
                <ReelAssignmentStatusBadge status={selected.status} />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {getReelAssigneeLabel(selected)}
            </p>

            {selectedScript ? (
              <ReelScriptDetail
                script={selectedScript}
                onUpdated={(script) => handleScriptUpdated(selected.assignment_id, script)}
              />
            ) : selected.status === 'guion_generado' && loadingScriptId === selected.assignment_id ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-10">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando guión…
              </div>
            ) : selected.status === 'pendiente_generacion' ? (
              <button
                type="button"
                disabled={generatingId === selected.assignment_id}
                onClick={() => handleGenerate(selected.assignment_id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-extrabold hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20"
              >
                {generatingId === selected.assignment_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Generar guión
              </button>
            ) : selected.status === 'guion_generado' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
                <p>
                  El assignment dice &quot;guión generado&quot;, pero la API no devolvió el guión
                  asociado.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScriptLoadFailedIds((prev) => {
                        const next = { ...prev }
                        delete next[selected.assignment_id]
                        return next
                      })
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-amber-700 text-white text-xs font-bold hover:bg-amber-800"
                  >
                    Reintentar carga
                  </button>
                  {onSwitchToVendorTab && !isReelMarketingFormato(selected.formato) && (
                    <button
                      type="button"
                      onClick={() => onSwitchToVendorTab(selected.vendedor_id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-indigo-700 text-white text-xs font-bold hover:bg-indigo-800"
                    >
                      Ver en Por vendedor
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Asignación descartada.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
