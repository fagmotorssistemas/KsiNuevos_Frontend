'use client'

import { ReelHablanteBadge } from './reel-badges'
import {
  DEFAULT_REEL_GUION_COLUMNAS,
  type ReelGuionEscena,
  type ReelScript,
} from '@/types/reel'

type ColKey = keyof ReelGuionEscena

const COLUMN_CONFIG: Record<string, { label: string; minW: string }> = {
  esc: { label: 'Esc.', minW: 'w-11' },
  tiempo: { label: 'Tiempo', minW: 'w-[4.5rem]' },
  hablante: { label: 'Hablante', minW: 'w-32' },
  movimiento: { label: 'Movimiento', minW: 'min-w-[120px]' },
  accion: { label: 'Acción', minW: 'min-w-[160px]' },
  dialogo: { label: 'Diálogo', minW: 'min-w-[220px]' },
  texto_pantalla: { label: 'Texto en pantalla', minW: 'min-w-[160px]' },
}

/**
 * Guiones de reels aún no tienen endpoint de edición (a diferencia de
 * `PATCH /api/scripts/guiones/:id`), por eso esta tabla es de solo lectura.
 */
export function ReelEscenasTable({
  escenas,
  script,
  columnas,
}: {
  escenas: ReelGuionEscena[]
  script: Pick<ReelScript, 'formato' | 'vendedor_nombre' | 'vendedor_secundario_nombre'>
  columnas?: string[] | null
}) {
  if (escenas.length === 0) return null

  const cols = (columnas?.length ? columnas : DEFAULT_REEL_GUION_COLUMNAS).filter(
    (c) => COLUMN_CONFIG[c]
  )

  return (
    <div className="rounded-xl border border-violet-900/20 overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-violet-50/80 border-b border-violet-900/10">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-violet-900">
          Escenas · guión de reel
        </p>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[760px] border-collapse text-xs leading-snug">
          <thead>
            <tr className="bg-violet-900 text-white">
              {cols.map((key) => (
                <th
                  key={key}
                  className={`px-2.5 py-3 text-left font-extrabold text-[10px] uppercase tracking-wide ${COLUMN_CONFIG[key]!.minW}`}
                >
                  {COLUMN_CONFIG[key]!.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {escenas.map((e, i) => (
              <tr key={e.esc} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {cols.map((key) => {
                  const isEsc = key === 'esc'
                  const isTiempo = key === 'tiempo'
                  return (
                    <td
                      key={key}
                      className={[
                        'px-2.5 py-2.5 align-top border-t border-violet-100/80 text-gray-800',
                        isEsc ? 'font-extrabold text-violet-900 text-center' : '',
                        isTiempo ? 'font-bold text-violet-800 whitespace-nowrap' : '',
                        key === 'dialogo' || key === 'accion' ? 'leading-relaxed' : '',
                      ].join(' ')}
                    >
                      {key === 'hablante' ? (
                        <ReelHablanteBadge hablante={e.hablante} script={script} />
                      ) : key === 'esc' ? (
                        e.esc
                      ) : (
                        (e[key as ColKey] as string | undefined)?.trim() || (
                          <span className="text-gray-300">—</span>
                        )
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
