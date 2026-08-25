'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  RefreshCw,
  X,
} from 'lucide-react';
import { FormalProgressGuide } from '@/components/features/accounting/wallet/formal-progress/FormalProgressGuide';
import { useFormalDailyProgress } from '@/hooks/accounting/useFormalDailyProgress';
import type {
  FormalProgressCategoryId,
  FormalProgressEventRow,
  FormalProgressTrendPoint,
} from '@/types/formal-progress.types';

const STEP_META: Record<
  string,
  { mark: string; title: string; hint: string }
> = {
  verificacion: { mark: '1', title: 'Verificación', hint: 'Contrato, kardex y poder' },
  visita_domiciliaria: { mark: '2', title: 'Visita', hint: 'Acta o foto en domicilio' },
  predemanda: { mark: '3', title: 'Predemanda', hint: 'Requerimiento formal' },
  recuperacion_administrativa: { mark: '4A', title: 'Recuperación', hint: 'Con poder vigente' },
  via_judicial: { mark: '4B', title: 'Vía judicial', hint: 'Sin poder o resistencia' },
  cierre: { mark: '5', title: 'Cierre', hint: 'Pago, vehículo o castigo' },
};

function num(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function capitalize(text: string): string {
  return text.replace(/^\w/, (c) => c.toUpperCase());
}

function formatWeekday(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return capitalize(
    date.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', ''),
  );
}

function formatDayNum(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10));
  return Number.isFinite(day) ? String(day) : '';
}

