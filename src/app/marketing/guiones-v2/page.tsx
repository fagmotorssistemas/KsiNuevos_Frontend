'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Clapperboard, Loader2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PilaresPlanDelDia } from '@/components/marketing/pilares/PilaresPlanDelDia'
import { PilarComplianceHeaderControls } from '@/components/marketing/pilares/PilarComplianceHeaderControls'
import { AUTOMATION_API_PUBLIC_URL } from '@/lib/automation-api'
import { pilaresService } from '@/services/pilares.service'
import type {
  PilarAssignmentRow,
  PilarAssignmentsResponse,
  PilarScript,
} from '@/types/pilar'

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

function MarketingPilaresPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const date = useMemo(() => resolveDateFromSearchParams(searchParams), [searchParams])
  const fechaParam = searchParams.get('fecha')
  const [draftDate, setDraftDate] = useState(date)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<PilarAssignmentRow[]>([])
  const [scripts, setScripts] = useState<PilarScript[]>([])
  const [raw, setRaw] = useState<PilarAssignmentsResponse | null>(null)
  const [responsable, setResponsable] = useState('Marketing')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [complianceTick, setComplianceTick] = useState(0)

  useEffect(() => {
    setDraftDate(date)
  }, [date])

  useEffect(() => {
    if (fechaParam && isValidYmd(fechaParam)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('fecha', defaultTargetDate())
    params.delete('vista')
    params.delete('vendedor')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
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
      replaceParams({ fecha: nextDate })
    },
    [date, replaceParams]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [asg, scr] = await Promise.all([
        pilaresService.getAssignmentsByDate(date),
        pilaresService.getScriptsByDate(date),
      ])
      setAssignments(asg.assignments)
      setRaw(asg.raw)
      setResponsable(asg.responsable || scr.responsable || 'Marketing')
      setScripts(scr.scripts)
      setComplianceTick((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pilares')
      setAssignments([])
      setScripts([])
      setRaw(null)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            Guiones V2
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">
            Plan del día por pilares. Todo asignado a <strong>{responsable}</strong> — sin
            vendedores.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <PilarComplianceHeaderControls
            fecha={date}
            onSelectFecha={commitDate}
            refreshKey={complianceTick}
          />

          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            onBlur={() => commitDate(draftDate)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white"
          />

          {loading ? (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          {error}
          {!/permiso|autorizado|403/i.test(error) ? (
            <p className="mt-2 font-normal text-red-600 text-xs">
              Verifica que la API ({AUTOMATION_API_PUBLIC_URL}) exponga `/pilares/assignments` y
              `/pilares/scripts`.
            </p>
          ) : null}
        </div>
      ) : (
        <PilaresPlanDelDia
          fecha={date}
          assignments={assignments}
          scripts={scripts}
          raw={raw}
          loading={loading}
          onChanged={load}
          selectedId={selectedAssignmentId}
          onSelect={setSelectedAssignmentId}
        />
      )}
    </div>
  )
}

export default function MarketingPilaresPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando pilares…
        </div>
      }
    >
      <MarketingPilaresPageInner />
    </Suspense>
  )
}
