'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'
import { formatShortDate } from '@/lib/inventario/vehicleLegalUi'
import { addVehicleFine, deleteVehicleFine, updateVehicleFine } from '@/services/vehicleLegal.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleFineRow } from '@/types/vehicleLegal.types'

type Props = {
  supabase: SupabaseClient
  inventoryoracleId: string | null
  fines: VehicleFineRow[]
  profileId: string | null
  onRefresh: () => void
  loading?: boolean
}

export function MultasDeudasTab({ supabase, inventoryoracleId, fines, profileId, onRefresh, loading }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [fineDate, setFineDate] = useState('')
  const [location, setLocation] = useState('')
  const [payerNotes, setPayerNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const pending = fines.filter((f) => f.status === 'pendiente')
  const totalPending = pending.reduce((s, f) => s + Number(f.amount || 0), 0)

  const handleAddFine = async () => {
    if (!inventoryoracleId || !title.trim()) return
    setSaving(true)
    try {
      await addVehicleFine(
        supabase,
        inventoryoracleId,
        {
          title: title.trim(),
          amount: Number(amount) || 0,
          fine_date: fineDate || null,
          location: location || null,
          payer_notes: payerNotes || null,
        },
        profileId
      )
      setTitle('')
      setAmount('')
      setFineDate('')
      setLocation('')
      setPayerNotes('')
      setShowForm(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Cargando multas…</p>
      </div>
    )
  }

  if (!inventoryoracleId) {
    return <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">Vehículo no vinculado a inventoryoracle.</p>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Este vehículo tiene <strong>{pending.length}</strong> multa{pending.length !== 1 ? 's' : ''} vigente
            {pending.length !== 1 ? 's' : ''} por un total de <strong>${totalPending.toLocaleString()}</strong>. Deben
            regularizarse antes de la venta.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Multas registradas</p>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar multa
          </button>
        </div>

        {showForm && (
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="text-xs border rounded-lg p-2" placeholder="Concepto (ej. Exceso velocidad ANT)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="text-xs border rounded-lg p-2" type="number" placeholder="Monto $" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="text-xs border rounded-lg p-2" type="date" value={fineDate} onChange={(e) => setFineDate(e.target.value)} />
            <input className="text-xs border rounded-lg p-2" placeholder="Lugar" value={location} onChange={(e) => setLocation(e.target.value)} />
            <input className="text-xs border rounded-lg p-2 md:col-span-2" placeholder="Quién paga / notas traspaso" value={payerNotes} onChange={(e) => setPayerNotes(e.target.value)} />
            <button type="button" disabled={saving} onClick={() => void handleAddFine()} className="md:col-span-2 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">
              Guardar multa
            </button>
          </div>
        )}

        {fines.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">Sin multas registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {fines.map((f) => (
              <li key={f.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatShortDate(f.fine_date) ?? 'Sin fecha'}
                    {f.location ? ` · ${f.location}` : ''}
                  </p>
                  {f.payer_notes && <p className="text-xs text-slate-600 mt-1">{f.payer_notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-600">${Number(f.amount).toLocaleString()}</span>
                  {f.status === 'pendiente' && (
                    <button
                      type="button"
                      title="Marcar pagada"
                      className="text-[10px] font-bold text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded"
                      onClick={() => void updateVehicleFine(supabase, f.id, { status: 'pagada' }).then(onRefresh)}
                    >
                      Pagada
                    </button>
                  )}
                  <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => void deleteVehicleFine(supabase, f.id).then(onRefresh)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
