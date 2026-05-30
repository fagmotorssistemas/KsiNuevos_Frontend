'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, User } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  documentActivityActionLabel,
  fetchDocumentActivityLog,
} from '@/services/vehicleLegal.service'
import type { DocumentActivityEntry } from '@/types/vehicleLegal.types'

type Props = {
  supabase: SupabaseClient
  documentId: string
  docLabel: string
}

function formatActivityWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VehicleDocumentActivityLog({ supabase, documentId, docLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<DocumentActivityEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchDocumentActivityLog(supabase, documentId)
      setEntries(rows)
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, documentId])

  useEffect(() => {
    if (open && !loaded) void load()
  }, [open, loaded, load])

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-violet-700 transition-colors"
        title="Registro de actividad (solo admin)"
      >
        {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {open ? 'Ocultar registro' : 'Ver registro'}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700/80">
            Actividad · {docLabel}
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando…
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">Sin movimientos registrados.</p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-0.5">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex gap-2 rounded-lg bg-white/80 border border-violet-100/80 px-2.5 py-2"
                >
                  <div className="h-6 w-6 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 leading-snug">
                      {documentActivityActionLabel(e.action)}
                      {e.fileName && (
                        <span className="font-normal text-slate-600"> · {e.fileName}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {e.actorName}
                      <span className="text-slate-400"> · {formatActivityWhen(e.at)}</span>
                    </p>
                    {e.detail && (
                      <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">{e.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
