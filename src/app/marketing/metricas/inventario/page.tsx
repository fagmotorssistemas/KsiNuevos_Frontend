'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { fetchInventoryWithMetrics } from '@/app/marketing/metricas/lib/inventory-metrics'
import type { VehicleCategory } from '@/app/marketing/metricas/lib/inventory-metrics'
import { CategoryChip } from '@/app/marketing/metricas/lib/ui-blocks'

export default function MetricasInventarioPage() {
  const { supabase } = useAuth()
  const [range, setRange] = useState<7 | 30>(7)
  const [category, setCategory] = useState<VehicleCategory | 'TODOS'>('TODOS')
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          {(['TODOS', 'URGENTE', 'RESCATE', 'ROTACION', 'ESTRELLA'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={[
                'rounded-xl px-3 py-2 text-xs font-extrabold border transition',
                category === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
              ].join(' ')}
            >
              {c === 'TODOS' ? 'TODOS' : c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Rango</span>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as 7 | 30)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500">Inventario con estado</p>
            <p className="text-base font-extrabold text-gray-900">{filtered.length} autos</p>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-bold px-5 py-3">Auto</th>
                <th className="text-left font-bold px-5 py-3">Leads</th>
                <th className="text-left font-bold px-5 py-3">Views video</th>
                <th className="text-left font-bold px-5 py-3">Retención</th>
                <th className="text-left font-bold px-5 py-3">Categoría</th>
                <th className="text-right font-bold px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.inventory_id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-bold text-gray-900">{r.vehicle_label}</td>
                  <td className="px-5 py-3">
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold',
                        r.leads_window >= (range >= 30 ? 16 : 5)
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.leads_window === 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-50 text-amber-900',
                      ].join(' ')}
                    >
                      {r.leads_window.toLocaleString('es-EC')} / {range}d
                    </span>
                  </td>
                  <td className="px-5 py-3">{r.views_video.toLocaleString('es-EC')}</td>
                  <td className="px-5 py-3">{r.retention_pct == null ? '—' : `${Math.round(r.retention_pct)}%`}</td>
                  <td className="px-5 py-3">
                    <CategoryChip category={r.category} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/marketing/metricas/inventario/${r.inventory_id}?range=${range}`}
                      className="inline-flex rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-extrabold text-gray-800 hover:bg-gray-50"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-5 py-8 text-gray-500 text-center" colSpan={6}>
                    No hay autos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        La categoría mostrada es una heurística local (leads en la ventana + antigüedad del registro). Cuando el backend guarde la categoría oficial,
        podemos sustituir este cálculo por la columna correspondiente.
      </p>
    </div>
  )
}
