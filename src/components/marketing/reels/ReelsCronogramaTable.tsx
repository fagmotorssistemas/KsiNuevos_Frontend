'use client'

import {
  CRONOGRAMA_WEEKDAY_LABELS,
  CRONOGRAMA_WEEKDAY_ORDER,
  REEL_CRONOGRAMA,
} from '@/lib/marketing/reel-cronograma'

/** Tabla de referencia del cronograma semanal de asignación automática de reels. */
export function ReelsCronogramaTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50/90">
            <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">
              Formato
            </th>
            {CRONOGRAMA_WEEKDAY_ORDER.map((day) => (
              <th
                key={day}
                className="px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap"
              >
                {CRONOGRAMA_WEEKDAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REEL_CRONOGRAMA.map((row, i) => (
            <tr
              key={row.formato}
              className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
            >
              <td className="px-4 py-3.5 font-bold text-slate-900 border-b border-slate-100 align-top whitespace-nowrap">
                {row.label}
              </td>
              {CRONOGRAMA_WEEKDAY_ORDER.map((day) => (
                <td
                  key={day}
                  className="px-3 py-3.5 text-slate-600 font-medium border-b border-slate-100 align-top"
                >
                  {row.porDia[day]?.descripcion ?? (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
