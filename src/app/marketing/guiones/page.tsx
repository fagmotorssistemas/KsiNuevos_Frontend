'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, ScrollText } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { GuionesAssignmentsView } from '@/components/marketing/GuionesAssignmentsView'
import { AUTOMATION_API_PUBLIC_URL } from '@/lib/automation-api'
import { scriptsService } from '@/services/scripts.service'
import type {
  AssignmentsByDateResponse,
  ScriptAssignmentRow,
} from '@/types/script-assignment'

function ymd(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function defaultTargetDate() {
  return ymd(new Date())
}

function isValidYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime())
}

function resolveDateFromSearchParams(searchParams: URLSearchParams) {
  const raw = searchParams.get('fecha')
  if (raw && isValidYmd(raw)) return raw
  return defaultTargetDate()
}

function MarketingGuionesPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const date = useMemo(() => resolveDateFromSearchParams(searchParams), [searchParams])
  const fechaParam = searchParams.get('fecha')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AssignmentsByDateResponse | null>(null)

  useEffect(() => {
    if (fechaParam && isValidYmd(fechaParam)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('fecha', defaultTargetDate())
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [fechaParam, pathname, router, searchParams])

  const setDate = useCallback(
    (nextDate: string) => {
      if (!isValidYmd(nextDate)) return
      const params = new URLSearchParams(searchParams.toString())
      params.set('fecha', nextDate)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
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

  useEffect(() => {
    load()
  }, [load])

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
            Ingresa palabras clave y genera guiones para las asignaciones del día objetivo. El
            cron selecciona vehículos de domingo a jueves para el siguiente día hábil.
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
          <p className="mt-2 font-normal text-red-600 text-xs">
            Verifica que la API de automatizaciones ({AUTOMATION_API_PUBLIC_URL}) esté
            disponible.
          </p>
        </div>
      )}

      {!error && summary.total === 0 && !loading && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          No hay asignaciones para <strong>{data?.fecha ?? date}</strong>. El cron crea
          vehículos de domingo a jueves para el siguiente día hábil; prueba otra fecha si
          buscas un lote anterior.
        </div>
      )}

      {!error && (
        <GuionesAssignmentsView
          fecha={data?.fecha ?? date}
          assignments={assignments}
          summary={summary}
          loading={loading}
          onReload={load}
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