function formatDayLong(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return capitalize(
    date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' }),
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clientHref(event: FormalProgressEventRow): string | null {
  if (event.id_sistema != null) return `/wallet?cliente=${event.id_sistema}`;
  if (event.cartera_manual_id) return '/cartera-manual';
  return null;
}

function CoverageRing({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const r = 58;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative h-[168px] w-[168px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="formal-ring-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#formal-ring-fill)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
          {pct}
          <span className="text-lg font-medium text-slate-400">%</span>
        </span>
        <span className="mt-1.5 text-[11px] font-medium text-slate-400">hoy</span>
      </div>
    </div>
  );
}

function EventList({
  title,
  count,
  events,
  loading,
  onClose,
}: {
  title: string;
  count: number;
  events: FormalProgressEventRow[];
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? 'Cargando…' : `${count} registro${count === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center"
            aria-label="Cerrar detalle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <div className="space-y-2 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-400 px-3 py-10 text-center">
              Nada registrado en este paso hoy.
            </p>
          ) : (
            <ul className="space-y-1">
              {events.map((event, index) => {
                const href = clientHref(event);
                const body = (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {event.cliente_nombre}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{event.titulo}</p>
                      {event.detalle && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.detalle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {event.resultado && (
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {event.resultado}
                          </span>
                        )}
                        {event.pendiente && (
                          <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        )}
                        {event.usuario_nombre && (
                          <span className="text-[11px] text-slate-400">{event.usuario_nombre}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0 pt-0.5">
                      {formatTime(event.occurred_at)}
                    </span>
                  </div>
                );
                return (
                  <li key={`${event.case_id}-${event.occurred_at}-${index}`}>
                    {href ? (
                      <Link
                        href={href}
                        className="block rounded-2xl px-3 py-3 hover:bg-slate-50 transition-colors"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="rounded-2xl px-3 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export function FormalProgressDashboard() {
  const {
    fecha,
    setFecha,
    data,
    isLoading,
    error,
    reload,
    selectedCategory,
    events,
    eventsLoading,
    openCategory,
    closeCategory,
  } = useFormalDailyProgress();

  const avanzados = num(data?.casos_avanzados);
  const pendientes = Math.max(0, num(data?.agenda_due) - num(data?.agenda_done));
  const selectedLabel =
    selectedCategory === 'agenda'
      ? 'Agenda de hoy'
      : STEP_META[selectedCategory ?? '']?.title ??
        data?.categorias.find((row) => row.categoria === selectedCategory)?.label ??
        'Detalle';

  const stepRows = (data?.categorias ?? []).filter((row) => STEP_META[row.categoria]);
  const aperturas = num(data?.aperturas);
  const saltos = num(data?.saltos);
  const maxStep = Math.max(1, ...stepRows.map((row) => row.cantidad));

  const toggleCategory = (categoria: FormalProgressCategoryId) => {
    if (selectedCategory === categoria) closeCategory();
    else void openCategory(categoria);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1 text-[13px] text-slate-400 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cartera
          </Link>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">
            Formal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDayLong(fecha)}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-10 rounded-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => void reload()}
            className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <FormalProgressGuide
            trigger={
              <span className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                <CircleHelp className="h-4 w-4" />
              </span>
            }
          />
        </div>
      </header>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isLoading && !data ? (
        <div className="space-y-4">
          <div className="h-56 rounded-[28px] bg-white border border-slate-100 animate-pulse" />
          <div className="h-72 rounded-[28px] bg-white border border-slate-100 animate-pulse" />
        </div>
      ) : data ? (
        <>
          <section className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory('agenda')}
              aria-pressed={selectedCategory === 'agenda'}
              className={`w-full text-left px-6 py-7 sm:px-8 sm:py-8 transition-colors ${
                selectedCategory === 'agenda' ? 'bg-violet-50/60' : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                <CoverageRing percent={num(data.cobertura)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-violet-700">Agenda Formal</p>
                  <p className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight text-slate-900 mt-1 leading-snug">
                    {data.agenda_due === 0
                      ? 'Nada programado hoy'
                      : `${data.agenda_done} de ${data.agenda_due} con gestión`}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                    {data.agenda_due === 0
                      ? 'Cuando un expediente tenga próxima acción, aquí se ve si se movió.'
                      : pendientes === 0
                        ? 'La cola de hoy está al día.'
                        : `${pendientes.toLocaleString('es-EC')} todavía esperan un paso Formal.`}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {avanzados} avanzados
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {num(data.cierres)} cierres
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {data.expedientes_abiertos.toLocaleString('es-EC')} abiertos
                    </span>
                  </div>
                </div>
              </div>
            </button>

            <div className="px-4 sm:px-6 pb-5">
              <div className="rounded-2xl bg-slate-50/80 px-2 py-3">
                <div className="flex items-end gap-1">
                  {(data.tendencia as FormalProgressTrendPoint[]).map((point) => {
                    const day = String(point.fecha ?? '').slice(0, 10);
                    const pct = num(point.cobertura);
                    const isSelected = day === String(data.fecha ?? fecha).slice(0, 10);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setFecha(day)}
                        aria-pressed={isSelected}
                        title={`${formatDayLong(day)} · ${pct}%`}
                        className={`flex-1 min-w-0 flex flex-col items-center gap-1.5 rounded-xl py-2 transition-colors ${
                          isSelected ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold tabular-nums ${
                            isSelected ? 'text-violet-700' : 'text-slate-400'
                          }`}
                        >
                          {pct}%
                        </span>
                        <div className="relative h-12 w-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className={`absolute inset-x-0 bottom-0 rounded-full ${
                              isSelected ? 'bg-violet-600' : 'bg-slate-400'
                            }`}
                            style={{ height: pct === 0 ? '3px' : `${pct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            isSelected ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {formatWeekday(day)}
                        </span>
                        <span className="text-[10px] tabular-nums text-slate-400">
                          {formatDayNum(day)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between px-1 mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Pasos de hoy</h2>
              <p className="text-xs text-slate-400">Toca uno para ver los casos</p>
            </div>

            <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-slate-100">
              {stepRows.map((row) => {
                const meta = STEP_META[row.categoria];
                const selected = selectedCategory === row.categoria;
                const fill = Math.round((row.cantidad / maxStep) * 100);
                return (
                  <button
                    key={row.categoria}
                    type="button"
                    onClick={() => toggleCategory(row.categoria)}
                    aria-pressed={selected}
                    className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                      selected ? 'bg-violet-50/80' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <span
                      className={`h-9 w-9 rounded-full text-[11px] font-semibold tabular-nums flex items-center justify-center shrink-0 ${
                        row.cantidad > 0
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {meta.mark}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">{meta.title}</p>
                        <span className="text-sm font-semibold tabular-nums text-slate-700">
                          {row.cantidad}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{meta.hint}</p>
                      <div className="mt-2.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.cantidad > 0 ? 'bg-violet-500' : 'bg-transparent'
                          }`}
                          style={{ width: `${row.cantidad > 0 ? Math.max(8, fill) : 0}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${selected ? 'text-violet-400' : 'text-slate-300'}`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 px-1 mt-4">
              <button
                type="button"
                onClick={() => toggleCategory('aperturas')}
                className={`text-xs ${
                  selectedCategory === 'aperturas' ? 'text-violet-700 font-medium' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {aperturas} expediente{aperturas === 1 ? '' : 's'} nuevo{aperturas === 1 ? '' : 's'}
              </button>
              <span className="text-slate-200">·</span>
              <button
                type="button"
                onClick={() => toggleCategory('saltos')}
                className={`text-xs ${
                  selectedCategory === 'saltos' ? 'text-violet-700 font-medium' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {saltos} salto{saltos === 1 ? '' : 's'}
              </button>
            </div>
          </section>
        </>
      ) : null}

      {selectedCategory && (
        <EventList
          title={selectedLabel}
          count={events.length}
          events={events}
          loading={eventsLoading}
          onClose={closeCategory}
        />
      )}
    </div>
  );
}
