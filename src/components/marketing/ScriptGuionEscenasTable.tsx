'use client'

import { Download } from 'lucide-react'
import type { GuionEscena } from '@/types/video-script'

type ColKey = keyof GuionEscena

const COLUMNS: { key: ColKey; label: string; minW: string }[] = [
  { key: 'esc', label: 'Esc.', minW: 'w-11' },
  { key: 'tiempo', label: 'Tiempo', minW: 'w-[4.5rem]' },
  { key: 'movimiento', label: 'Movimiento de cámara', minW: 'min-w-[120px]' },
  { key: 'accion', label: 'Acción visual', minW: 'min-w-[180px]' },
  { key: 'dialogo', label: 'Diálogo / Voz en off', minW: 'min-w-[200px]' },
]

function cellValue(e: GuionEscena, key: ColKey): string {
  if (key === 'esc') return String(e.esc)
  const v = e[key]
  return typeof v === 'string' && v ? v : '—'
}

export function ScriptGuionEscenasTable({
  escenas,
  onDownload,
  editable = false,
  saving = false,
  onDialogoChange,
  onDialogoBlur,
}: {
  escenas: GuionEscena[]
  onDownload?: () => void
  editable?: boolean
  saving?: boolean
  onDialogoChange?: (esc: number, value: string) => void
  onDialogoBlur?: () => void
}) {
  if (escenas.length === 0) return null

  return (
    <div className="rounded-xl border border-emerald-900/20 overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-emerald-50/80 border-b border-emerald-900/10">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-900">
          Escenas · diálogo y dirección
          {editable && (
            <span className="ml-2 font-semibold normal-case text-emerald-700/80">
              {saving ? '· guardando…' : '· haz clic en el diálogo para editar'}
            </span>
          )}
        </p>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white text-emerald-900 text-[10px] font-bold hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar
          </button>
        )}
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[640px] border-collapse text-xs leading-snug">
          <thead>
            <tr className="bg-emerald-800 text-white">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`px-2.5 py-3 text-left font-extrabold text-[10px] uppercase tracking-wide ${c.minW}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {escenas.map((e, i) => (
              <tr
                key={e.esc}
                className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
              >
                {COLUMNS.map((c) => {
                  const val = cellValue(e, c.key)
                  const isEsc = c.key === 'esc'
                  const isTiempo = c.key === 'tiempo'
                  const isDialogo = c.key === 'dialogo'
                  const canEditDialogo = editable && isDialogo && onDialogoChange

                  return (
                    <td
                      key={c.key}
                      className={[
                        'px-2.5 py-2.5 align-top border-t border-emerald-100/80 text-gray-800',
                        isEsc ? 'font-extrabold text-emerald-900 text-center' : '',
                        isTiempo ? 'font-bold text-emerald-800 whitespace-nowrap' : '',
                        isDialogo || c.key === 'accion' ? 'leading-relaxed' : '',
                      ].join(' ')}
                    >
                      {canEditDialogo ? (
                        <textarea
                          value={e.dialogo ?? ''}
                          onChange={(ev) => onDialogoChange(e.esc, ev.target.value)}
                          onBlur={onDialogoBlur}
                          rows={Math.max(2, Math.min(6, (e.dialogo ?? '').split('\n').length))}
                          placeholder="Escribe el diálogo o voz en off…"
                          className="w-full min-w-[180px] resize-y rounded-lg border border-emerald-200/80 bg-white px-2 py-1.5 text-xs text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                        />
                      ) : (
                        val
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
