'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatShortDate } from '@/lib/inventario/vehicleLegalUi'
import { addInternalNote } from '@/services/vehicleLegal.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleInternalNoteRow } from '@/types/vehicleLegal.types'

type Props = {
  supabase: SupabaseClient
  inventoryoracleId: string | null
  notes: VehicleInternalNoteRow[]
  authorName: string
  profileId: string | null
  onRefresh: () => void
  loading?: boolean
}

export function NotasInternasTab({ supabase, inventoryoracleId, notes, authorName, profileId, onRefresh, loading }: Props) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Cargando notas…</p>
      </div>
    )
  }

  if (!inventoryoracleId) {
    return <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">Vehículo no vinculado a inventoryoracle.</p>
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Notas del equipo (internas, no visibles al cliente)
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
        <textarea
          className="w-full min-h-[80px] text-sm border border-slate-200 rounded-lg p-3 bg-white"
          placeholder="Ej: El dueño dijo que trae el levantamiento de prenda el viernes…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          disabled={saving || !text.trim()}
          className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          onClick={async () => {
            setSaving(true)
            try {
              await addInternalNote(supabase, inventoryoracleId, authorName, text.trim(), profileId)
              setText('')
              onRefresh()
            } finally {
              setSaving(false)
            }
          }}
        >
          Agregar nota
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no hay notas para este vehículo.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-bold text-slate-900">{n.author_name}</span>
              <span className="text-slate-400"> · {formatShortDate(n.created_at)}</span>
              <span className="text-slate-400">: </span>
              {n.note_text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
