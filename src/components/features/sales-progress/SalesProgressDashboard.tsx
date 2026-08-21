'use client';

import { TrendingUp, AlertTriangle, Trophy, RefreshCw, X, FileText, Store, CircleCheck, Landmark, CalendarCheck, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useSalesDailyProgress } from '@/hooks/useSalesDailyProgress';
import { SalesProgressGuide } from '@/components/features/sales-progress/SalesProgressGuide';
import type {
  SalesProgressCategoryRow,
  SalesProgressEventRow,
  SalesProgressTrendPoint,
} from '@/types/sales-progress.types';

const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  negociando: 'Negociando',
  en_proceso: 'En proceso',
  ganado: 'Ganado',
  perdido: 'Perdido',
  pendiente: 'Pendiente',
  resuelto: 'Resuelto',
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  visita: 'Visita',
  email: 'Email',
  nota_interna: 'Nota',
  kommo: 'Kommo',
};

function prettyText(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split(/(\s|·|→)/)
    .map((part) => STATUS_LABELS[part.trim()] ?? part)
    .join('');
}

function num(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function contestedLeadCap(row: SalesProgressCategoryRow): number {
  const fromRow = Math.abs(num(row.cap));
  return fromRow > 0 ? fromRow : 40;
}

const SHOWROOM_EMPTY: SalesProgressCategoryRow = {
  categoria: 'showroom_followup',
  label: 'Visitas showroom',
  axis: 'avance',
  cantidad: 0,
  puntos_brutos: 0,
  puntos: 0,
  cap: 12,
};

function categoriesForDisplay(rows: SalesProgressCategoryRow[]): SalesProgressCategoryRow[] {
  const list = rows.filter((row) => row.categoria !== 'stale_leads' && row.categoria !== 'lead_interaction');
  if (list.some((row) => row.categoria === 'showroom_followup')) return list;

  const afterContested = list.findIndex((row) => row.categoria === 'lead_status_change');
  const beforeClosed = list.findIndex((row) => row.categoria === 'lead_closed');
  const insertAt = afterContested >= 0 ? afterContested + 1 : beforeClosed >= 0 ? beforeClosed : list.length;
  return [...list.slice(0, insertAt), SHOWROOM_EMPTY, ...list.slice(insertAt)];
}

function formatWeekday(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date
    .toLocaleDateString('es-EC', { weekday: 'short' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatDayNum(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10));
  return Number.isFinite(day) ? String(day) : '';
}

function trendPercent(point: SalesProgressTrendPoint): number {
  const team = Math.max(1, num(point.vendedores) || 3);
  const raw =
    point.porcentaje == null
      ? Math.round((num(point.puntos_total) / (team * 100)) * 100)
      : num(point.porcentaje);
  return Math.min(100, Math.max(0, raw));
}

function formatDayLong(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' });
}

function ecuadorYmd(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(date);
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

const CATEGORY_ICON: Record<string, typeof FileText> = {
  lead_status_change: FileText,
  showroom_followup: Store,
  lead_closed: CircleCheck,
  asesoria_advanced: Landmark,
  appointment_completed: CalendarCheck,
  proforma_generated: FileSpreadsheet,
};

const CATEGORY_TONE: Record<
  string,
  { wrap: string; icon: string; bar: string; pts: string; ptsWrap: string }
> = {
  lead_status_change: {
    wrap: 'bg-sky-50',
    icon: 'text-sky-600',
    bar: 'bg-sky-500',
    pts: 'text-sky-800',
    ptsWrap: 'bg-sky-50',
  },
  showroom_followup: {
    wrap: 'bg-violet-50',
    icon: 'text-violet-600',
    bar: 'bg-violet-500',
    pts: 'text-violet-800',
    ptsWrap: 'bg-violet-50',
  },
  lead_closed: {
    wrap: 'bg-emerald-50',
    icon: 'text-emerald-600',
    bar: 'bg-emerald-500',
    pts: 'text-emerald-800',
    ptsWrap: 'bg-emerald-50',
  },
  asesoria_advanced: {
    wrap: 'bg-amber-50',
    icon: 'text-amber-600',
    bar: 'bg-amber-500',
    pts: 'text-amber-800',
    ptsWrap: 'bg-amber-50',
  },
  appointment_completed: {
    wrap: 'bg-cyan-50',
    icon: 'text-cyan-600',
    bar: 'bg-cyan-500',
    pts: 'text-cyan-800',
    ptsWrap: 'bg-cyan-50',
  },
  proforma_generated: {
    wrap: 'bg-indigo-50',
    icon: 'text-indigo-600',
    bar: 'bg-indigo-500',
    pts: 'text-indigo-800',
    ptsWrap: 'bg-indigo-50',
  },
};

const CATEGORY_UNITS: Record<string, [string, string]> = {
  lead_status_change: ['lead', 'leads'],
  showroom_followup: ['visita', 'visitas'],
  lead_closed: ['ganado', 'ganados'],
  asesoria_advanced: ['asesoría', 'asesorías'],
  appointment_completed: ['cita', 'citas'],
  proforma_generated: ['proforma', 'proformas'],
};

function categoryCapLabel(row: SalesProgressCategoryRow): { done: number; max: number; unit: string } {
  const done = num(row.cantidad);
  const pair = CATEGORY_UNITS[row.categoria] ?? ['acción', 'acciones'];
  if (row.categoria === 'lead_status_change') {
    return { done, max: contestedLeadCap(row), unit: done === 1 ? pair[0] : pair[1] };
  }
  return {
    done,
    max: Math.abs(num(row.cap)) || 1,
    unit: done === 1 ? pair[0] : pair[1],
  };
}

function CategoryBar({
  row,
  selected,
  onSelect,
}: {
  row: SalesProgressCategoryRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const puntos = num(row.puntos);
  const cap = categoryCapLabel(row);
  const progressMax =
    row.categoria === 'lead_status_change' ? contestedLeadCap(row) : Math.abs(num(row.cap)) || 1;
  const progressValue = row.categoria === 'lead_status_change' ? cap.done : Math.abs(puntos);
  const width = Math.min(100, (progressValue / progressMax) * 100);
  const Icon = CATEGORY_ICON[row.categoria] ?? FileText;
  const tone = CATEGORY_TONE[row.categoria] ?? CATEGORY_TONE.lead_closed;
  const empty = cap.done === 0;
  const subtitle =
    row.categoria === 'lead_status_change'
      ? empty
        ? `Tope ${contestedLeadCap(row)} leads`
        : `${cap.done} de ${cap.max} ${cap.unit}`
      : empty
        ? `Tope ${row.cap} pts`
        : `${cap.done} ${cap.unit}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left rounded-2xl border px-3.5 py-3 transition-all duration-150 ${
        selected
          ? 'border-red-200 bg-red-50/70 shadow-sm ring-1 ring-red-100'
          : empty
            ? 'border-transparent bg-slate-50/80 hover:border-slate-200 hover:bg-white'
            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            empty ? 'bg-white text-slate-400 border border-slate-100' : `${tone.wrap} ${tone.icon}`
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-semibold leading-5 truncate ${empty ? 'text-slate-500' : 'text-slate-900'}`}>
              {row.label.replace(' (resumen)', '')}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`rounded-lg px-2 py-0.5 text-xs font-black tabular-nums ${
                  puntos < 0
                    ? 'bg-red-50 text-red-700'
                    : empty
                      ? 'bg-white text-slate-300 border border-slate-100'
                      : `${tone.ptsWrap} ${tone.pts}`
                }`}
              >
                {puntos > 0 ? '+' : ''}
                {puntos}
                <span className={`ml-0.5 font-semibold ${empty ? 'text-slate-300' : 'opacity-70'}`}>pts</span>
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  selected ? 'rotate-90 text-red-400' : 'text-slate-300'
                }`}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${empty ? 'bg-slate-200' : tone.bar}`}
              style={{ width: `${empty ? 0 : Math.max(width, 8)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function EventList({
  title,
  events,
  loading,
  onClose,
  fecha,
}: {
  title: string;
  events: SalesProgressEventRow[];
  loading: boolean;
  onClose: () => void;
  fecha: string;
}) {
  const dayKey = fecha.slice(0, 10);
  const dayEvents = events.filter((event) => ecuadorYmd(event.occurred_at) === dayKey);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar detalle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : dayEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No hay acciones de este día en esta categoría.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dayEvents.map((event, index) => (
                <li key={`${event.lead_id ?? 'x'}-${event.occurred_at}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{event.lead_name || 'Sin nombre'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{prettyText(event.titulo)}</p>
                      {event.detalle && (
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{event.detalle}</p>
                      )}
                      {event.lead_phone && (
                        <p className="text-[11px] text-slate-400 mt-1">{event.lead_phone}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0">
                      {formatTime(event.occurred_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export function SalesProgressDashboard() {
  const {
    fecha,
    setFecha,
    vendedorId,
    setVendedorId,
    data,
    sellers,
    isLoading,
    error,
    reload,
    selectedCategory,
    events,
    eventsLoading,
    openCategory,
    closeCategory,
  } = useSalesDailyProgress();

  const categoryRows = categoriesForDisplay(data?.categorias ?? []);
  const trendDays = data?.tendencia ?? [];
  const weekAvg = Math.round(
    trendDays.reduce((sum, point) => sum + trendPercent(point), 0) / Math.max(1, trendDays.length)
  );
  const selectedLabel =
    selectedCategory === 'leads_ingresados'
      ? 'Leads que llegaron hoy'
      : categoryRows.find((row) => row.categoria === selectedCategory)?.label ?? 'Detalle';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-red-600" />
            Progreso del día
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Felipe, Vanessa y Xavier: pipeline del día. Juan: cartera estrancada (no resta por backlog).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
          />
          {data?.es_admin && sellers.length > 0 && (
            <select
              value={vendedorId ?? data.vendedor_id}
              onChange={(e) => setVendedorId(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm min-w-[180px]"
            >
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.rol === 'estrancado' ? `${seller.full_name} (estrancados)` : seller.full_name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => void reload()}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <SalesProgressGuide />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo calcular el progreso: {error}
        </div>
      )}

      {isLoading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Kpi
              label="Puntos del día"
              value={num(data.puntos_total)}
              hint={data.vendedor_nombre}
              accent="text-slate-900"
            />
            <button
              type="button"
              onClick={() => {
                const cat = data.rol === 'estrancado' ? 'lead_status_change' : 'leads_ingresados';
                selectedCategory === cat ? closeCategory() : void openCategory(cat);
              }}
              className="text-left w-full"
            >
              <Kpi
                label={data.rol === 'estrancado' ? 'Gestionados hoy' : 'Leads del día'}
                value={
                  data.rol === 'estrancado'
                    ? num(data.leads_con_historial)
                    : num(data.leads_ingresados)
                }
                hint={
                  data.rol === 'estrancado'
                    ? `${num(data.backlog_abiertos).toLocaleString('es-EC')} en cartera · ver detalle`
                    : `${num(data.leads_con_historial)} contestados hoy · ver lista`
                }
                accent="text-slate-900"
                selected={
                  selectedCategory ===
                  (data.rol === 'estrancado' ? 'lead_status_change' : 'leads_ingresados')
                }
              />
            </button>
            <Kpi
              label="Avance"
              value={num(data.puntos_avance)}
              hint="Resumen, ganado, citas, crédito"
              accent="text-emerald-700"
            />
          </div>

          {data.rol === 'estrancado' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Encargado de cartera estrancada · {num(data.backlog_abiertos).toLocaleString('es-EC')} abiertos
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Ese backlog no resta puntos. Suma si les guarda el resumen ejecutivo u otras gestiones del día.
                </p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-4">
            <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Categorías</h2>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    Lo hecho el {formatDayLong(fecha)}
                  </p>
                </div>
                <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1 shrink-0">
                  Ver detalle
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {categoryRows.map((row) => (
                  <CategoryBar
                    key={row.categoria}
                    row={row}
                    selected={selectedCategory === row.categoria}
                    onSelect={() =>
                      selectedCategory === row.categoria ? closeCategory() : void openCategory(row.categoria)
                    }
                  />
                ))}
              </div>
            </section>

            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Ranking del día
                </h2>
              </div>
              <div className="p-3 space-y-1">
                {data.ranking.length === 0 && (
                  <p className="text-sm text-slate-400 px-2 py-6 text-center">Sin vendedores activos.</p>
                )}
                {data.ranking.map((row, index) => {
                  const isMe = row.vendedor_id === data.vendedor_id;
                  return (
                    <button
                      key={row.vendedor_id}
                      type="button"
                      disabled={!data.es_admin}
                      onClick={() => data.es_admin && setVendedorId(row.vendedor_id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${
                        isMe ? 'bg-red-50 border border-red-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-6 text-xs font-black text-slate-400 tabular-nums">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm flex items-center gap-2 min-w-0 ${isMe ? 'font-bold text-red-800' : 'font-medium text-slate-800'}`}>
                          <span className="truncate">{row.nombre}</span>
                          {row.rol === 'estrancado' && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                              Estrancados
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {row.rol === 'estrancado'
                            ? `${num(row.leads_con_historial)} gestionados hoy · ${num(row.backlog_abiertos).toLocaleString('es-EC')} en cartera`
                            : `${num(row.leads_ingresados)} llegaron · ${num(row.leads_con_historial)} contestados`}
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-slate-900">{num(row.puntos_total)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {selectedCategory && (
            <EventList
              title={`${selectedLabel} · ${formatDayLong(fecha)}`}
              events={events}
              fecha={fecha}
              loading={eventsLoading}
              onClose={closeCategory}
            />
          )}

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Tendencia semanal</h2>
                <p className="text-xs text-slate-400 mt-0.5">Sábado a viernes · 100% = día perfecto del equipo</p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-600 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1 shrink-0">
                Media {weekAvg}%
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-1.5 sm:gap-2">
                {trendDays.map((point) => {
                  const day = String(point.fecha ?? '').slice(0, 10);
                  const pct = trendPercent(point);
                  const isSelected = day === String(data.fecha ?? fecha).slice(0, 10);
                  const fill =
                    isSelected ? 'bg-red-600' : pct >= 50 ? 'bg-slate-800' : pct > 0 ? 'bg-slate-400' : 'bg-slate-200';
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setFecha(day)}
                      aria-pressed={isSelected}
                      title={`${formatDayLong(day)} · ${pct}%`}
                      className={`flex-1 min-w-0 flex flex-col items-center gap-2 rounded-2xl px-1 py-2 transition-colors ${
                        isSelected ? 'bg-red-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          isSelected ? 'text-red-700' : pct === 0 ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {pct}%
                      </span>
                      <div className="relative h-36 w-8 sm:w-9">
                        <div className="absolute inset-0 rounded-full bg-slate-100" />
                        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/80 pointer-events-none" />
                        <div
                          className={`absolute inset-x-0 bottom-0 rounded-full ${fill}`}
                          style={{ height: pct === 0 ? '6px' : `${pct}%` }}
                        />
                      </div>
                      <div className="text-center leading-tight">
                        <p className={`text-[11px] font-semibold ${isSelected ? 'text-red-700' : 'text-slate-600'}`}>
                          {formatWeekday(day)}
                        </p>
                        <p className={`text-[11px] tabular-nums ${isSelected ? 'text-red-600' : 'text-slate-400'}`}>
                          {formatDayNum(day)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  icon,
  selected,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
  icon?: ReactNode;
  selected?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 h-full ${selected ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-3xl font-black tabular-nums mt-1 ${accent}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1 truncate">{hint}</p>
    </div>
  );
}
