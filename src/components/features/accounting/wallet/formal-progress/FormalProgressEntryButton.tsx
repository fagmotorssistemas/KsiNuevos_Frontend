'use client';

import { useId } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useFormalProgressCoverage } from '@/hooks/accounting/useFormalDailyProgress';

type Tone = 'loading' | 'idle' | 'behind' | 'progress' | 'done';

function ringOffset(percent: number, radius: number): number {
  const pct = Math.min(100, Math.max(0, percent));
  const c = 2 * Math.PI * radius;
  return c - (pct / 100) * c;
}

function MiniCoverageRing({
  percent,
  tone,
  loading,
}: {
  percent: number;
  tone: Tone;
  loading: boolean;
}) {
  const uid = useId();
  const gradientId = `formal-entry-ring-${uid}`;
  const r = 15;
  const c = 2 * Math.PI * r;
  const empty = tone === 'loading' || tone === 'idle';
  const stroke =
    tone === 'done' ? '#059669' : tone === 'behind' ? '#d97706' : `url(#${gradientId})`;

  return (
    <span className="relative h-9 w-9 shrink-0" aria-hidden>
      <svg viewBox="0 0 40 40" className="h-9 w-9 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r={r} fill="none" stroke="#ede9fe" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={empty ? '#c4b5fd' : stroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={empty ? c * 0.72 : ringOffset(percent, r)}
          className={
            loading
              ? 'animate-pulse'
              : 'transition-[stroke-dashoffset] duration-700 ease-out'
          }
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-black tabular-nums leading-none ${
            percent >= 100 && tone !== 'idle' ? 'text-[9px]' : 'text-[10px]'
          } ${
            tone === 'done'
              ? 'text-emerald-700'
              : tone === 'behind'
                ? 'text-amber-700'
                : 'text-violet-800'
          }`}
        >
          {loading ? '…' : tone === 'idle' ? '—' : `${Math.round(percent)}`}
        </span>
      </span>
    </span>
  );
}

export function FormalProgressEntryButton() {
  const { cobertura, agendaDue, agendaDone, loading } = useFormalProgressCoverage();
  const pct = Math.min(100, Math.max(0, Math.round(cobertura ?? 0)));

  const tone: Tone = loading
    ? 'loading'
    : cobertura == null
      ? 'idle'
      : agendaDue <= 0
        ? 'idle'
        : pct >= 100
          ? 'done'
          : pct <= 0
            ? 'behind'
            : 'progress';

  const subtitle =
    loading || cobertura == null
      ? 'Cargando'
      : agendaDue <= 0
        ? 'Sin agenda'
        : pct >= 100
          ? 'Al día'
          : `${agendaDone} de ${agendaDue}`;

  const shell =
    tone === 'done'
      ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300'
      : tone === 'behind'
        ? 'border-amber-200 text-amber-900 hover:bg-amber-50 hover:border-amber-300'
        : 'border-violet-200 text-violet-800 hover:bg-violet-50 hover:border-violet-300';

  const labelClass =
    tone === 'done'
      ? 'text-emerald-600'
      : tone === 'behind'
        ? 'text-amber-600'
        : 'text-violet-500';

  const valueClass =
    tone === 'done'
      ? 'text-emerald-900'
      : tone === 'behind'
        ? 'text-amber-950'
        : 'text-violet-900';

  const chevronClass =
    tone === 'done'
      ? 'text-emerald-300 group-hover:text-emerald-500'
      : tone === 'behind'
        ? 'text-amber-300 group-hover:text-amber-500'
        : 'text-violet-300 group-hover:text-violet-500';

  return (
    <Link
      href="/wallet/progreso-formal"
      title="Progreso diario"
      aria-label={`Progreso diario: ${pct}%. ${subtitle}`}
      className={`group inline-flex items-center gap-2.5 h-11 pl-2 pr-2.5 rounded-xl bg-white border-2 font-semibold text-sm shadow-sm whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 ${shell}`}
    >
      <MiniCoverageRing percent={pct} tone={tone} loading={loading} />
      <span className="leading-tight text-left min-w-0">
        <span className={`block text-[10px] font-bold tracking-wide ${labelClass}`}>
          Progreso diario
        </span>
        <span className={`block text-sm font-black tabular-nums ${valueClass}`}>{subtitle}</span>
      </span>
      <ChevronRight
        className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${chevronClass}`}
        aria-hidden
      />
    </Link>
  );
}
