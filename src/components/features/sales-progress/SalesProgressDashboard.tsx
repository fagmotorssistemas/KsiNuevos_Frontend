'use client';

import { AlertTriangle, RefreshCw, X, FileText, Store, MessageSquare, CircleCheck, Landmark, CalendarCheck, CalendarPlus, FileSpreadsheet, ChevronRight, ClipboardList, CircleHelp } from 'lucide-react';
import { useEffect } from 'react';
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

function citaPct(conCita: number, ingresados: number): number {
  if (ingresados <= 0) return 0;
  return Math.round((conCita / ingresados) * 100);
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

const SHOWROOM_GESTION_EMPTY: SalesProgressCategoryRow = {
  categoria: 'showroom_gestion',
  label: 'Seguimiento showroom',
  axis: 'avance',
  cantidad: 0,
  puntos_brutos: 0,
  puntos: 0,
  cap: 9,
};

function categoriesForDisplay(rows: SalesProgressCategoryRow[]): SalesProgressCategoryRow[] {
  let list = rows.filter((row) => row.categoria !== 'stale_leads' && row.categoria !== 'lead_interaction');

  if (!list.some((row) => row.categoria === 'showroom_followup')) {
    const afterContested = list.findIndex((row) => row.categoria === 'lead_status_change');
    const beforeClosed = list.findIndex((row) => row.categoria === 'lead_closed');
    const insertAt = afterContested >= 0 ? afterContested + 1 : beforeClosed >= 0 ? beforeClosed : list.length;
    list = [...list.slice(0, insertAt), SHOWROOM_EMPTY, ...list.slice(insertAt)];
  }

  if (!list.some((row) => row.categoria === 'showroom_gestion')) {
    const afterShowroom = list.findIndex((row) => row.categoria === 'showroom_followup');
    const insertAt = afterShowroom >= 0 ? afterShowroom + 1 : list.length;
    list = [...list.slice(0, insertAt), SHOWROOM_GESTION_EMPTY, ...list.slice(insertAt)];
  }

  return list;
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

function capitalize(text: string): string {
  return text.replace(/^\w/, (c) => c.toUpperCase());
}

function formatDayLong(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return capitalize(
    date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' }),
  );
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

function initials(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
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
  showroom_gestion: MessageSquare,
  lead_closed: CircleCheck,
  asesoria_advanced: Landmark,
  appointment_completed: CalendarCheck,
  proforma_generated: FileSpreadsheet,
  leads_to_cita: CalendarPlus,
  datos_faltantes: ClipboardList,
};

type CategoryTone = { wrap: string; icon: string; bar: string; pts: string; ptsWrap: string };

const CATEGORY_TONE: Record<string, CategoryTone> = {
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
  showroom_gestion: {
    wrap: 'bg-fuchsia-50',
    icon: 'text-fuchsia-600',
    bar: 'bg-fuchsia-500',
    pts: 'text-fuchsia-800',
    ptsWrap: 'bg-fuchsia-50',
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
  leads_to_cita: {
    wrap: 'bg-blue-50',
    icon: 'text-blue-600',
    bar: 'bg-blue-500',
    pts: 'text-blue-800',
    ptsWrap: 'bg-blue-50',
  },
  datos_faltantes: {
    wrap: 'bg-purple-50',
    icon: 'text-purple-600',
    bar: 'bg-purple-500',
    pts: 'text-purple-800',
    ptsWrap: 'bg-purple-50',
  },
};

const CATEGORY_UNITS: Record<string, [string, string]> = {
  lead_status_change: ['lead', 'leads'],
  showroom_followup: ['visita', 'visitas'],
  showroom_gestion: ['seguimiento', 'seguimientos'],
  lead_closed: ['ganado', 'ganados'],
  asesoria_advanced: ['asesoría', 'asesorías'],
  appointment_completed: ['cita', 'citas'],
  proforma_generated: ['proforma', 'proformas'],
};

function pointsCap(row: SalesProgressCategoryRow): number {
  if (row.categoria === 'lead_status_change') return contestedLeadCap(row);
  return Math.abs(num(row.cap)) || 1;
}

function pointsPercent(row: SalesProgressCategoryRow): number {
  if (row.categoria === 'asesoria_advanced') {
    const arrived = Math.abs(num(row.cap));
    const filled = num(row.cantidad);
    if (arrived <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((filled / arrived) * 100)));
  }
  const cap = pointsCap(row);
  if (cap <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Math.abs(num(row.puntos)) / cap) * 100)));
}

