'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, MessageSquareText, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { pilaresService } from '@/services/pilares.service'
import {
  findPilarScriptForAssignment,
  getPilarAssignmentTitle,
  getPilarVehicleLabel,
  isPilarGuionListo,
  type PilarAssignmentRow,
  type PilarScript,
} from '@/types/pilar'
import { PilarAssignmentStatusBadge, PilarSistemaBadge } from './pilar-badges'
import { PilarScriptDetail } from './PilarScriptDetail'
import { ReelVehicleSummary } from '@/components/marketing/reels/ReelVehicleSummary'

export function PilaresAssignmentsView({
  fecha,
  assignments,
  scripts,
  loading,
  onRefresh,
  selectedId,
  onSelect,
  listTitle,
  listSubtitle,
  expectedCount,
  hookHints,
}: {
  fecha: string
  assignments: PilarAssignmentRow[]
  scripts: PilarScript[]
  loading: boolean
  onRefresh?: () => void
  selectedId: string | null
  onSelect: (assignmentId: string | null) => void
  listTitle?: string
  listSubtitle?: string
  expectedCount?: number
  hookHints?: string[]
}) {
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const scriptsByAssignment = useMemo(() => {
    const map: Record<string, PilarScript> = {}
    for (const a of assignments) {
      const match = findPilarScriptForAssignment(scripts, a)
      if (match) map[a.assignment_id] = match
    }
    return map
  }, [assignments, scripts])

  useEffect(() => {
    const stillValid = selectedId != null && assignments.some((a) => a.assignment_id === selectedId)
    if (!stillValid) onSelect(assignments[0]?.assignment_id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments])

  const selected = assignments.find((a) => a.assignment_id === selectedId) ?? null
  const selectedScript = selectedId ? scriptsByAssignment[selectedId] ?? null : null

  async function handleGenerate(assignment: PilarAssignmentRow) {
    setGeneratingId(assignment.assignment_id)
    try {
      const res = await pilaresService.generateAssignment(
        assignment.sistema,
        assignment.assignment_id
      )
      if (res.script) {
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

  const emptyHints = useMemo(() => hookHints?.filter(Boolean) ?? [], [hookHints])

  if (assignments.length === 0 && !loading) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 space-y-3">
        <p>
          {listTitle
            ? `Aún no hay piezas de Marketing para ${listTitle} el ${fecha}.`
            : `No hay asignaciones de pilares para el ${fecha}.`}
        </p>
        <p className="text-xs text-slate-400">
          El backend planifica y genera solo para Marketing. Cuando haya piezas aparecerán aquí.
        </p>
        {emptyHints.length > 0 ? (
          <ul className="space-y-1.5 pt-1">
            {emptyHints.map((h) => (
              <li
                key={h}
                className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs font-medium text-violet-900"
              >
                Hook previsto: {h}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[520px]">
      <aside className="lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-violet-50/50">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-600">
            {listTitle ?? 'Asignaciones'}
          </p>
          <p className="text-sm font-bold text-slate-800 mt-1 leading-snug">
            {listSubtitle ?? fecha}
          </p>
          {expectedCount != null && (
            <p className="text-[11px] text-slate-400 mt-1">
              {assignments.length} de {expectedCount} · Marketing · {fecha}
            </p>
          )}
        </div>
        <div className="p-2.5 space-y-1.5 overflow-y-auto max-h-[70vh]">
          {assignments.map((a) => {
            const active = a.assignment_id === selectedId
            const hasScript = Boolean(scriptsByAssignment[a.assignment_id])
            const title = getPilarAssignmentTitle(a)
            return (
              <button
                key={a.assignment_id}
                type="button"
                onClick={() => onSelect(a.assignment_id)}
                className={[
                  'w-full text-left rounded-2xl px-3.5 py-3 border transition-all',
                  active
                    ? 'border-violet-300 bg-white shadow-[0_0_0_3px_rgba(139,92,246,0.15)] ring-1 ring-violet-100'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                <p className="text-sm font-bold text-slate-900 line-clamp-2">{title}</p>
                {a.vehicle_data || a.vehicle_id ? (
                  <div className="mt-1.5">
                    <ReelVehicleSummary
                      vehicle={a.vehicle_data}
                      fallbackLabel={a.vehicle_id ?? undefined}
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1 mt-2">
                  <PilarSistemaBadge sistema={a.sistema} hookCategoria={a.hook_categoria} />
                  <PilarAssignmentStatusBadge status={a.status} />
                  {hasScript ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                      Listo
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="flex-1 min-w-0 rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
            <MessageSquareText className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold">Elige una pieza para ver el guión</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="min-w-0">
                <p className="text-base font-extrabold text-slate-900">
                  {getPilarAssignmentTitle(selected)}
                </p>
                {getPilarVehicleLabel(selected.vehicle_data) ? (
                  <div className="mt-2">
                    <ReelVehicleSummary vehicle={selected.vehicle_data} size="lg" />
                  </div>
                ) : null}
                <p className="text-sm font-semibold text-slate-600 mt-2">Marketing</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <PilarSistemaBadge
                  sistema={selected.sistema}
                  hookCategoria={selected.hook_categoria}
                />
                <PilarAssignmentStatusBadge status={selected.status} />
              </div>
            </div>

            {selectedScript ? (
              <PilarScriptDetail script={selectedScript} />
            ) : selected.status === 'pendiente_generacion' ? (
              <button
                type="button"
                disabled={generatingId === selected.assignment_id}
                onClick={() => void handleGenerate(selected)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 text-white text-sm font-extrabold hover:bg-violet-700 disabled:opacity-50"
              >
                {generatingId === selected.assignment_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Generar guión
              </button>
            ) : isPilarGuionListo(selected.status) ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
                <p>
                  El assignment dice guión generado, pero `/pilares/scripts` no devolvió el script
                  para esta fecha.
                </p>
                <button
                  type="button"
                  onClick={() => onRefresh?.()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-amber-700 text-white text-xs font-bold"
                >
                  Recargar
                </button>
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
