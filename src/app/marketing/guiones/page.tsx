'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Loader2, ScrollText } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { GuionesAssignmentsView } from '@/components/marketing/GuionesAssignmentsView'
import { GuionesMonthCalendar } from '@/components/marketing/GuionesMonthCalendar'
import { AUTOMATION_API_PUBLIC_URL } from '@/lib/automation-api'
import { scriptsService } from '@/services/scripts.service'
import type {
  AssignmentsByDateResponse,
  MonthOverviewItem,
  ScriptAssignmentRow,
} from '@/types/script-assignment'

type Vista = 'dia' | 'mes'

function ymd(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function ym(d: Date) {
  return format(d, 'yyyy-MM')
}

function defaultTargetDate() {
  return ymd(new Date())
}

function defaultMes() {
  return ym(new Date())
}

function isValidYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime())
}

function isValidYm(value: string) {
  return /^\d{4}-\d{2}$/.test(value)
}

function resolveDateFromSearchParams(searchParams: URLSearchParams) {
  const raw = searchParams.get('fecha')
  if (raw && isValidYmd(raw)) return raw
  return defaultTargetDate()
}

function resolveMesFromSearchParams(searchParams: URLSearchParams, fecha: string) {
  const raw = searchParams.get('mes')
  if (raw && isValidYm(raw)) return raw
  return fecha.slice(0, 7)
}

function resolveVista(searchParams: URLSearchParams): Vista {
  return searchParams.get('vista') === 'mes' ? 'mes' : 'dia'
}

function MarketingGuionesPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const vista = useMemo(() => resolveVista(searchParams), [searchParams])
  const date = useMemo(() => resolveDateFromSearchParams(searchParams), [searchParams])
  const mes = useMemo(() => resolveMesFromSearchParams(searchParams, date), [searchParams, date])
  const fechaParam = searchParams.get('fecha')
  const [draftDate, setDraftDate] = useState(date)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AssignmentsByDateResponse | null>(null)

  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState<string | null>(null)
  const [monthItems, setMonthItems] = useState<MonthOverviewItem[]>([])

  useEffect(() => {
    setDraftDate(date)
  }, [date])

  useEffect(() => {
    if (fechaParam && isValidYmd(fechaParam)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('fecha', defaultTargetDate())
    const next = `${pathname}?${params.toString()}`
    router.replace(next, { scroll: false })
  }, [fechaParam, pathname, router, searchParams])

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value == null) params.delete(key)
        else params.set(key, value)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const commitDate = useCallback(
    (nextDate: string) => {
      if (!isValidYmd(nextDate)) {
        setDraftDate(date)
        return
      }
      if (nextDate === date) return
      replaceParams({ fecha: nextDate, mes: nextDate.slice(0, 7) })
    },
    [date, replaceParams]
  )

  const setVista = useCallback(
    (next: Vista) => {
      if (next === 'mes') {
        replaceParams({ vista: 'mes', mes })
      } else {
        const params: Record<string, string | null> = { vista: null }
        replaceParams(params)
      }
    },
    [mes, replaceParams]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await scriptsService.getAssignmentsByDate(date)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las asignaciones')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [date])

  const loadMonth = useCallback(async () => {
    setMonthLoading(true)
    setMonthError(null)
    try {
      const res = await scriptsService.getMonthOverview(mes)
      setMonthItems(res.items)
    } catch (e) {
      setMonthError(e instanceof Error ? e.message : 'No se pudo cargar el mes')
      setMonthItems([])
    } finally {
      setMonthLoading(false)
    }
  }, [mes])

  useEffect(() => {
    if (vista === 'dia') load()
  }, [load, vista])

  useEffect(() => {
    if (vista === 'mes') loadMonth()
  }, [loadMonth, vista])

  const assignments: ScriptAssignmentRow[] = data?.assignments ?? []
  const summary = {
    total: data?.total ?? 0,
    pendiente_keywords: data?.pendiente_keywords ?? 0,
    keywords_recibidos: data?.keywords_recibidos ?? 0,
    guion_generado: data?.guion_generado ?? 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            Guiones del día
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-xl">
            {vista === 'mes'
              ? 'Vista mensual: carros asignados por día, guión generado y reel subido en Videos. Meses archivados son solo consulta.'
              : 'Ingresa palabras clave y genera guiones para las asignaciones del día objetivo. El cron selecciona vehículos de domingo a jueves para el siguiente día hábil.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setVista('dia')}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                vista === 'dia' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setVista('mes')}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                vista === 'mes' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Mes
            </button>
          </div>

          {vista === 'dia' ? (
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              onBlur={() => commitDate(draftDate)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
            />
          ) : (
            <input
              type="month"
              value={mes}
              onChange={(e) => {
                const next = e.target.value
                if (!isValidYm(next)) return
                replaceParams({ mes: next, vista: 'mes' })
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
            />
          )}

          {(vista === 'dia' ? loading : monthLoading) && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </span>
          )}
        </div>
      </div>

      {vista === 'dia' && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
          {!/permiso|autorizado|403/i.test(error) && (
            <p className="mt-2 font-normal text-red-600 text-xs">
              Verifica que la API de automatizaciones ({AUTOMATION_API_PUBLIC_URL}) esté
              disponible.
            </p>
          )}
        </div>
      )}

      {vista === 'mes' && monthError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {monthError}
        </div>
      )}

      {vista === 'dia' && !error && summary.total === 0 && !loading && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          No hay asignaciones para <strong>{data?.fecha ?? date}</strong>. El cron crea
          vehículos de domingo a jueves para el siguiente día hábil; prueba otra fecha si
          buscas un lote anterior.
        </div>
      )}

      {vista === 'dia' && !error && (
        <GuionesAssignmentsView
          fecha={data?.fecha ?? date}
          assignments={assignments}
          summary={summary}
          loading={loading}
          onReload={load}
        />
      )}

      {vista === 'mes' && !monthError && (
        <GuionesMonthCalendar
          mes={mes}
          items={monthItems}
          loading={monthLoading}
          onMesChange={(nextMes) => replaceParams({ mes: nextMes, vista: 'mes' })}
          onSelectDay={(fecha) => replaceParams({ vista: null, fecha, mes: fecha.slice(0, 7) })}
          onReload={loadMonth}
        />
      )}
    </div>
  )
}

export default function MarketingGuionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando guiones…
        </div>
      }
    >
      <MarketingGuionesPageInner />
    </Suspense>
  )
}
