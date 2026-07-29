'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Loader2,
  Scale,
  Sparkles,
  Video,
  Wallet,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getReelCronogramaDelDia } from '@/lib/marketing/reel-cronograma'
import { reelsService } from '@/services/reels.service'
import {
  getReelFormatoLabel,
  REEL_FORMATOS,
  type ReelAssignmentRow,
  type ReelFormato,
} from '@/types/reel'
import { ReelsAssignmentsView } from './ReelsAssignmentsView'
import { ReelsCronogramaTable } from './ReelsCronogramaTable'

const FORMATO_META: Record<
  string,
  { icon: typeof Car; accent: string; chip: string; label: string }
> = {
  ficha_rapida: {
    icon: Car,
    accent: 'from-sky-500 to-blue-600',
    chip: 'bg-sky-50 text-sky-700 border-sky-100',
    label: 'FICHA',
  },
  pov_gancho: {
    icon: Video,
    accent: 'from-violet-500 to-indigo-600',
    chip: 'bg-violet-50 text-violet-700 border-violet-100',
    label: 'POV',
  },
  duelo: {
    icon: Scale,
    accent: 'from-orange-500 to-amber-600',
    chip: 'bg-orange-50 text-orange-700 border-orange-100',
    label: 'DUELO',
  },
  financiamiento: {
    icon: Wallet,
    accent: 'from-emerald-500 to-teal-600',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    label: 'FINANC.',
  },
  detras_camaras: {
    icon: Camera,
    accent: 'from-cyan-500 to-sky-600',
    chip: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    label: 'BEHIND',
  },
}

