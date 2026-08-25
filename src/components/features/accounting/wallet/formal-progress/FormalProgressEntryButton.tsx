'use client';

import Link from 'next/link';
import { Scale } from 'lucide-react';
import { useFormalProgressCoverage } from '@/hooks/accounting/useFormalDailyProgress';

function ringOffset(percent: number): number {
  const pct = Math.min(100, Math.max(0, percent));
  const c = 2 * Math.PI * 16;
  return c - (pct / 100) * c;
}

export function FormalProgressEntryButton() {
  const { cobertura, agendaDue, loading } = useFormalProgressCoverage();
  const pct = cobertura ?? 0;
  const empty = loading || cobertura == null || agendaDue <= 0;
  const display = loading ? '…' : cobertura == null ? '—' : agendaDue <= 0 ? '—' : `${pct}%`;

  return (
    <Link
      href="/wallet/progreso-formal"
      title="Progreso Formal del día"
      className="inline-flex items-center gap-2.5 h-11 px-3 rounded-xl bg-white border-2 border-violet-200 text-violet-800 hover:bg-violet-50 hover:border-violet-300 font-semibold text-sm shadow-sm whitespace-nowrap shrink-0 transition-colors"
    >
      <span className="relative h-8 w-8 shrink-0" aria-hidden>
        <svg viewBox="0 0 40 40" className="h-8 w-8 -rotate-90">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#ede9fe" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={empty ? '#c4b5fd' : '#7c3aed'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 16}
            strokeDashoffset={empty ? 2 * Math.PI * 16 * 0.75 : ringOffset(pct)}
            className={loading ? 'animate-pulse' : undefined}
          />
        </svg>
        <Scale className="h-3.5 w-3.5 text-violet-700 absolute inset-0 m-auto" />
      </span>
      <span className="leading-tight text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-violet-500">
          Formal hoy
        </span>
        <span className="block text-sm font-black tabular-nums text-violet-900">{display}</span>
      </span>
    </Link>
  );
}
