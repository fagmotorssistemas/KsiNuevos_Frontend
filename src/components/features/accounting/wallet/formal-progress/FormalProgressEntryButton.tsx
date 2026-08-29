'use client';

import { useId } from 'react';
import Link from 'next/link';
import { HandCoins } from 'lucide-react';
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
  const r = 13;
  const c = 2 * Math.PI * r;
  const empty = tone === 'loading' || tone === 'idle';
  const stroke =
    tone === 'done' ? '#059669' : tone === 'behind' ? '#d97706' : `url(#${gradientId})`;

  return (
    <span className="relative h-8 w-8 shrink-0" aria-hidden>
      <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={empty ? '#cbd5e1' : stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={empty ? c * 0.78 : ringOffset(percent, r)}
          className={
            loading ? 'animate-pulse' : 'transition-[stroke-dashoffset] duration-700 ease-out'
          }
        />
      </svg>
    </span>
  );
}

const itemClass =
  'group inline-flex flex-1 sm:flex-none items-center gap-2.5 h-11 px-3.5 min-w-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 transition-colors';

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
      ? 'Cargando…'
      : agendaDue <= 0
        ? 'Sin agenda hoy'
        : `${agendaDone} de ${agendaDue}`;

  const valueClass =
    tone === 'done'
      ? 'text-emerald-700'
      : tone === 'behind'
        ? 'text-amber-800'
        : 'text-slate-800';

  return (
    <Link
      href="/wallet/progreso-formal"
      title="Progreso diario"
      aria-label={`Progreso diario: ${subtitle}${agendaDue > 0 ? `, ${pct}%` : ''}`}
      className={itemClass}
    >
      <MiniCoverageRing percent={pct} tone={tone} loading={loading} />
      <span className="leading-tight text-left min-w-0">
        <span className="block text-[11px] font-semibold text-slate-500">Progreso diario</span>
        <span className={`block text-sm font-semibold tabular-nums truncate ${valueClass}`}>
          {subtitle}
        </span>
      </span>
    </Link>
  );
}

function CarteraManualEntryButton() {
  return (
    <Link
      href="/cartera-manual"
      title="Obligaciones registradas a mano (sin Oracle)"
      aria-label="Cartera manual: obligaciones registradas a mano, sin Oracle"
      className={itemClass}
    >
      <span
        className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-200/80 transition-colors"
        aria-hidden
      >
        <HandCoins className="h-4 w-4" />
      </span>
      <span className="leading-tight text-left min-w-0">
        <span className="block text-[11px] font-semibold text-slate-500">Cartera manual</span>
        <span className="block text-sm font-semibold text-slate-800">Sin Oracle</span>
      </span>
    </Link>
  );
}

export function WalletQuickNav() {
  return (
    <nav
      aria-label="Accesos de cartera"
      className="inline-flex items-stretch w-full sm:w-auto rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-x divide-slate-200"
    >
      <FormalProgressEntryButton />
      <CarteraManualEntryButton />
    </nav>
  );
}
