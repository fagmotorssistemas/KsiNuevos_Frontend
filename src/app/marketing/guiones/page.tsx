'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, ScrollText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ScriptCard, type ScriptRow } from '@/components/marketing/ScriptCard'
import { VendedorHeader } from '@/components/marketing/VendedorHeader'

type Group = {
  vendedorNombre: string
  items: ScriptRow[]
}

function ymd(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function parseDateInputLocal(value: string) {
  // value: "YYYY-MM-DD" from <input type="date">
  const [y, m, d] = value.split('-').map((n) => Number(n))
  if (!y || !m || !d) return new Date()
  // Important: construct as LOCAL midnight (not UTC)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export default function MarketingGuionesPage() {
  const { supabase } = useAuth()
  const [date, setDate] = useState(() => ymd(new Date()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ScriptRow[]>([])
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    setHint(null)

    const start = startOfDay(parseDateInputLocal(date))
    const end = addDays(start, 1)

    ;(supabase as unknown as { from: (t: string) => any })
      .from('video_scripts')
      .select(
        `
        id, vendedor_id, vendedor_nombre, vehicle_id, semana_tipo, guion_tipo, objecion_tipo,
        texto_guion, palabras_count, status, facebook_post_id, fecha_generacion, fecha_publicacion,
        created_at, updated_at, vehicle_data,
        inventoryoracle:inventoryoracle (brand, model, year, color, img_main_url)
      `
      )
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('vendedor_nombre', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }: { data: unknown[] | null; error: { message: string } | null }) => {
        if (error) {
          setError(error.message)
          setRows([])
          return
        }
        setRows((data ?? []) as ScriptRow[])
        if (!data || data.length === 0) {
          ;(supabase as unknown as { from: (t: string) => any })
            .from('video_scripts')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data: d2 }: { data: Array<{ created_at: string }> | null }) => {
              const last = d2?.[0]?.created_at
              if (!last) return
              const day = format(new Date(last), 'yyyy-MM-dd')
              setHint(`Tip: el último día con guiones es ${day}. Cambia la fecha para verlos.`)
            })
        }
      })
      .finally(() => setLoading(false))
  }, [supabase, date])

  const groups = useMemo(() => {
    const map = new Map<string, ScriptRow[]>()
    for (const r of rows) {
      const name = (r.vendedor_nombre ?? 'Sin vendedor').trim() || 'Sin vendedor'
      map.set(name, [...(map.get(name) ?? []), r])
    }
    const out: Group[] = Array.from(map.entries()).map(([vendedorNombre, items]) => ({ vendedorNombre, items }))
    out.sort((a, b) => a.vendedorNombre.localeCompare(b.vendedorNombre))
    return out
  }, [rows])

  const humanDate = useMemo(() => {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return date
    return format(d, "dd/MM/yyyy", { locale: es })
  }, [date])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            Guiones del Día
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Fecha: <span className="font-semibold text-gray-700">{humanDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
          />
          {loading && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}
      {hint && !error && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 font-semibold">
          {hint}
        </div>
      )}

      {groups.length === 0 && !loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          No hay guiones para esta fecha.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map((g) => (
            <section key={g.vendedorNombre} className="space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <VendedorHeader nombre={g.vendedorNombre} count={g.items.length} />
              </div>
              <div className="space-y-4">
                {g.items.map((s) => (
                  <ScriptCard key={s.id} script={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

