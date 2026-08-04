'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  HeartHandshake,
  PartyPopper,
} from 'lucide-react'
import { getPilarCronogramaDelDia } from '@/lib/marketing/pilar-cronograma'
import {
  getPilarLabel,
  PILAR_SHORT_LABELS,
  type PilarAssignmentRow,
  type PilarAssignmentsResponse,
  type PilarScript,
  type PilarSistema,
} from '@/types/pilar'
import { PilaresAssignmentsView } from './PilaresAssignmentsView'
import { PilaresCronogramaTable } from './PilaresCronogramaTable'

const SISTEMA_META: Record<
  PilarSistema,
  { icon: typeof Car; accent: string; chip: string }
> = {
  pilar1: {
    icon: Car,
    accent: 'from-sky-500 to-blue-600',
    chip: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  pilar2: {
    icon: HeartHandshake,
    accent: 'from-rose-500 to-pink-600',
    chip: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  pilar3: {
    icon: BookOpen,
    accent: 'from-amber-500 to-orange-600',
    chip: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  pilar4: {
    icon: PartyPopper,
    accent: 'from-violet-500 to-indigo-600',
    chip: 'bg-violet-50 text-violet-700 border-violet-100',
  },
}

function formatFechaLabel(fechaYmd: string): string {
  const d = new Date(`${fechaYmd}T12:00:00`)
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
}

function hookHintsForSistema(
  raw: PilarAssignmentsResponse | null,
  sistema: PilarSistema
): string[] {
  const plan = raw?.pilares?.[sistema]?.plan_del_dia
  if (!plan) return []
  if (plan.hook_preview?.hook_texto) return [plan.hook_preview.hook_texto]
  if (plan.hooks_preview?.length) {
    return plan.hooks_preview.map((h) => h.hook_texto).filter(Boolean)
  }
  return []
}

export function PilaresPlanDelDia({
  fecha,
  assignments,
  scripts,
  raw,
  loading,
  onChanged,
  selectedId,
  onSelect,
}: {
  fecha: string
  assignments: PilarAssignmentRow[]
  scripts: PilarScript[]
  raw: PilarAssignmentsResponse | null
  loading: boolean
  onChanged: () => void
  selectedId: string | null
  onSelect: (assignmentId: string | null) => void
}) {
  const [showTable, setShowTable] = useState(true)
  const [activeSistema, setActiveSistema] = useState<PilarSistema | null>(null)

  const esperadosHoy = useMemo(() => {
    const fromImage = getPilarCronogramaDelDia(fecha)
    const bySistema = new Map(fromImage.map((e) => [e.sistema, e]))

    // Si el backend espera piezas de un pilar no listado en la imagen ese día, también se muestra.
    for (const sistema of ['pilar1', 'pilar2', 'pilar3', 'pilar4'] as PilarSistema[]) {
      const apiEsperado = raw?.pilares?.[sistema]?.plan_del_dia?.esperado
      if (typeof apiEsperado === 'number' && apiEsperado > 0 && !bySistema.has(sistema)) {
        bySistema.set(sistema, {
          sistema,
          label: getPilarLabel(sistema),
          descripcion: `${apiEsperado} × ${getPilarLabel(sistema)}`,
          count: apiEsperado,
        })
      }
    }

    return Array.from(bySistema.values()).map((e) => {
      const apiEsperado = raw?.pilares?.[e.sistema]?.plan_del_dia?.esperado
      return {
        ...e,
        count: typeof apiEsperado === 'number' && apiEsperado > 0 ? apiEsperado : e.count,
      }
    })
  }, [fecha, raw])

  const itemsPorSistema = useMemo(() => {
    const map = new Map<PilarSistema, PilarAssignmentRow[]>()
    for (const a of assignments) {
      map.set(a.sistema, [...(map.get(a.sistema) ?? []), a])
    }
    return map
  }, [assignments])

  const totalEsperado = useMemo(
    () => esperadosHoy.reduce((sum, e) => sum + e.count, 0),
    [esperadosHoy]
  )
  const totalAsignado = useMemo(
    () =>
      esperadosHoy.reduce(
        (sum, e) => sum + Math.min(e.count, itemsPorSistema.get(e.sistema)?.length ?? 0),
        0
      ),
    [esperadosHoy, itemsPorSistema]
  )

  useEffect(() => {
    if (esperadosHoy.length === 0) {
      setActiveSistema(null)
      return
    }
    setActiveSistema((prev) => {
      if (prev && esperadosHoy.some((e) => e.sistema === prev)) return prev
      return esperadosHoy[0].sistema
    })
  }, [esperadosHoy])

  const activo = esperadosHoy.find((e) => e.sistema === activeSistema) ?? null
  const itemsActivos = useMemo(
    () => (activeSistema ? (itemsPorSistema.get(activeSistema) ?? []) : []),
    [activeSistema, itemsPorSistema]
  )
  const actualActivo = itemsActivos.length
  const completoActivo = activo ? actualActivo >= activo.count : false

  useEffect(() => {
    if (itemsActivos.length === 0) {
      onSelect(null)
      return
    }
    const stillValid =
      selectedId != null && itemsActivos.some((a) => a.assignment_id === selectedId)
    if (!stillValid) onSelect(itemsActivos[0].assignment_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSistema, itemsActivos])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white shadow-xl shadow-slate-900/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(167,139,250,0.35), transparent 42%), radial-gradient(circle at 88% 10%, rgba(251,191,36,0.16), transparent 28%)',
          }}
        />
        <div className="relative px-6 sm:px-8 py-7 sm:py-8 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200/80 mb-2">
              Plan de hoy · Pilares
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight capitalize leading-tight">
              {formatFechaLabel(fecha)}
            </h2>
            <p className="mt-2 text-sm text-slate-300 max-w-md">
              Elige un pilar, revisa hooks del día y descarga el guión. Todo lo genera Marketing;
              la planificación corre sola en el backend.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white border border-white/10">
                <Clapperboard className="h-3.5 w-3.5 text-amber-300" />
                {totalAsignado} de {totalEsperado} piezas
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 border border-white/10">
                {esperadosHoy.length} pilares hoy
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          >
            {showTable ? 'Ocultar cronograma' : 'Ver cronograma semanal'}
            {showTable ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </section>

      {showTable ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <PilaresCronogramaTable />
        </div>
      ) : null}

      {esperadosHoy.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500">
          Hoy no corresponde ningún pilar según el cronograma semanal.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {esperadosHoy.map((e) => {
            const count = itemsPorSistema.get(e.sistema)?.length ?? 0
            const selected = e.sistema === activeSistema
            const completo = count >= e.count
            const meta = SISTEMA_META[e.sistema]
            const Icon = meta.icon
            const hints = hookHintsForSistema(raw, e.sistema)
            return (
              <button
                key={e.sistema}
                type="button"
                onClick={() => setActiveSistema(e.sistema)}
                aria-current={selected ? 'true' : undefined}
                className={[
                  'group text-left rounded-[1.35rem] border bg-white p-4 transition-all',
                  selected
                    ? 'border-violet-300 shadow-[0_0_0_3px_rgba(139,92,246,0.18)] ring-1 ring-violet-200'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      'h-11 w-11 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shrink-0 shadow-sm',
                      meta.accent,
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      {PILAR_SHORT_LABELS[e.sistema]}
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
                      {e.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{e.descripcion}</p>
                    {hints[0] ? (
                      <p className="text-[11px] text-violet-700 mt-1.5 line-clamp-2 font-medium">
                        {hints[0]}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className={[
                      'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
                      completo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100',
                    ].join(' ')}
                  >
                    {completo ? <CheckCircle2 className="h-3 w-3" /> : null}
                    {count}/{e.count}
                  </span>
                  {selected ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600">
                      Activo
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {activo ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
          <div className="space-y-4 min-w-0">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  Pilar activo
                </p>
                <p className="text-base font-extrabold text-slate-900">{activo.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{activo.descripcion}</p>
              </div>
              <span
                className={[
                  'text-xs font-bold px-2.5 py-1 rounded-full border shrink-0',
                  completoActivo
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-100',
                ].join(' ')}
              >
                {actualActivo} de {activo.count}
              </span>
            </div>

            <PilaresAssignmentsView
              fecha={fecha}
              assignments={itemsActivos}
              scripts={scripts.filter((s) => s.sistema === activo.sistema)}
              loading={loading}
              listTitle={activo.label}
              listSubtitle={activo.descripcion}
              expectedCount={activo.count}
              hookHints={hookHintsForSistema(raw, activo.sistema)}
              onRefresh={onChanged}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </div>

          <aside className="xl:sticky xl:top-4 space-y-4">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-3">
                Resumen del día
              </p>
              <ul className="space-y-2">
                {esperadosHoy.map((e) => {
                  const count = itemsPorSistema.get(e.sistema)?.length ?? 0
                  const completo = count >= e.count
                  const meta = SISTEMA_META[e.sistema]
                  const selected = e.sistema === activeSistema
                  return (
                    <li key={e.sistema}>
                      <button
                        type="button"
                        onClick={() => setActiveSistema(e.sistema)}
                        className={[
                          'w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                          selected ? 'bg-violet-50 ring-1 ring-violet-100' : 'hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0',
                            meta.chip,
                          ].join(' ')}
                        >
                          {PILAR_SHORT_LABELS[e.sistema]}
                        </span>
                        <span className="min-w-0 flex-1 text-xs font-bold text-slate-700 truncate">
                          {getPilarLabel(e.sistema)}
                        </span>
                        <span
                          className={[
                            'text-[11px] font-extrabold shrink-0',
                            completo ? 'text-emerald-600' : 'text-amber-600',
                          ].join(' ')}
                        >
                          {count}/{e.count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
