'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { formatShortDate, statusLabel } from '@/lib/inventario/vehicleLegalUi'
import { addVehicleEvent, addVehicleOwner } from '@/services/vehicleLegal.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleEventRow, VehicleOwnerRow } from '@/types/vehicleLegal.types'

type Props = {
  supabase: SupabaseClient
  inventoryoracleId: string | null
  owners: VehicleOwnerRow[]
  events: VehicleEventRow[]
  profileId: string | null
  onRefresh: () => void
  loading?: boolean
}

function ownerBadge(isCurrent: boolean) {
  return isCurrent
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-amber-50 text-amber-900 border-amber-200'
}

function eventBadge(status: string) {
  if (status === 'completado') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (status === 'parcial') return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

export function HistorialVehiculoTab({ supabase, inventoryoracleId, owners, events, profileId, onRefresh, loading }: Props) {
  const [ownerName, setOwnerName] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Cargando historial…</p>
      </div>
    )
  }

  if (!inventoryoracleId) {
    return <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">Vehículo no vinculado a inventoryoracle.</p>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase text-slate-400">Propietarios anteriores</p>
          <button type="button" className="text-xs font-bold text-blue-600 flex items-center gap-1" onClick={() => { setOwnerName(''); setOwnerId('') }}>
            <Plus className="h-3 w-3" /> Nuevo
          </button>
        </div>
        {(ownerName || owners.length === 0) && (
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="text-xs border rounded-lg p-2" placeholder="Nombre completo" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            <input className="text-xs border rounded-lg p-2" placeholder="CI / RUC" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
            <button
              type="button"
              className="text-xs font-bold bg-blue-600 text-white rounded-lg py-2"
              onClick={() =>
                void addVehicleOwner(supabase, inventoryoracleId, {
                  owner_name: ownerName.trim(),
                  id_number: ownerId || null,
                  is_current: owners.length === 0,
                }).then(() => {
                  setOwnerName('')
                  setOwnerId('')
                  onRefresh()
                })
              }
            >
              Guardar propietario
            </button>
          </div>
        )}
        {owners.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Sin propietarios registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {owners.map((o) => (
              <li key={o.id} className="px-4 py-3 flex justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {o.owner_name}
                    {o.id_number ? ` · ${o.id_number}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {o.is_current ? 'Propietario actual' : 'Propietario anterior'}
                    {(o.from_date || o.to_date) &&
                      ` · ${formatShortDate(o.from_date) ?? '?'} - ${formatShortDate(o.to_date) ?? 'actual'}`}
                  </p>
                </div>
                <span className={`h-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${ownerBadge(o.is_current)}`}>
                  {o.is_current ? 'Actual' : 'Anterior'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase text-slate-400">Eventos registrados</p>
        </div>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
          <input className="w-full text-xs border rounded-lg p-2" placeholder="Título del evento" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
          <textarea className="w-full text-xs border rounded-lg p-2" rows={2} placeholder="Descripción" value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} />
          <button
            type="button"
            className="text-xs font-bold bg-blue-600 text-white rounded-lg px-3 py-2"
            onClick={() =>
              void addVehicleEvent(
                supabase,
                inventoryoracleId,
                { title: eventTitle.trim(), description: eventDesc || null, status: 'activo' },
                profileId
              ).then(() => {
                setEventTitle('')
                setEventDesc('')
                onRefresh()
              })
            }
          >
            Registrar evento
          </button>
        </div>
        {events.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Sin eventos.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((ev) => (
              <li key={ev.id} className="px-4 py-3 flex justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatShortDate(ev.event_date)} · {ev.description ?? ev.event_type}
                  </p>
                </div>
                <span className={`h-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${eventBadge(ev.status)}`}>
                  {statusLabel(ev.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
