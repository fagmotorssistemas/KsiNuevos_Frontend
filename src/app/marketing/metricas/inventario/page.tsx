'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Car, Loader2, Users, Video } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import {
  categoryBadge,
  fetchInventoryWithMetrics,
  type VehicleCategory,
} from '@/app/marketing/metricas/lib/inventory-metrics'
import { CategoryChip } from '@/app/marketing/metricas/lib/ui-blocks'

const CATEGORIES = ['TODOS', 'URGENTE', 'RESCATE', 'ROTACION', 'ESTRELLA'] as const

function leadsTone(leads: number, range: 7 | 30) {
  const star = range >= 30 ? 16 : 5
  if (leads >= star) return 'text-emerald-700 bg-emerald-50 ring-emerald-200/60'
  if (leads === 0) return 'text-rose-700 bg-rose-50 ring-rose-200/60'
  return 'text-amber-800 bg-amber-50 ring-amber-200/60'
}

export default function MetricasInventarioPage() {
  const { supabase } = useAuth()
  const [range, setRange] = useState<7 | 30>(7)
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('TODOS')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchInventoryWithMetrics>>['rows']>([])

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    fetchInventoryWithMetrics(supabase, range)
      .then((r) => setRows(r.rows))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [supabase, range])

  const filtered = useMemo(() => {
    if (category === 'TODOS') return rows
    return rows.filter((r) => r.category === category)
  }, [rows, category])

  const categoryCounts = useMemo(() => {
    const c: Record<VehicleCategory, number> = {
      URGENTE: 0,
      RESCATE: 0,
      ROTACION: 0,
      ESTRELLA: 0,
    }
    for (const r of rows) c[r.category]++
    return c
  }, [rows])

  const totalLeads = useMemo(
    () => filtered.reduce((n, r) => n + r.leads_window, 0),
    [filtered]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
            Inventario en patio
          </p>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Intereses registrados en los últimos {range} días (hora Ecuador)
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRange(d)}
              className={[
                'rounded-xl px-4 py-2 text-xs font-extrabold transition-all',
                range === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Filtros categoría + mini resumen */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c
            const count =
              c === 'TODOS'
                ? rows.length
                : categoryCounts[c as VehicleCategory] ?? 0
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold border transition-all',
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300',
                ].join(' ')}
              >
                {c === 'TODOS' ? 'Todos' : c}
                <span
                  className={[
                    'tabular-nums rounded-md px-1.5 py-0.5 text-[10px]',
                    active ? 'bg-white/20 text-white' : 'bg-white text-slate-600',
                  ].join(' ')}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['URGENTE', 'RESCATE', 'ROTACION', 'ESTRELLA'] as const).map((cat) => {
            const s = categoryBadge(cat)
            return (
              <div
                key={cat}
                className={`rounded-2xl border border-slate-200/60 px-3 py-2.5 ring-1 ring-inset ${s.bg} ${s.text}`}
              >
                <p className="text-[10px] font-extrabold uppercase opacity-90">{cat}</p>
                <p className="text-xl font-extrabold tabular-nums mt-0.5">{categoryCounts[cat]}</p>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-semibold">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {loading ? 'Cargando…' : `${filtered.length} autos`}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {totalLeads.toLocaleString('es-EC')} leads en ventana · {range} días
              </p>
            </div>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                <th className="text-left px-5 py-3.5 min-w-[200px]">Vehículo</th>
                <th className="text-left px-4 py-3.5">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Leads
                  </span>
                </th>
                <th className="text-left px-4 py-3.5">
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    Views
                  </span>
                </th>
                <th className="text-left px-4 py-3.5">Retención</th>
                <th className="text-left px-4 py-3.5">Estado</th>
                <th className="text-right px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.inventory_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-extrabold text-slate-900 leading-snug">{r.vehicle_label}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={[
                        'inline-flex rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums ring-1 ring-inset',
                        leadsTone(r.leads_window, range),
                      ].join(' ')}
                    >
                      {r.leads_window}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700 tabular-nums">
                    {r.views_video.toLocaleString('es-EC')}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-600 tabular-nums">
                    {r.retention_pct == null ? '—' : `${Math.round(r.retention_pct)}%`}
                  </td>
                  <td className="px-4 py-3.5">
                    <CategoryChip category={r.category} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/marketing/metricas/inventario/${r.inventory_id}?range=${range}`}
                      className="inline-flex rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-800 transition"
                    >
                      Detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No hay autos con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
