'use client'

import { useState } from 'react'
import { Calendar, History, Loader2, Plus, User } from 'lucide-react'
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
    : 'bg-slate-100 text-slate-600 border-slate-200'
}

function eventBadge(status: string) {
  if (status === 'completado') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (status === 'parcial') return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-blue-50 text-blue-800 border-blue-200'
}

const inputClass =
  'w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

export function HistorialVehiculoTab({
  supabase,
  inventoryoracleId,
  owners,
  events,
  profileId,
  onRefresh,
  loading,
}: Props) {
  const [showOwnerForm, setShowOwnerForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [savingOwner, setSavingOwner] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)

  const handleAddOwner = async () => {
    if (!inventoryoracleId || !ownerName.trim()) return
    setSavingOwner(true)
    try {
      await addVehicleOwner(supabase, inventoryoracleId, {
        owner_name: ownerName.trim(),
        id_number: ownerId.trim() || null,
        is_current: owners.length === 0,
      })
      setOwnerName('')
      setOwnerId('')
      setShowOwnerForm(false)
      onRefresh()
    } finally {
      setSavingOwner(false)
    }
  }

  const handleAddEvent = async () => {
    if (!inventoryoracleId || !eventTitle.trim()) return
    setSavingEvent(true)
    try {
      await addVehicleEvent(
        supabase,
        inventoryoracleId,
        { title: eventTitle.trim(), description: eventDesc.trim() || null, status: 'activo' },
        profileId
      )
      setEventTitle('')
      setEventDesc('')
      setShowEventForm(false)
      onRefresh()
    } finally {
      setSavingEvent(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Cargando historial…</p>
      </div>
    )
  }

  if (!inventoryoracleId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
        Vehículo no vinculado a inventoryoracle.
      </p>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Propietarios */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Propietarios</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {owners.length === 0
                  ? 'Registra el historial de dueños del vehículo'
                  : `${owners.length} registro${owners.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOwnerForm((v) => !v)}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {showOwnerForm ? 'Cancelar' : 'Agregar'}
          </button>
        </div>

        {showOwnerForm && (
          <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Nombre completo</label>
                <input
                  className={inputClass}
                  placeholder="Ej. Juan Pérez"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">CI / RUC</label>
                <input
                  className={inputClass}
                  placeholder="Opcional"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={savingOwner || !ownerName.trim()}
              onClick={() => void handleAddOwner()}
              className="mt-4 w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingOwner ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar propietario'}
            </button>
          </div>
        )}

        {owners.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Sin propietarios registrados</p>
            <p className="text-xs text-slate-400 mt-1">Usa Agregar para registrar el dueño actual o anteriores</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {owners.map((o) => (
              <li key={o.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{o.owner_name}</p>
                    {o.id_number && (
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">{o.id_number}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {o.is_current ? 'Propietario actual' : 'Propietario anterior'}
                      {(o.from_date || o.to_date) && (
                        <span className="text-slate-400">
                          {' · '}
                          {formatShortDate(o.from_date) ?? '?'} — {formatShortDate(o.to_date) ?? 'actual'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${ownerBadge(o.is_current)}`}
                >
                  {o.is_current ? 'Actual' : 'Anterior'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Eventos */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <History className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Eventos del vehículo</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {events.length === 0
                  ? 'Trámites, cambios o hitos relevantes'
                  : `${events.length} evento${events.length !== 1 ? 's' : ''} registrado${events.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEventForm((v) => !v)}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {showEventForm ? 'Cancelar' : 'Nuevo evento'}
          </button>
        </div>

        {showEventForm && (
          <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Título</label>
              <input
                className={inputClass}
                placeholder="Ej. Traspaso registrado en ANT"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Descripción</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Detalle opcional del evento…"
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={savingEvent || !eventTitle.trim()}
              onClick={() => void handleAddEvent()}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar evento'}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Sin eventos registrados</p>
            <p className="text-xs text-slate-400 mt-1">Documenta cambios importantes en la vida del vehículo</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((ev) => (
              <li key={ev.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatShortDate(ev.event_date)}
                      {ev.description && <span className="text-slate-600"> · {ev.description}</span>}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${eventBadge(ev.status)}`}
                >
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
