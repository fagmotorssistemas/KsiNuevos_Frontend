'use client'

import type { GuionEscena } from '@/types/video-script'

type ColKey = keyof GuionEscena

const COLUMNS: { key: ColKey; label: string; minW: string }[] = [
  { key: 'esc', label: 'Esc.', minW: 'w-11' },
  { key: 'tiempo', label: 'Tiempo', minW: 'w-[4.5rem]' },
  { key: 'plano', label: 'Plano / Ángulo', minW: 'min-w-[130px]' },
  { key: 'movimiento', label: 'Movimiento de cámara', minW: 'min-w-[120px]' },
  { key: 'accion', label: 'Acción visual', minW: 'min-w-[180px]' },
  { key: 'dialogo', label: 'Diálogo / Voz en off', minW: 'min-w-[200px]' },
  { key: 'musica_sonido', label: 'Música / Sonido', minW: 'min-w-[140px]' },
  { key: 'texto_pantalla', label: 'Texto en pantalla', minW: 'min-w-[120px]' },
  { key: 'postproduccion', label: 'Indicaciones de postproducción', minW: 'min-w-[160px]' },
  { key: 'notas', label: 'Notas', minW: 'min-w-[100px]' },
]

function cellValue(e: GuionEscena, key: ColKey): string {
  if (key === 'esc') return String(e.esc)
  const v = e[key]
  return typeof v === 'string' && v ? v : '—'
}

export function ScriptGuionEscenasTable({ escenas }: { escenas: GuionEscena[] }) {
  if (escenas.length === 0) return null

  return (
    <div className="rounded-xl border border-emerald-900/20 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse text-xs leading-snug">
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
                  const isPantalla = c.key === 'texto_pantalla'
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
                      {isPantalla && val !== '—' ? (
                        <span className="inline-block font-extrabold uppercase tracking-wide text-[10px] text-slate-900 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                          {val}
                        </span>
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
