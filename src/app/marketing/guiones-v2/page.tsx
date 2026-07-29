'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Clapperboard, Loader2, Users } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ReelsByVendorView } from '@/components/marketing/reels/ReelsByVendorView'
import { ReelsPlanDelDia } from '@/components/marketing/reels/ReelsPlanDelDia'
import { AUTOMATION_API_PUBLIC_URL } from '@/lib/automation-api'
import { reelsService } from '@/services/reels.service'
import type { ReelAssignmentRow } from '@/types/reel'

type Vista = 'dia' | 'vendedor'

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

function resolveVista(searchParams: URLSearchParams): Vista {
  return searchParams.get('vista') === 'vendedor' ? 'vendedor' : 'dia'
}

function MarketingReelsPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const vista = useMemo(() => resolveVista(searchParams), [searchParams])
  const date = useMemo(() => resolveDateFromSearchParams(searchParams), [searchParams])
  const fechaParam = searchParams.get('fecha')
  const vendedorParam = searchParams.get('vendedor')
  const [draftDate, setDraftDate] = useState(date)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<ReelAssignmentRow[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)

  useEffect(() => {
    setDraftDate(date)
  }, [date])

  useEffect(() => {
    if (fechaParam && isValidYmd(fechaParam)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('fecha', defaultTargetDate())
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
      const res = await reelsService.getAssignmentsByDate(date)
      setAssignments(res.assignments)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las asignaciones')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  const vendorOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assignments) {
      // Ficha/Duelo/Financiamiento usan assignee técnico "Marketing".
      // POV/Detrás: solo quien sale (Vanessa/Felipe/Xavier); cámara = Marketing.
      if (a.vendedor_nombre.trim().toLowerCase() === 'marketing') continue
      if (!map.has(a.vendedor_id)) map.set(a.vendedor_id, a.vendedor_nombre)
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [assignments])

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
            {vista === 'vendedor'
              ? 'Reels generados por vendedor: revisa, descarga y marca publicaciones.'
              : 'Organiza los reels del día por formato y genera guiones.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => replaceParams({ vista: null })}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                vista === 'dia' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => replaceParams({ vista: 'vendedor' })}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                vista === 'vendedor' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              <Users className="h-3.5 w-3.5" />
              Por vendedor
            </button>
          </div>

          {vista === 'dia' && (
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
          )}

          {loading && (
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

      {vista === 'dia' && !error && (
        <ReelsPlanDelDia
          fecha={date}
          assignments={assignments}
          loading={loading}
          onChanged={load}
          onSwitchToVendorTab={(vendedorId) =>
            replaceParams({ vista: 'vendedor', vendedor: vendedorId })
          }
          selectedId={selectedAssignmentId}
          onSelect={setSelectedAssignmentId}
        />
      )}

      {vista === 'vendedor' && (
        <ReelsByVendorView vendorOptions={vendorOptions} initialVendorId={vendedorParam} />
      )}
    </div>
  )
}

export default function MarketingReelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando reels…
        </div>
      }
    >
      <MarketingReelsPageInner />
    </Suspense>
  )
}