function formatFechaLabel(fechaYmd: string): string {
  const d = new Date(`${fechaYmd}T12:00:00`)
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Plan del día: hero + tarjetas de formato + lista de autos.
 * Misma lógica; UI inspirada en dashboards modernos, adaptada a reels.
 */
export function ReelsPlanDelDia({
  fecha,
  assignments,
  loading,
  onChanged,
  onSwitchToVendorTab,
  selectedId,
  onSelect,
}: {
  fecha: string
  assignments: ReelAssignmentRow[]
  loading: boolean
  onChanged: () => void
  onSwitchToVendorTab?: (vendedorId: string) => void
  selectedId: string | null
  onSelect: (assignmentId: string | null) => void
}) {
  const [showTable, setShowTable] = useState(false)
  const [showOtros, setShowOtros] = useState(false)
  const [generarAhora, setGenerarAhora] = useState(false)
  const [runningFormato, setRunningFormato] = useState<ReelFormato | null>(null)
  const [activeFormato, setActiveFormato] = useState<ReelFormato | null>(null)

  const esperadosHoy = useMemo(() => getReelCronogramaDelDia(fecha), [fecha])
  const formatosHoy = useMemo(() => new Set(esperadosHoy.map((e) => e.formato)), [esperadosHoy])
  const otrosFormatos = useMemo(
    () => REEL_FORMATOS.filter((f) => !formatosHoy.has(f)),
    [formatosHoy]
  )

  const itemsPorFormato = useMemo(() => {
    const map = new Map<string, ReelAssignmentRow[]>()
    for (const a of assignments) {
      map.set(a.formato, [...(map.get(a.formato) ?? []), a])
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
        (sum, e) => sum + Math.min(e.count, itemsPorFormato.get(e.formato)?.length ?? 0),
        0
      ),
    [esperadosHoy, itemsPorFormato]
  )

  useEffect(() => {
    if (esperadosHoy.length === 0) {
      setActiveFormato(null)
      return
    }
    setActiveFormato((prev) => {
      if (prev && esperadosHoy.some((e) => e.formato === prev)) return prev
      return esperadosHoy[0].formato
    })
  }, [esperadosHoy])

  const activo = esperadosHoy.find((e) => e.formato === activeFormato) ?? null
  const itemsActivos = useMemo(
    () => (activeFormato ? (itemsPorFormato.get(activeFormato) ?? []) : []),
    [activeFormato, itemsPorFormato]
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
  }, [activeFormato, itemsActivos])

  const handleRun = async (formato: ReelFormato) => {
    setRunningFormato(formato)
    try {
      const res = await reelsService.runFormato(formato, { fechaObjetivo: fecha, generarAhora })
      if (res.created) {
        toast.success(
          res.detail ||
            (generarAhora
              ? `${getReelFormatoLabel(formato)} generado`
              : `${getReelFormatoLabel(formato)} asignado`)
        )
        onChanged()
      } else {
        toast.message(res.detail || `No había nada pendiente para ${getReelFormatoLabel(formato)}`)
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : `Error al procesar ${getReelFormatoLabel(formato)}`
      )
    } finally {
      setRunningFormato(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl shadow-slate-900/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(129,140,248,0.35), transparent 42%), radial-gradient(circle at 88% 10%, rgba(251,191,36,0.18), transparent 28%), radial-gradient(circle at 70% 80%, rgba(56,189,248,0.12), transparent 35%)',
          }}
        />
        <div className="relative px-6 sm:px-8 py-7 sm:py-8 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-200/80 mb-2">
              Plan de hoy
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight capitalize leading-tight">
              {formatFechaLabel(fecha)}
            </h2>
            <p className="mt-2 text-sm text-slate-300 max-w-md">
              Elige un formato, revisa los autos del día y genera o descarga el guión.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white border border-white/10">
                <Clapperboard className="h-3.5 w-3.5 text-amber-300" />
                {totalAsignado} de {totalEsperado} piezas
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 border border-white/10">
                {esperadosHoy.length} formatos hoy
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

      {showTable && (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <ReelsCronogramaTable />
        </div>
      )}

      {/* Format cards */}
      {esperadosHoy.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500">
          Hoy no corresponde ningún formato según el cronograma semanal.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {esperadosHoy.map((e) => {
            const count = itemsPorFormato.get(e.formato)?.length ?? 0
            const selected = e.formato === activeFormato
            const completo = count >= e.count
            const meta = FORMATO_META[e.formato] ?? FORMATO_META.ficha_rapida
            const Icon = meta.icon
            return (
              <button
                key={e.formato}
                type="button"
                onClick={() => setActiveFormato(e.formato)}
                aria-current={selected ? 'true' : undefined}
                className={[
                  'group text-left rounded-[1.35rem] border bg-white p-4 transition-all',
                  selected
                    ? 'border-indigo-300 shadow-[0_0_0_3px_rgba(99,102,241,0.18)] ring-1 ring-indigo-200'
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
                      {meta.label}
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
                      {e.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{e.descripcion}</p>
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
                    {completo && <CheckCircle2 className="h-3 w-3" />}
                    {count}/{e.count}
                  </span>
                  {selected && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-600">
                      Activo
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Active format toolbar + content */}
      {activo && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
          <div className="space-y-4 min-w-0">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  Formato activo
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
              {!completoActivo && (
                <button
                  type="button"
                  disabled={runningFormato !== null}
                  onClick={() => handleRun(activo.formato)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20"
                >
                  {runningFormato === activo.formato ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : generarAhora ? (
                    <Wand2 className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Completar
                </button>
              )}
              <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={generarAhora}
                  onChange={(e) => setGenerarAhora(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Guión inmediato
              </label>
            </div>

            <ReelsAssignmentsView
              fecha={fecha}
              assignments={itemsActivos}
              loading={loading}
              listTitle={activo.label}
              listSubtitle={activo.descripcion}
              expectedCount={activo.count}
              onSwitchToVendorTab={onSwitchToVendorTab}
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
                  const count = itemsPorFormato.get(e.formato)?.length ?? 0
                  const completo = count >= e.count
                  const meta = FORMATO_META[e.formato]
                  const selected = e.formato === activeFormato
                  return (
                    <li key={e.formato}>
                      <button
                        type="button"
                        onClick={() => setActiveFormato(e.formato)}
                        className={[
                          'w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                          selected ? 'bg-indigo-50 ring-1 ring-indigo-100' : 'hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0',
                            meta?.chip ?? 'bg-slate-50 text-slate-600 border-slate-100',
                          ].join(' ')}
                        >
                          {meta?.label ?? e.formato}
                        </span>
                        <span className="min-w-0 flex-1 text-xs font-bold text-slate-700 truncate">
                          {e.label}
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

            {otrosFormatos.length > 0 && (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOtros((v) => !v)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  <span>Otros formatos</span>
                  {showOtros ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {showOtros && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {otrosFormatos.map((formato) => (
                      <button
                        key={formato}
                        type="button"
                        disabled={runningFormato !== null}
                        onClick={() => handleRun(formato)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold hover:bg-white disabled:opacity-50"
                      >
                        {runningFormato === formato ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {getReelFormatoLabel(formato)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