function categorySubtitle(row: SalesProgressCategoryRow): string {
  if (row.categoria === 'asesoria_advanced') {
    const arrived = Math.abs(num(row.cap));
    const filled = num(row.cantidad);
    const puntos = num(row.puntos);
    if (arrived <= 0) return 'Hoy no llegaron asesorías';
    const unit = arrived === 1 ? 'asesoría' : 'asesorías';
    return `${filled} de ${arrived} ${unit} de hoy llenas · ${puntos} pts`;
  }
  const puntos = num(row.puntos);
  const cap = pointsCap(row);
  const qty = num(row.cantidad);
  const pair = CATEGORY_UNITS[row.categoria];
  const unit = pair ? (qty === 1 ? pair[0] : pair[1]) : null;
  const ptsLine = `${puntos} de ${cap} pts`;
  if (!unit || qty <= 0 || puntos === qty) return ptsLine;
  return `${ptsLine} · ${qty} ${unit}`;
}

function ScoreRing({ points }: { points: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(points)));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="sales-ring-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="11" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#sales-ring-fill)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2rem] font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
          {Math.round(points)}
        </span>
        <span className="mt-1 text-[11px] font-medium text-slate-400">pts</span>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  subtitle,
  percent,
  selected,
  muted,
  Icon,
  tone,
  onSelect,
}: {
  label: string;
  subtitle: string;
  percent: number;
  selected: boolean;
  muted?: boolean;
  Icon: typeof FileText;
  tone: CategoryTone;
  onSelect: () => void;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const empty = muted ?? pct === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3.5 transition-colors ${
        selected ? 'bg-rose-50/80' : 'hover:bg-slate-50/80'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          empty ? 'bg-slate-100 text-slate-400' : `${tone.wrap} ${tone.icon}`
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-medium truncate ${empty ? 'text-slate-500' : 'text-slate-900'}`}>
            {label}
          </p>
          <span
            className={`text-sm font-semibold tabular-nums shrink-0 ${
              empty ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {pct}%
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
        <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${empty ? 'bg-transparent' : tone.bar}`}
            style={{ width: `${empty ? 0 : Math.max(pct, 8)}%` }}
          />
        </div>
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 ${selected ? 'text-rose-400' : 'text-slate-300'}`} />
    </button>
  );
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
  const percent = pointsPercent(row);
  return (
    <MetricBar
      label={row.label.replace(' (resumen)', '')}
      subtitle={categorySubtitle(row)}
      percent={percent}
      selected={selected}
      muted={percent === 0}
      Icon={CATEGORY_ICON[row.categoria] ?? FileText}
      tone={CATEGORY_TONE[row.categoria] ?? CATEGORY_TONE.lead_closed}
      onSelect={onSelect}
    />
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
              {loading ? 'Cargando…' : `${dayEvents.length} registro${dayEvents.length === 1 ? '' : 's'}`}
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
          ) : dayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 px-3 py-10 text-center">
              No hay acciones de este día en esta categoría.
            </p>
          ) : (
            <ul className="space-y-1">
              {dayEvents.map((event, index) => (
                <li
                  key={`${event.lead_id ?? 'x'}-${event.occurred_at}-${index}`}
                  className="rounded-2xl px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{event.lead_name || 'Sin nombre'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{prettyText(event.titulo)}</p>
                      {event.detalle && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.detalle}</p>
                      )}
                      {event.lead_phone && (
                        <p className="text-[11px] text-slate-400 mt-1">{event.lead_phone}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0 pt-0.5">
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
  const ingresados = num(data?.leads_ingresados);
  const conCita = num(data?.leads_con_cita);
  const conversionPct = citaPct(conCita, ingresados);
  const faltantesHoy = num(data?.datos_faltantes_hoy);
  const faltantesOk = num(data?.datos_faltantes_contestados);
  const faltantesPct = citaPct(faltantesOk, faltantesHoy);
  const selectedLabel =
    selectedCategory === 'leads_ingresados'
      ? 'Leads que llegaron hoy'
      : selectedCategory === 'leads_to_cita'
        ? 'Llegaron → cita'
        : selectedCategory === 'datos_faltantes'
          ? 'Info. faltante'
          : categoryRows.find((row) => row.categoria === selectedCategory)?.label ?? 'Detalle';

  const heroLeadsCat = data?.rol === 'estrancado' ? 'lead_status_change' : 'leads_ingresados';
  const toggleCategory = (categoria: string) => {
    if (selectedCategory === categoria) closeCategory();
    else void openCategory(categoria);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">
            Progreso del día
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
          <SalesProgressGuide
            trigger={
              <span className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                <CircleHelp className="h-4 w-4" />
              </span>
            }
          />
        </div>
      </header>

      {data?.es_admin && sellers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sellers
            .filter((seller) => seller.rol !== 'excluido')
            .map((seller) => {
            const active = (vendedorId ?? data.vendedor_id) === seller.id;
            return (
              <button
                key={seller.id}
                type="button"
                onClick={() => setVendedorId(seller.id)}
                className={`h-9 rounded-full px-3.5 text-sm transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {firstName(seller.full_name)}
                {seller.rol === 'estrancado' && (
                  <span className={`ml-1.5 text-[10px] font-medium ${active ? 'text-white/70' : 'text-amber-700'}`}>
                    cartera
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo calcular el progreso: {error}
        </div>
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
              onClick={() => toggleCategory(heroLeadsCat)}
              aria-pressed={selectedCategory === heroLeadsCat}
              className={`w-full text-left px-6 py-7 sm:px-8 sm:py-8 transition-colors ${
                selectedCategory === heroLeadsCat ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                <ScoreRing points={num(data.puntos_total)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-rose-700">{data.vendedor_nombre}</p>
                  <p className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight text-slate-900 mt-1 leading-snug">
                    {data.rol === 'estrancado'
                      ? `${num(data.leads_con_historial)} gestionados hoy`
                      : ingresados === 0
                        ? 'Sin leads nuevos hoy'
                        : `${ingresados} llegaron · ${num(data.leads_con_historial)} contestados`}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                    {data.rol === 'estrancado'
                      ? `${num(data.backlog_abiertos).toLocaleString('es-EC')} abiertos en cartera. El backlog no resta.`
                      : ingresados === 0
                        ? 'Cuando entren leads, aquí se ve cuántos se contestaron y cuántos pasaron a cita.'
                        : `${conCita} de ${ingresados} ya tienen cita (${conversionPct}%).`}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {num(data.puntos_total)} pts
                    </span>
                    {data.rol !== 'estrancado' && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {conversionPct}% a cita
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {num(data.puntos_avance)} avance
                    </span>
                  </div>
                </div>
              </div>
            </button>

            <div className="px-4 sm:px-6 pb-5">
              <div className="rounded-2xl bg-slate-50/80 px-2 py-3">
                <div className="flex items-center justify-between px-2 pb-2">
                  <p className="text-[11px] font-medium text-slate-400">Equipo · sáb a vie</p>
                  <p className="text-[11px] font-medium tabular-nums text-slate-500">Media {weekAvg}%</p>
                </div>
                <div className="flex items-end gap-1">
                  {trendDays.map((point) => {
                    const day = String(point.fecha ?? '').slice(0, 10);
                    const pct = trendPercent(point);
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
                            isSelected ? 'text-rose-700' : 'text-slate-400'
                          }`}
                        >
                          {pct}%
                        </span>
                        <div className="relative h-12 w-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className={`absolute inset-x-0 bottom-0 rounded-full ${
                              isSelected ? 'bg-rose-600' : pct > 0 ? 'bg-slate-400' : 'bg-slate-200'
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
                        <span className="text-[10px] tabular-nums text-slate-400">{formatDayNum(day)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {data.rol === 'estrancado' && (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Cartera estrancada · {num(data.backlog_abiertos).toLocaleString('es-EC')} abiertos
                </p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Ese backlog no resta. Suma si guarda el resumen u otras gestiones del día.
                </p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            <section className="lg:col-span-3">
              <div className="flex items-baseline justify-between px-1 mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Categorías</h2>
                <p className="text-xs text-slate-400">Toca una para ver el detalle</p>
              </div>
              <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-slate-100">
                {data.rol !== 'estrancado' && (
                  <MetricBar
                    label="Llegaron → cita"
                    subtitle={
                      ingresados === 0
                        ? 'Hoy no llegaron leads nuevos'
                        : `${conCita} de ${ingresados} leads de hoy se volvieron cita`
                    }
                    percent={conversionPct}
                    selected={selectedCategory === 'leads_to_cita'}
                    muted={ingresados === 0}
                    Icon={CalendarPlus}
                    tone={CATEGORY_TONE.leads_to_cita}
                    onSelect={() => toggleCategory('leads_to_cita')}
                  />
                )}
                {data.rol !== 'estrancado' && (
                  <MetricBar
                    label="Info. faltante"
                    subtitle={
                      faltantesHoy === 0
                        ? 'Hoy no llegaron solicitudes de info. faltante'
                        : `${faltantesOk} de ${faltantesHoy} de hoy contestadas`
                    }
                    percent={faltantesPct}
                    selected={selectedCategory === 'datos_faltantes'}
                    muted={faltantesHoy === 0}
                    Icon={ClipboardList}
                    tone={CATEGORY_TONE.datos_faltantes}
                    onSelect={() => toggleCategory('datos_faltantes')}
                  />
                )}
                {categoryRows.map((row) => (
                  <CategoryBar
                    key={row.categoria}
                    row={row}
                    selected={selectedCategory === row.categoria}
                    onSelect={() => toggleCategory(row.categoria)}
                  />
                ))}
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="flex items-baseline justify-between px-1 mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Ranking</h2>
                <p className="text-xs text-slate-400">Del día</p>
              </div>
              <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-slate-100">
                {data.ranking.length === 0 && (
                  <p className="text-sm text-slate-400 px-4 py-10 text-center">Sin vendedores activos.</p>
                )}
                {data.ranking.map((row, index) => {
                  const isMe = row.vendedor_id === data.vendedor_id;
                  return (
                    <button
                      key={row.vendedor_id}
                      type="button"
                      disabled={!data.es_admin}
                      onClick={() => data.es_admin && setVendedorId(row.vendedor_id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                        isMe ? 'bg-rose-50/70' : 'hover:bg-slate-50/80'
                      } ${data.es_admin ? '' : 'cursor-default'}`}
                    >
                      <span
                        className={`h-9 w-9 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                          isMe ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {initials(row.nombre) || index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isMe ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
                          {row.nombre}
                          {row.rol === 'estrancado' && (
                            <span className="ml-1.5 text-[10px] font-medium text-amber-700">cartera</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {row.rol === 'estrancado'
                            ? `${num(row.leads_con_historial)} gestionados`
                            : `${num(row.leads_ingresados)} llegaron · ${citaPct(num(row.leads_con_cita), num(row.leads_ingresados))}% cita`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-800">{num(row.puntos_total)}</span>
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
        </>
      ) : null}
    </div>
  );
}
