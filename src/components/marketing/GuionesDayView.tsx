'use client'

import { useMemo } from 'react'
import { MessageSquareText } from 'lucide-react'
import type { ScriptRow } from './ScriptCard'
import { GuionTipoBadge, SemanaBadge } from './badges'
import { ScriptGuionDetail } from './ScriptGuionDetail'
import { getGuionDisplayTitle, getScriptVehicleLabel } from '@/types/video-script'

type VendorGroup = { vendedorNombre: string; items: ScriptRow[] }

function statusDot(status: string | null) {
  const v = (status ?? 'generado').toLowerCase()
  if (v === 'publicado') return 'bg-green-500'
  if (v === 'descartado') return 'bg-gray-400'
  return 'bg-amber-400'
}

export function GuionesDayView({
  groups,
  selectedId,
  onSelect,
}: {
  groups: VendorGroup[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const selected = useMemo(() => {
    for (const g of groups) {
      const hit = g.items.find((s) => s.id === selectedId)
      if (hit) return hit
    }
    return null
  }, [groups, selectedId])

  const car = selected?.inventoryoracle
  const vehicleLabel = selected
    ? getScriptVehicleLabel(selected.vehicle_id, car)
    : ''

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-[520px]">
      <aside className="lg:w-[300px] xl:w-[320px] shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Seleccionar guion</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">
            {groups.reduce((n, g) => n + g.items.length, 0)} del día
          </p>
        </div>
        <div className="p-2 space-y-4">
          {groups.map((g) => (
            <div key={g.vendedorNombre}>
              <p className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-gray-500 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                {g.vendedorNombre}
              </p>
              <ul className="space-y-1 mt-1">
                {g.items.map((s) => {
                  const active = s.id === selectedId
                  const title = getGuionDisplayTitle(s)
                  const vehicle = getScriptVehicleLabel(s.vehicle_id, s.inventoryoracle)
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(s.id)}
                        className={[
                          'w-full text-left rounded-xl px-3 py-2.5 border transition-all',
                          active
                            ? 'border-emerald-700 bg-emerald-50 shadow-sm ring-1 ring-emerald-700/30'
                            : 'border-transparent hover:border-gray-200 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusDot(s.status)}`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-gray-900 line-clamp-2 leading-snug">
                              {title}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{vehicle}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <GuionTipoBadge tipo={s.guion_tipo ?? ''} objecionTipo={s.objecion_tipo} />
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-500">
            <MessageSquareText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-semibold">Elige un guion de la lista</p>
            <p className="text-xs mt-1">Se mostrará la tabla de escenas a ancho completo</p>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-gray-100 p-4 sm:p-5 flex flex-wrap items-start gap-4 bg-gradient-to-r from-white to-emerald-50/30">
              <div className="h-24 w-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                {car?.img_main_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={car.img_main_url}
                    alt={vehicleLabel}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <MessageSquareText className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold text-gray-900">{vehicleLabel}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {selected.vendedor_nombre ?? 'Sin vendedor'}
                  {car?.color ? ` · ${car.color}` : ''}
                  {selected.palabras_count ? ` · ${selected.palabras_count} palabras` : ''}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <GuionTipoBadge tipo={selected.guion_tipo ?? ''} objecionTipo={selected.objecion_tipo} />
                  <SemanaBadge semanaTipo={selected.semana_tipo} />
                  <span className="text-xs font-bold text-gray-600 capitalize">
                    {(selected.status ?? 'generado').toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <ScriptGuionDetail script={selected} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
