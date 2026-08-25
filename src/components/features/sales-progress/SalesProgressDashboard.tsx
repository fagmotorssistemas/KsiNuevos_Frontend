'use client';

import { AlertTriangle, RefreshCw, X, FileText, MessageSquare, Landmark, CalendarCheck, CalendarPlus, FileSpreadsheet, ChevronRight, ClipboardList, CircleHelp, Bot, ShoppingCart, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSalesDailyProgress } from '@/hooks/useSalesDailyProgress';
import { SalesProgressGuide } from '@/components/features/sales-progress/SalesProgressGuide';
import {
  todayEcuadorDate,
  type SalesProgressEventRow,
  type SalesProgressRankingRow,
  type SalesProgressTrendPoint,
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

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function saturdayOnOrBefore(date: Date): Date {
  return addUtcDays(date, -((date.getUTCDay() + 1) % 7));
}

type MonthWeek = {
  n: number;
  start: string;
  end: string;
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];

function weeksOfMonth(year: number, month: number): MonthWeek[] {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const last = new Date(Date.UTC(year, month, 0, 12));
  let cursor = saturdayOnOrBefore(first);
  const weeks: MonthWeek[] = [];
  let n = 1;
  while (cursor <= last) {
    const friday = addUtcDays(cursor, 6);
    const start = cursor < first ? first : cursor;
    const end = friday > last ? last : friday;
    weeks.push({ n, start: toYmd(start), end: toYmd(end) });
    n += 1;
    cursor = addUtcDays(cursor, 7);
  }
  return weeks;
}

function dateForMonth(year: number, month: number, today: string): string {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  if (today.slice(0, 7) === key) return today;
  return toYmd(new Date(Date.UTC(year, month, 0, 12)));
}

function dateForWeek(week: MonthWeek, today: string): string {
  if (today >= week.start && today <= week.end) return today;
  return week.end;
}

function PeriodFilter({
  fecha,
  onChange,
}: {
  fecha: string;
  onChange: (next: string) => void;
}) {
  const { supabase } = useAuth();
  const today = todayEcuadorDate();
  const todayYear = Number(today.slice(0, 4));
  const day = fecha.slice(0, 10);
  const [year, month] = day.split('-').map(Number);
  const weeks = weeksOfMonth(year, month);
  const activeWeek = weeks.find((week) => day >= week.start && day <= week.end)?.n ?? null;
  const [open, setOpen] = useState(false);
  const [panelYear, setPanelYear] = useState(year);
  const [years, setYears] = useState<number[]>([todayYear]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('leads')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const raw = data?.[0]?.created_at;
        const minYear = raw
          ? Number(
              new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric' }).format(
                new Date(raw)
              )
            )
          : todayYear;
        const list: number[] = [];
        for (let y = Math.min(minYear, todayYear); y <= todayYear; y += 1) list.push(y);
        setYears(list);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, todayYear]);

  useEffect(() => {
    if (!open) return;
    setPanelYear(year);
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, year]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
          className="h-10 rounded-full border border-slate-200 bg-white pl-3.5 pr-3 text-sm text-slate-700 inline-flex items-center gap-1.5 hover:border-slate-300"
        >
          <span className="font-medium">{MONTH_LABELS[month - 1]}</span>
          <span className="text-slate-400">{year}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div
            role="dialog"
            aria-label="Elegir mes"
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[272px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
          >
            {years.length > 1 && (
              <div className="flex gap-1 mb-3">
                {years.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPanelYear(item)}
                    className={`h-8 flex-1 rounded-full text-sm font-medium tabular-nums ${
                      item === panelYear
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-4 gap-1">
              {MONTH_LABELS.map((label, index) => {
                const nextMonth = index + 1;
                const key = `${panelYear}-${String(nextMonth).padStart(2, '0')}`;
                const reachable = key <= today.slice(0, 7);
                const active = panelYear === year && nextMonth === month;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!reachable}
                    onClick={() => {
                      onChange(dateForMonth(panelYear, nextMonth, today));
                      setOpen(false);
                    }}
                    className={`h-9 rounded-xl text-sm font-medium ${
                      !reachable
                        ? 'cursor-not-allowed text-slate-300'
                        : active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex h-10 items-center rounded-full border border-slate-200 bg-white p-0.5">
        <span className="pl-2.5 pr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Sem
        </span>
        {weeks.map((week) => {
          const reachable = week.start <= today;
          const active = week.n === activeWeek;
          return (
            <button
              key={week.n}
              type="button"
              disabled={!reachable}
              title={
                reachable
                  ? `Semana ${week.n} · ${week.start.slice(8)}–${week.end.slice(8)}`
                  : `Semana ${week.n} · aún no llega`
              }
              onClick={() => onChange(dateForWeek(week, today))}
              className={`h-9 min-w-9 rounded-full px-2.5 text-sm font-medium tabular-nums transition-colors ${
                !reachable
                  ? 'cursor-not-allowed text-slate-300'
                  : active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {week.n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

function eventTab(category: string, recurso: string): string {
  if (
    recurso === 'lead_datos' ||
    category === 'datos_faltantes' ||
    category === 'quedados_faltante' ||
    category === 'faltante_sin_salir'
  ) {
    return 'datos_pedidos';
  }
  if (recurso === 'pedidos' || category === 'quedados_pedidos') {
    return 'requests';
  }
  if (
    recurso === 'lead_asesoria' ||
    category === 'asesoria_advanced' ||
    category === 'quedados_asesoria' ||
    category === 'asesoria_sin_salir'
  ) {
    return 'asesoria_financiamiento';
  }
  if (
    recurso === 'agenda' ||
    category === 'seguimientos_ia' ||
    category === 'citas_sin_gestionar' ||
    category === 'leads_to_cita' ||
    category === 'appointment_completed'
  ) {
    return 'agenda';
  }
  if (recurso === 'showroom' || category === 'showroom_sin_gestion' || category === 'showroom_followup') {
    return 'showroom';
  }
  return 'history';
}

function eventHref(event: SalesProgressEventRow, category: string | null): string | null {
  if (event.lead_id) {
    return `/leads?lead=${event.lead_id}&tab=${eventTab(category ?? '', event.recurso)}`;
  }
  if (event.recurso === 'showroom' || category === 'showroom_sin_gestion') return '/showroom';
  if (event.recurso === 'agenda') return '/agenda';
  if (event.recurso === 'pedidos' || category === 'quedados_pedidos') return '/requests';
  return null;
}

type Duty = { due: number; done: number };

function dutyCoverage(duties: Duty[]): { due: number; done: number; pct: number } {
  const active = duties.filter((duty) => duty.due > 0);
  const due = active.reduce((sum, duty) => sum + duty.due, 0);
  const done = active.reduce((sum, duty) => sum + Math.min(duty.done, duty.due), 0);
  return { due, done, pct: due <= 0 ? 0 : Math.round((done / due) * 100) };
}

function rankingDutyPct(row: SalesProgressRankingRow): number | null {
  const duties: Duty[] = [];
  if (row.rol !== 'estrancado' && num(row.leads_ingresados) > 0) {
    duties.push({ due: num(row.leads_ingresados), done: num(row.leads_con_historial) });
  }
  if (num(row.ia_due) > 0) duties.push({ due: num(row.ia_due), done: num(row.ia_agendadas) });
  if (num(row.citas_due) > 0) duties.push({ due: num(row.citas_due), done: num(row.citas_gestionadas) });
  if (num(row.showroom_visitas) > 0) {
    duties.push({ due: num(row.showroom_visitas), done: num(row.showroom_con_gestion) });
  }
  if (duties.length === 0) return null;
  return dutyCoverage(duties).pct;
}

function buildBriefing(input: {
  name: string;
  rol: string;
  iaDue: number;
  iaDone: number;
  iaPend: number;
  iaVencidas: number;
  ingresados: number;
  contestados: number;
  contestadosPct: number;
  semanaPct: number;
  semanaIngresados: number;
  semanaContestados: number;
  faltanteSinSalir: number;
  faltantesOk: number;
  asesoriaSinSalir: number;
  asesoriaRespondidas: number;
  faltanteQuedados: number;
  asesoriaQuedados: number;
}): { good: string | null; bad: string | null } {
  const name = input.name;
  const good: string[] = [];
  const bad: string[] = [];

  if (input.iaDue > 0 && input.iaPend === 0) {
    good.push(`${input.iaDone} de ${input.iaDue} seguimientos IA agendados`);
  }
  if (input.iaPend > 0) {
    bad.push(`no agendó ${input.iaPend} seguimiento${input.iaPend === 1 ? '' : 's'} IA de hoy`);
  }
  if (input.iaVencidas > 0) {
    bad.push(`arrastra ${input.iaVencidas} IA vencido${input.iaVencidas === 1 ? '' : 's'}`);
  }

  if (input.rol !== 'estrancado' && input.ingresados > 0 && input.contestadosPct >= 70) {
    good.push(`${input.contestados} de ${input.ingresados} contestados`);
  }
  if (input.rol !== 'estrancado' && input.ingresados > 0 && input.semanaIngresados > 0) {
    if (input.semanaPct - input.contestadosPct >= 15) {
      bad.push(
        `hoy ${input.contestadosPct}%; la semana (sáb–vie) va en ${input.semanaPct}% (${input.semanaContestados} de ${input.semanaIngresados})`
      );
    }
  }

  if (input.faltanteSinSalir > 0) {
    bad.push(
      `${input.faltanteSinSalir} de ${Math.max(input.faltantesOk, input.faltanteSinSalir)} que contestó no salió de info. faltante`
    );
  }
  if (input.asesoriaSinSalir > 0) {
    bad.push(
      `${input.asesoriaSinSalir} de ${Math.max(input.asesoriaRespondidas, input.asesoriaSinSalir)} no salió de financiamiento`
    );
  }

  if (good.length === 0 && input.faltanteQuedados + input.asesoriaQuedados === 0 && bad.length === 0) {
    return { good: null, bad: null };
  }

  return {
    good: good.length ? `${name}: ${good.slice(0, 2).join('. ')}.` : null,
    bad:
      bad.length > 0
        ? `${name}: ${bad.slice(0, 2).join('. ')}.`
        : input.faltanteQuedados + input.asesoriaQuedados > 0
          ? `${name}: ${input.faltanteQuedados} info. faltante y ${input.asesoriaQuedados} financiamiento quedados.`
          : null,
  };
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

function iaEventRank(titulo: string): number {
  const t = titulo.toLowerCase();
  if (t.includes('vencida')) return 0;
  if (t.includes('sin agendar') || t.includes('sin gestión') || t.includes('sin gestion')) return 1;
  return 2;
}

function iaEventWrap(titulo: string): string {
  const t = titulo.toLowerCase();
  if (t.includes('vencida')) return 'bg-amber-50';
  if (t.includes('sin agendar') || t.includes('sin gestión') || t.includes('sin gestion')) return 'bg-rose-50/70';
  if (t.includes('agendada') || t.includes('gestionada')) return 'bg-emerald-50/70';
  return '';
}

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
  seguimientos_ia: {
    wrap: 'bg-rose-50',
    icon: 'text-rose-600',
    bar: 'bg-rose-500',
    pts: 'text-rose-800',
    ptsWrap: 'bg-rose-50',
  },
  citas_sin_gestionar: {
    wrap: 'bg-cyan-50',
    icon: 'text-cyan-600',
    bar: 'bg-cyan-500',
    pts: 'text-cyan-800',
    ptsWrap: 'bg-cyan-50',
  },
  showroom_sin_gestion: {
    wrap: 'bg-violet-50',
    icon: 'text-violet-600',
    bar: 'bg-violet-500',
    pts: 'text-violet-800',
    ptsWrap: 'bg-violet-50',
  },
  datos_faltantes: {
    wrap: 'bg-purple-50',
    icon: 'text-purple-600',
    bar: 'bg-purple-500',
    pts: 'text-purple-800',
    ptsWrap: 'bg-purple-50',
  },
  quedados_pedidos: {
    wrap: 'bg-orange-50',
    icon: 'text-orange-600',
    bar: 'bg-orange-500',
    pts: 'text-orange-800',
    ptsWrap: 'bg-orange-50',
  },
};

function CoverageRing({ percent, weekPercent }: { percent: number; weekPercent: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const weekPct = Math.min(100, Math.max(0, Math.round(weekPercent)));
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
          {pct}
          <span className="text-lg font-medium text-slate-400">%</span>
        </span>
        <span className="mt-1 text-[11px] font-medium text-slate-400">hoy</span>
        <span className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-500">
          {weekPct}% sem
        </span>
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

function EventList({
  title,
  events,
  loading,
  onClose,
  fecha,
  showAll,
  category,
}: {
  title: string;
  events: SalesProgressEventRow[];
  loading: boolean;
  onClose: () => void;
  fecha: string;
  showAll?: boolean;
  category: string | null;
}) {
  const dayKey = fecha.slice(0, 10);
  const dayEvents = showAll
    ? events
    : events.filter((event) => ecuadorYmd(event.occurred_at) === dayKey);

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
              {loading
                ? 'Cargando…'
                : `${dayEvents.length} registro${dayEvents.length === 1 ? '' : 's'}${
                    category === 'seguimientos_ia'
                      ? ' · hoy y vencidos (14 días)'
                      : category?.startsWith('quedados_')
                        ? ' · montón abierto (toca uno para abrirlo)'
                        : ' · toca un nombre para abrirlo'
                  }`}
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
              {category === 'seguimientos_ia'
                ? 'El bot no mandó seguimientos para este día, ni hay vencidos de 14 días.'
                : category?.startsWith('quedados_')
                  ? 'No hay quedados en esta cola.'
                  : 'No hay acciones de este día en esta categoría.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {[...dayEvents]
                .sort((a, b) => iaEventRank(a.titulo) - iaEventRank(b.titulo))
                .map((event, index) => {
                  const href = eventHref(event, category);
                  const body = (
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
                  );
                  return (
                    <li
                      key={`${event.lead_id ?? 'x'}-${event.occurred_at}-${index}`}
                      className={`rounded-2xl px-3 py-3 ${iaEventWrap(event.titulo)}`}
                    >
                      {href ? (
                        <Link href={href} className="block hover:opacity-80" onClick={onClose}>
                          {body}
                        </Link>
                      ) : (
                        body
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

  const categoryRows = data?.categorias ?? [];
  const trendDays = data?.tendencia ?? [];
  const weekAvg = Math.round(
    trendDays.reduce((sum, point) => sum + trendPercent(point), 0) / Math.max(1, trendDays.length)
  );
  const ingresados = num(data?.leads_ingresados);
  const contestados = num(data?.leads_con_historial);
  const conCita = num(data?.leads_con_cita);
  const conversionPct = citaPct(conCita, ingresados);
  const contestadosPct = citaPct(contestados, ingresados);
  const faltantesHoy = num(data?.datos_faltantes_hoy);
  const faltantesOk = num(data?.datos_faltantes_contestados);
  const faltantesPct = citaPct(faltantesOk, faltantesHoy);
  const iaDue = num(data?.ia_due);
  const iaDone = num(data?.ia_agendadas);
  const iaPend = num(data?.ia_pendientes);
  const iaVencidas = num(data?.ia_vencidas);
  const iaPct = citaPct(iaDone, iaDue);
  const citasDue = num(data?.citas_due);
  const citasOk = num(data?.citas_gestionadas);
  const citasPct = citaPct(citasOk, citasDue);
  const showVisitas = num(data?.showroom_visitas);
  const showOk = num(data?.showroom_con_gestion);
  const showPct = citaPct(showOk, showVisitas);
  const asesoriaHoy = num(data?.asesoria_hoy);
  const asesoriaOk = num(data?.asesoria_llenas);
  const asesoriaPct = citaPct(asesoriaOk, asesoriaHoy);
  const proformaQty = num(categoryRows.find((row) => row.categoria === 'proforma_generated')?.cantidad);
  const histCita = num(data?.hist_cita_pct);
  const histIa = num(data?.hist_ia_pct);
  const histShowroom = num(data?.hist_showroom_pct);
  const semanaPct = num(data?.semana_contestados_pct);
  const semanaIngresados = num(data?.semana_ingresados);
  const semanaContestados = num(data?.semana_contestados);
  const faltanteQuedados = num(data?.faltante_quedados);
  const asesoriaQuedados = num(data?.asesoria_quedados);
  const pedidosQuedados = num(data?.pedidos_quedados);
  const faltanteSinSalir = num(data?.faltante_sin_salir);
  const asesoriaSinSalir = num(data?.asesoria_sin_salir);
  const asesoriaRespondidas = num(data?.asesoria_respondidas);
  const fulfilling = dutyCoverage(
    [
      data?.rol !== 'estrancado' && ingresados > 0 ? { due: ingresados, done: contestados } : null,
      iaDue > 0 ? { due: iaDue, done: iaDone } : null,
      citasDue > 0 ? { due: citasDue, done: citasOk } : null,
      showVisitas > 0 ? { due: showVisitas, done: showOk } : null,
      data?.rol !== 'estrancado' && faltantesHoy > 0 ? { due: faltantesHoy, done: faltantesOk } : null,
      asesoriaHoy > 0 ? { due: asesoriaHoy, done: asesoriaOk } : null,
    ].filter(Boolean) as Duty[]
  );
  const briefing = data
    ? buildBriefing({
        name: firstName(data.vendedor_nombre),
        rol: data.rol,
        iaDue,
        iaDone,
        iaPend,
        iaVencidas,
        ingresados,
        contestados,
        contestadosPct,
        semanaPct,
        semanaIngresados,
        semanaContestados,
        faltanteSinSalir,
        faltantesOk,
        asesoriaSinSalir,
        asesoriaRespondidas,
        faltanteQuedados,
        asesoriaQuedados,
      })
    : { good: null, bad: null };
  const coveragePct = data?.rol === 'estrancado' ? Math.min(100, contestados) : contestadosPct;
  const selectedLabel =
    selectedCategory === 'leads_ingresados'
      ? 'Leads que llegaron hoy'
      : selectedCategory === 'leads_to_cita'
        ? 'Llegaron → cita'
        : selectedCategory === 'datos_faltantes'
          ? 'Info. faltante'
          : selectedCategory === 'seguimientos_ia'
            ? 'Seguimientos IA'
            : selectedCategory === 'citas_sin_gestionar'
              ? 'Citas de agenda'
              : selectedCategory === 'showroom_sin_gestion'
                ? 'Seguimiento showroom'
                : selectedCategory === 'quedados_faltante'
                  ? 'Quedados · info. faltante'
                  : selectedCategory === 'quedados_asesoria'
                    ? 'Quedados · financiamiento'
                    : selectedCategory === 'quedados_pedidos'
                      ? 'Quedados · pedidos'
                      : selectedCategory === 'faltante_sin_salir'
                      ? 'Contestó · no salió de info. faltante'
                      : selectedCategory === 'asesoria_sin_salir'
                        ? 'Respondió · no salió de financiamiento'
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
          <p className="text-sm text-slate-500 mt-0.5">
            {formatDayLong(fecha)} · haciendo, quedados y lo que se cumplió
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <PeriodFilter fecha={fecha} onChange={setFecha} />
          <input
            type="date"
            value={fecha}
            max={todayEcuadorDate()}
            onChange={(e) => setFecha(e.target.value)}
            className="h-10 rounded-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700"
            aria-label="Día"
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
                <CoverageRing percent={coveragePct} weekPercent={semanaPct} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-rose-700">{data.vendedor_nombre}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mt-1">
                    Haciendo para vender
                  </p>
                  <p className="text-2xl sm:text-[1.7rem] font-semibold tracking-tight text-slate-900 mt-1 leading-snug">
                    {data.rol === 'estrancado'
                      ? `${contestados} gestionados hoy`
                      : ingresados === 0
                        ? 'Sin leads nuevos hoy'
                        : `${contestados} de ${ingresados} contestados (${contestadosPct}%)`}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 max-w-xl leading-relaxed">
                    {briefing.good && (
                      <span className="text-emerald-800">Cumpliendo. {briefing.good} </span>
                    )}
                    {briefing.bad && (
                      <span className="text-amber-900">Se quedaron. {briefing.bad}</span>
                    )}
                    {!briefing.good && !briefing.bad && (
                      data.rol === 'estrancado'
                        ? `${num(data.backlog_abiertos).toLocaleString('es-EC')} abiertos en cartera. El backlog no resta.`
                        : ingresados === 0
                          ? 'Cuando entren leads, aquí se ve cuánto se está haciendo para vender.'
                          : `Esta semana (sáb–vie): ${semanaContestados} de ${semanaIngresados} contestados (${semanaPct}%).`
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    {fulfilling.due > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                        Cumpliendo {fulfilling.done} de {fulfilling.due} ({fulfilling.pct}%)
                      </span>
                    )}
                    {data.rol !== 'estrancado' && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {conCita} de {ingresados} a cita
                      </span>
                    )}
                    {data.rol !== 'estrancado' && semanaIngresados > 0 && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Semana {semanaContestados} de {semanaIngresados} contestados ({semanaPct}%)
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      IA {iaDone} de {iaDue || 0}
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

          <section className="rounded-[28px] border border-slate-200/80 bg-white px-5 py-4">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <p className="text-sm font-semibold text-slate-900">En qué nos quedamos</p>
              <p className="text-xs text-slate-400">Montón abierto, no lo de hoy</p>
            </div>
            <div className="mt-3 grid sm:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    key: 'quedados_faltante',
                    label: 'Info. faltante',
                    count: faltanteQuedados,
                    Icon: ClipboardList,
                    tone: CATEGORY_TONE.datos_faltantes,
                  },
                  {
                    key: 'quedados_asesoria',
                    label: 'Financiamiento',
                    count: asesoriaQuedados,
                    Icon: Landmark,
                    tone: CATEGORY_TONE.asesoria_advanced,
                  },
                  {
                    key: 'quedados_pedidos',
                    label: 'Pedidos',
                    count: pedidosQuedados,
                    Icon: ShoppingCart,
                    tone: CATEGORY_TONE.quedados_pedidos,
                  },
                ] as const
              ).map((cola) => (
                <button
                  key={cola.key}
                  type="button"
                  onClick={() => toggleCategory(cola.key)}
                  aria-pressed={selectedCategory === cola.key}
                  className={`rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    selectedCategory === cola.key
                      ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-200'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cola.tone.wrap} ${cola.tone.icon}`}
                    >
                      <cola.Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{cola.label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {cola.count === 0 ? 'Ninguno abierto' : `${cola.count} abiertos · ver lista`}
                      </span>
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${
                        selectedCategory === cola.key ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </section>

          {(() => {
            const omissions = [
              iaPend + iaVencidas > 0 && {
                key: 'seguimientos_ia',
                label: 'Seguimientos IA sin agendar',
                detail: [iaPend > 0 ? `${iaPend} de hoy` : null, iaVencidas > 0 ? `${iaVencidas} vencidos` : null]
                  .filter(Boolean)
                  .join(' · '),
              },
              citasDue - citasOk > 0 && {
                key: 'citas_sin_gestionar',
                label: 'Citas sin gestión',
                detail: `${citasDue - citasOk} de ${citasDue} sin vino / no vino`,
              },
              showVisitas - showOk > 0 && {
                key: 'showroom_sin_gestion',
                label: 'Showroom sin seguimiento',
                detail: `${showVisitas - showOk} de ${showVisitas} sin nota (primero la llamada)`,
              },
              faltantesHoy - faltantesOk > 0 && {
                key: 'datos_faltantes',
                label: 'Info. faltante sin contestar',
                detail: `${faltantesHoy - faltantesOk} de ${faltantesHoy}`,
              },
              faltanteSinSalir > 0 && {
                key: 'faltante_sin_salir',
                label: 'Contestó · no salió de info. faltante',
                detail: `${faltanteSinSalir} de ${Math.max(faltantesOk, faltanteSinSalir)} siguen en proceso`,
              },
              asesoriaHoy - asesoriaOk > 0 && {
                key: 'asesoria_advanced',
                label: 'Financiamiento incompleto',
                detail: `${asesoriaHoy - asesoriaOk} de ${asesoriaHoy} sin todos los datos`,
              },
              asesoriaSinSalir > 0 && {
                key: 'asesoria_sin_salir',
                label: 'Respondió · no salió de financiamiento',
                detail: `${asesoriaSinSalir} de ${Math.max(asesoriaRespondidas, asesoriaSinSalir)} siguen en proceso`,
              },
            ].filter(Boolean) as { key: string; label: string; detail: string }[];

            if (omissions.length === 0) return null;
            return (
              <section className="rounded-[28px] border border-amber-200/80 bg-amber-50/70 px-5 py-4">
                <p className="text-sm font-semibold text-amber-950">Se quedaron de hacer</p>
                <ul className="mt-2 space-y-1">
                  {omissions.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(item.key)}
                        className="w-full text-left rounded-xl px-2 py-1.5 hover:bg-white/70 flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-amber-950">{item.label}</span>
                        <span className="text-xs text-amber-800/80 tabular-nums shrink-0">{item.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

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
                <h2 className="text-sm font-semibold text-slate-900">Haciendo para vender</h2>
                <p className="text-xs text-slate-400">X de Y del oficio</p>
              </div>
              <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-slate-100">
                <MetricBar
                  label="Seguimientos IA"
                  subtitle={
                    iaDue === 0 && iaVencidas === 0
                      ? 'El bot no mandó seguimientos para hoy'
                      : `${iaDone} de ${iaDue} agendados hoy · ${iaVencidas} vencidos · hist. ${histIa}%`
                  }
                  percent={iaDue === 0 ? (iaVencidas > 0 ? 0 : 0) : iaPct}
                  selected={selectedCategory === 'seguimientos_ia'}
                  muted={iaDue === 0 && iaVencidas === 0}
                  Icon={Bot}
                  tone={CATEGORY_TONE.seguimientos_ia}
                  onSelect={() => toggleCategory('seguimientos_ia')}
                />
                <MetricBar
                  label="Citas de agenda"
                  subtitle={
                    citasDue === 0
                      ? 'Hoy no hay citas en agenda'
                      : `${citasOk} de ${citasDue} con vino / no vino`
                  }
                  percent={citasPct}
                  selected={selectedCategory === 'citas_sin_gestionar'}
                  muted={citasDue === 0}
                  Icon={CalendarCheck}
                  tone={CATEGORY_TONE.citas_sin_gestionar}
                  onSelect={() => toggleCategory('citas_sin_gestionar')}
                />
                <MetricBar
                  label="Seguimiento showroom"
                  subtitle={
                    showVisitas === 0
                      ? 'Hoy no registraron visitas'
                      : `${showOk} de ${showVisitas} con seguimiento · hist. ${histShowroom}%`
                  }
                  percent={showPct}
                  selected={selectedCategory === 'showroom_sin_gestion'}
                  muted={showVisitas === 0}
                  Icon={MessageSquare}
                  tone={CATEGORY_TONE.showroom_sin_gestion}
                  onSelect={() => toggleCategory('showroom_sin_gestion')}
                />
                {data.rol !== 'estrancado' && (
                  <MetricBar
                    label="Llegaron → cita"
                    subtitle={
                      ingresados === 0
                        ? 'Hoy no llegaron leads nuevos'
                        : `${conCita} de ${ingresados} leads de hoy se volvieron cita · hist. ${histCita}%`
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
                        ? faltanteQuedados > 0
                          ? `Hoy no llegaron nuevas · ${faltanteQuedados} quedados abiertos`
                          : 'Hoy no llegaron solicitudes de info. faltante'
                        : `${faltantesOk} de ${faltantesHoy} de hoy contestadas${
                            faltanteSinSalir > 0 ? ` · ${faltanteSinSalir} no salieron de etapa` : ''
                          }`
                    }
                    percent={faltantesPct}
                    selected={selectedCategory === 'datos_faltantes'}
                    muted={faltantesHoy === 0}
                    Icon={ClipboardList}
                    tone={CATEGORY_TONE.datos_faltantes}
                    onSelect={() => toggleCategory('datos_faltantes')}
                  />
                )}
                <MetricBar
                  label="Financiamiento"
                  subtitle={
                    asesoriaHoy === 0
                      ? asesoriaQuedados > 0
                        ? `Hoy no llegaron nuevas · ${asesoriaQuedados} quedados abiertos`
                        : 'Hoy no llegaron asesorías'
                      : `${asesoriaOk} de ${asesoriaHoy} fichas llenas${
                          asesoriaSinSalir > 0 ? ` · ${asesoriaSinSalir} no salieron de etapa` : ''
                        }`
                  }
                  percent={asesoriaPct}
                  selected={selectedCategory === 'asesoria_advanced'}
                  muted={asesoriaHoy === 0}
                  Icon={Landmark}
                  tone={CATEGORY_TONE.asesoria_advanced}
                  onSelect={() => toggleCategory('asesoria_advanced')}
                />
                <MetricBar
                  label="Proforma PDF"
                  subtitle={proformaQty > 0 ? `${proformaQty} generada${proformaQty === 1 ? '' : 's'} hoy` : 'Hoy no generaron PDF'}
                  percent={proformaQty > 0 ? 100 : 0}
                  selected={selectedCategory === 'proforma_generated'}
                  muted={proformaQty === 0}
                  Icon={FileSpreadsheet}
                  tone={CATEGORY_TONE.proforma_generated}
                  onSelect={() => toggleCategory('proforma_generated')}
                />
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="flex items-baseline justify-between px-1 mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Resumen de todos</h2>
                <p className="text-xs text-slate-400">Cumpliendo · quedados</p>
              </div>
              <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden divide-y divide-slate-100">
                {data.ranking.length === 0 && (
                  <p className="text-sm text-slate-400 px-4 py-10 text-center">Sin vendedores activos.</p>
                )}
                {data.ranking
                  .filter((row) => row.rol !== 'excluido')
                  .map((row, index) => {
                  const isMe = row.vendedor_id === data.vendedor_id;
                  const dutyPct = rankingDutyPct(row);
                  const quedados =
                    num(row.faltante_quedados) + num(row.asesoria_quedados) + num(row.pedidos_quedados);
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
                            ? `${num(row.leads_con_historial)} gestionados · ${quedados} quedados`
                            : `IA ${num(row.ia_agendadas)}/${num(row.ia_due)}${num(row.ia_vencidas) > 0 ? ` · ${num(row.ia_vencidas)} venc.` : ''} · ${num(row.faltante_quedados)} info · ${num(row.asesoria_quedados)} fin. · ${num(row.pedidos_quedados)} ped.`}
                        </p>
                      </div>
                      <span className="text-right shrink-0">
                        <span className="block text-sm font-semibold tabular-nums text-slate-800">
                          {dutyPct == null ? '—' : `${dutyPct}%`}
                        </span>
                        <span className="block text-[10px] text-slate-400 tabular-nums">{quedados} qued.</span>
                      </span>
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
              category={selectedCategory}
              showAll={
                selectedCategory === 'seguimientos_ia' ||
                selectedCategory === 'quedados_faltante' ||
                selectedCategory === 'quedados_asesoria' ||
                selectedCategory === 'quedados_pedidos'
              }
            />
          )}
        </>
      ) : null}
    </div>
  );
}
