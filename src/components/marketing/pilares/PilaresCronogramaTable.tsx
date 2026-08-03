'use client'

import {
  CRONOGRAMA_WEEKDAY_LABELS,
  CRONOGRAMA_WEEKDAY_ORDER,
  PILAR_CRONOGRAMA,
  type PilarCronogramaKey,
  type PilarCronogramaSlot,
} from '@/lib/marketing/pilar-cronograma'

const ROW_STYLE: Record<
  PilarCronogramaKey,
  { chip: string; count: string; dot: string; short: string }
> = {
  pilar1: {
    chip: 'bg-sky-50 text-sky-900 border-sky-100',
    count: 'bg-sky-600 text-white',
    dot: 'bg-sky-500',
    short: 'Autos',
  },
  pilar2: {
    chip: 'bg-rose-50 text-rose-900 border-rose-100',
    count: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    short: 'Humanizar',
  },
  pilar3: {
    chip: 'bg-amber-50 text-amber-950 border-amber-100',
    count: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    short: 'Educativo',
  },
  pilar4: {
    chip: 'bg-violet-50 text-violet-900 border-violet-100',
    count: 'bg-violet-600 text-white',
    dot: 'bg-violet-500',
    short: 'Entreten.',
  },
  live: {
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    count: 'bg-slate-700 text-white',
    dot: 'bg-slate-500',
    short: 'Live',
  },
}

function SlotChip({
  rowKey,
  slot,
}: {
  rowKey: PilarCronogramaKey
  slot: PilarCronogramaSlot
}) {
  const style = ROW_STYLE[rowKey]
  const label = style.short

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-1 text-xs font-semibold ${style.chip}`}
    >
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums ${style.count}`}
      >
        {slot.count}
      </span>
      <span className="leading-none">{label}</span>
    </span>
  )
}

/** Tabla de referencia del cronograma semanal (imagen marketing → pilares). */
export function PilaresCronogramaTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-950">
            <th className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-white/70 border-b border-slate-800 whitespace-nowrap">
              Formato
            </th>
            {CRONOGRAMA_WEEKDAY_ORDER.map((day) => (
              <th
                key={day}
                className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-white border-b border-slate-800 whitespace-nowrap"
              >
                {CRONOGRAMA_WEEKDAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PILAR_CRONOGRAMA.map((row, i) => {
            const style = ROW_STYLE[row.key]
            return (
              <tr key={row.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-4 py-3.5 border-b border-slate-100 align-middle whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                    <span className="font-bold text-slate-900">{row.label}</span>
                    {row.soloVista ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        vista
                      </span>
                    ) : null}
                  </div>
                </td>
                {CRONOGRAMA_WEEKDAY_ORDER.map((day) => {
                  const slot = row.porDia[day]
                  return (
                    <td
                      key={day}
                      className="px-3 py-3.5 border-b border-slate-100 align-middle"
                    >
                      {slot ? (
                        <SlotChip rowKey={row.key} slot={slot} />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-300 text-sm">
                          —
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
