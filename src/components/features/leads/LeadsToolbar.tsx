import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
    Search,
    X,
    ChevronDown,
    Calendar,
    Activity,
    MessageSquare,
    ClipboardList,
    BellRing,
    ArrowLeftRight,
    HelpCircle,
    Phone,
    Clock,
    Check,
} from "lucide-react";

import type { CallFilter, DateFilter, LeadCallEvent, LeadCallStats, LeadsFilters } from "@/types/leads.types";
import type { LeadDayMetricBreakdown } from "@/services/leads.service";
import {
    emptyCustomDateRange,
    getLeadsCustomYmdRange,
    withCustomDateRange,
} from "@/utils/leads.logic";


interface LeadsToolbarProps {
    filters: LeadsFilters;
    onFilterChange: (key: keyof LeadsFilters | Partial<LeadsFilters>, value?: any) => void;
    onReset: () => void;
    totalResults: number;
    respondedCount?: number;     // Métrica 1: De la lista actual
    interactionsCount?: number;
    dayBreakdown?: LeadDayMetricBreakdown | null;
    budgetCount?: number;        // Métrica 3: Leads con presupuesto
    tradeInLeadsCount?: number; // Leads con al menos un trade_in_cars
    callStats?: LeadCallStats;
    callHistory?: LeadCallEvent[];
    requestStats?: {
        datosPedidos: {
            pendiente: number;
            en_proceso: number;
            resuelto: number;
            total: number;
            llenos?: number;
            incompletos?: number;
            vacios?: number;
        };
        asesoria: {
            pendiente: number;
            en_proceso: number;
            resuelto: number;
            total: number;
            llenos?: number;
            incompletos?: number;
            vacios?: number;
            fichaPorEstado?: {
                all: { llenos: number; incompletos: number; vacios: number; total: number };
                pendiente: { llenos: number; incompletos: number; vacios: number; total: number };
                en_proceso: { llenos: number; incompletos: number; vacios: number; total: number };
                resuelto: { llenos: number; incompletos: number; vacios: number; total: number };
            };
        };
    };
    currentUserRole?: string | null;
    sellers?: { id: string; full_name: string }[];
}

type FilterOption = {
    value: string;
    label: string;
    dot?: string;
};

const STATUS_OPTIONS: FilterOption[] = [
    { value: "all", label: "Todos", dot: "bg-slate-300" },
    { value: "nuevo", label: "Nuevo", dot: "bg-indigo-500" },
    { value: "contactado", label: "Contactado", dot: "bg-sky-500" },
    { value: "interesado", label: "Interesado", dot: "bg-violet-500" },
    { value: "negociando", label: "Negociando", dot: "bg-amber-500" },
    { value: "ganado", label: "Ganado", dot: "bg-emerald-500" },
    { value: "perdido", label: "Perdido", dot: "bg-rose-500" },
    { value: "en_proceso", label: "En proceso", dot: "bg-slate-500" },
    { value: "datos_pedidos", label: "Info. faltante", dot: "bg-purple-500" },
    { value: "asesoria_financiamiento", label: "Asesoría financiamiento", dot: "bg-teal-500" },
];

const DATE_OPTIONS: FilterOption[] = [
    { value: "all", label: "Todo el tiempo" },
    { value: "today", label: "Hoy" },
    { value: "7days", label: "Últimos 7 días" },
    { value: "15days", label: "Últimos 15 días" },
    { value: "thisMonth", label: "Este mes" },
    { value: "custom", label: "Rango personalizado" },
];

const TEMP_OPTIONS = [
    { value: "all", label: "Todas", active: "bg-white text-slate-800 shadow-sm", idle: "text-slate-500 hover:text-slate-800" },
    { value: "caliente", label: "Caliente", active: "bg-rose-500 text-white shadow-sm", idle: "text-rose-600 hover:bg-rose-50" },
    { value: "tibio", label: "Tibio", active: "bg-amber-400 text-amber-950 shadow-sm", idle: "text-amber-700 hover:bg-amber-50" },
    { value: "frio", label: "Frío", active: "bg-sky-500 text-white shadow-sm", idle: "text-sky-700 hover:bg-sky-50" },
] as const;

function FilterField({
    label,
    children,
    className = "",
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>
            {children}
        </div>
    );
}

function FilterDropdown({
    label,
    value,
    options,
    open,
    onToggle,
    onChange,
    menuClassName = "w-56",
}: {
    label: string;
    value: string;
    options: FilterOption[];
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
    menuClassName?: string;
}) {
    const selected = options.find((option) => option.value === value) ?? options[0];
    const isActive = value !== "all";

    return (
        <FilterField label={label} className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={onToggle}
                className={`flex h-10 w-full min-w-[9rem] items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium shadow-sm transition-all ${
                    isActive || open
                        ? "border-indigo-200 bg-indigo-50 text-indigo-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
            >
                {selected?.dot && (
                    <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />
                )}
                <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <div
                    role="listbox"
                    className={`absolute left-0 top-[calc(100%+0.4rem)] z-[90] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ${menuClassName}`}
                >
                    {options.map((option) => {
                        const active = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => onChange(option.value)}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                                    active
                                        ? "bg-indigo-50 font-semibold text-indigo-950"
                                        : "text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {option.dot ? (
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
                                ) : null}
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {active && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </FilterField>
    );
}

// Helper seguro para obtener fecha Ecuador usando Intl (Infalible)
const getEcuadorDateISO = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
};

function formatDayLabel(ymd: string) {
    const [, month, day] = ymd.split("-");
    if (!month || !day) return ymd;
    return `${day}/${month}`;
}

function formatCallEventWhen(iso: string) {
    return new Date(iso).toLocaleString("es-EC", {
        timeZone: "America/Guayaquil",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function callEventLabel(tipo: LeadCallEvent["tipo"]) {
    if (tipo === "solicitud") return "Solicitó llamada";
    if (tipo === "aplazada") return "Aplazada";
    return "Llamada hecha";
}

const dateInputClass =
    "h-10 w-[8.75rem] shrink-0 bg-transparent px-0.5 text-sm font-medium text-slate-700 outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden";

/** Tooltip al pasar el mouse: explica de dónde sale cada métrica del footer. */
function MetricHint({
    children,
    title,
    lines,
    className = "",
    as = "span",
    onClick,
}: {
    children: ReactNode;
    title: string;
    lines: string[];
    className?: string;
    as?: "span" | "div" | "button";
    onClick?: () => void;
}) {
    const Wrapper = as;
    const isButton = as === "button";
    return (
        <Wrapper
            className={`group/metric relative inline-flex ${isButton ? "cursor-pointer" : "cursor-help"} ${className}`}
            type={isButton ? "button" : undefined}
            onClick={onClick}
        >
            {children}
            <span
                className="pointer-events-none absolute left-1/2 bottom-[calc(100%+0.5rem)] z-[80] w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-xl border border-slate-200 bg-slate-900 px-3.5 py-3 text-left text-[11px] font-medium leading-relaxed text-slate-100 shadow-xl opacity-0 invisible translate-y-1 transition-all duration-150 group-hover/metric:opacity-100 group-hover/metric:visible group-hover/metric:translate-y-0 group-focus-within/metric:opacity-100 group-focus-within/metric:visible group-focus-within/metric:translate-y-0"
                role="tooltip"
            >
                <span className="mb-1.5 block text-xs font-extrabold text-white">{title}</span>
                <ul className="space-y-1.5 list-disc pl-3.5 marker:text-slate-400">
                    {lines.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
            </span>
            <HelpCircle className="h-3 w-3 shrink-0 text-slate-400/80 opacity-70 group-hover/metric:text-slate-500" aria-hidden />
        </Wrapper>
    );
}

export function LeadsToolbar({
    filters,
    onFilterChange,
    onReset,
    totalResults,
    respondedCount = 0,
    interactionsCount = 0,
    dayBreakdown = null,
    budgetCount = 0,
    tradeInLeadsCount = 0,
    callStats = { pendiente: 0, aplazada: 0, llamado: 0 },
    callHistory = [],
    requestStats = { 
        datosPedidos: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0, llenos: 0, incompletos: 0, vacios: 0 }, 
        asesoria: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0, llenos: 0, incompletos: 0, vacios: 0 } 
    },
    currentUserRole,
    sellers = []
}: LeadsToolbarProps) {

    const canFilterByAssignee =
        currentUserRole?.toLowerCase().trim() === 'admin' ||
        currentUserRole?.toLowerCase().trim() === 'marketing';
    const callFilter = filters.callFilter || "all";
    const setCallFilter = (next: CallFilter) => {
        onFilterChange({
            callFilter: callFilter === next ? "all" : next,
            hasBudget: false,
            hasTradeIn: false,
            onlyInteractions: false,
            withoutResume: false,
        });
    };
    const callFilterActive = callFilter !== "all";
    const [callMenuOpen, setCallMenuOpen] = useState(false);
    const callMenuRef = useRef<HTMLDivElement>(null);
    const [openFilter, setOpenFilter] = useState<"status" | "date" | "assignee" | null>(null);
    const filterMenusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!callMenuOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!callMenuRef.current?.contains(event.target as Node)) {
                setCallMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [callMenuOpen]);

    useEffect(() => {
        if (!openFilter) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!filterMenusRef.current?.contains(event.target as Node)) {
                setOpenFilter(null);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [openFilter]);
    const assignedToValue = filters.assignedTo || 'all';

    const customRange = getLeadsCustomYmdRange(filters);
    const isCustomRange = Boolean(customRange);

    const hasActiveFilters =
        filters.status !== 'all' ||
        filters.temperature !== 'all' ||
        filters.dateRange !== 'all' ||
        isCustomRange ||
        filters.search !== '' ||
        filters.hasBudget ||
        filters.hasTradeIn ||
        filters.onlyInteractions ||
        filters.withoutResume ||
        (filters.callFilter && filters.callFilter !== 'all') ||
        (filters.requestStatus && filters.requestStatus !== 'all') ||
        (filters.asesoriaGestion && filters.asesoriaGestion !== 'all') ||
        (canFilterByAssignee && assignedToValue !== 'all');

    // Porcentaje para la métrica vieja
    const responseRate = totalResults > 0 ? Math.round((respondedCount / totalResults) * 100) : 0;

    // Texto dinámico para la nueva métrica
    const getInteractionLabel = () => {
        if (customRange) {
            if (customRange.from === customRange.to) {
                const [y, m, d] = customRange.from.split('-');
                return `Gestión del ${d}/${m}`;
            }
            return `Gestión ${formatDayLabel(customRange.from)} – ${formatDayLabel(customRange.to)}`;
        }
        return "Gestión de Hoy";
    };

    const dateLabel = customRange
        ? customRange.from === customRange.to
            ? formatDayLabel(customRange.from)
            : `${formatDayLabel(customRange.from)} – ${formatDayLabel(customRange.to)}`
        : filters.dateRange === 'today'
          ? 'hoy'
          : filters.dateRange !== 'all'
            ? 'el rango de fechas seleccionado'
            : null;

    const resultsHintLines = filters.onlyInteractions
        ? ['Lista: resumen guardado ese día (no solo ingresos).']
        : dateLabel
          ? [`Ingresos del ${dateLabel}. No es lo mismo que gestiones del día.`]
          : ['Total en la tabla con los filtros actuales.'];

    const respondedHintLines =
        dayBreakdown && dateLabel
            ? [
                  `${dayBreakdown.respondedSameDay} resumen el mismo día · ${dayBreakdown.respondedLater} resumen otro día (entraron el ${dateLabel}, cuentan aquí).`,
                  `Sin resumen: ${Math.max(0, totalResults - respondedCount)}.`,
              ]
            : dateLabel
              ? ['Tienen resumen en la ficha (pudo guardarse otro día).']
              : ['Cuántos de la lista ya tienen resumen.'];

    const gestionDayLabel = customRange
        ? customRange.from === customRange.to
            ? formatDayLabel(customRange.from)
            : `${formatDayLabel(customRange.from)} – ${formatDayLabel(customRange.to)}`
        : 'hoy';

    const interactionsHintLines =
        dayBreakdown && filters.exactDate
            ? [
                  `${dayBreakdown.gestionIngresoDia} ingresaron y se les guardó resumen el mismo día · ${dayBreakdown.gestionCartera} entraron antes (= ${interactionsCount} el ${gestionDayLabel}).`,
                  `Puede ser mayor que Resultados (${totalResults}): también cuenta clientes que entraron días anteriores.`,
              ]
            : [`Resúmenes guardados el ${gestionDayLabel}. Incluye clientes de días anteriores.`];

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
                <div
                    ref={filterMenusRef}
                    className="flex flex-wrap items-end gap-3"
                >
                    <FilterField label="Buscar" className="w-64 max-w-full shrink-0">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Nombre, teléfono o ID..."
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm font-medium text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                value={filters.search}
                                onChange={(e) => onFilterChange("search", e.target.value)}
                            />
                        </div>
                    </FilterField>

                    <div className="relative shrink-0">
                        <FilterDropdown
                            label="Estado"
                            value={filters.status}
                            options={STATUS_OPTIONS}
                            open={openFilter === "status"}
                            onToggle={() => setOpenFilter((current) => (current === "status" ? null : "status"))}
                            onChange={(value) => {
                                onFilterChange("status", value);
                                setOpenFilter(null);
                            }}
                            menuClassName="w-60"
                        />
                        {filters.requestStatus && filters.requestStatus !== "all" && (
                            <span className="absolute -top-1 right-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold capitalize text-white shadow-sm">
                                {filters.requestStatus.replace("_", " ")}
                            </span>
                        )}
                    </div>

                    <FilterField label="Temperatura" className="shrink-0">
                        <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                            {TEMP_OPTIONS.map((option) => {
                                const active = filters.temperature === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setOpenFilter(null);
                                            onFilterChange("temperature", option.value);
                                        }}
                                        className={`rounded-[0.65rem] px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 ${
                                            active ? option.active : option.idle
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </FilterField>

                    {isCustomRange ? (
                        <FilterField label="Fecha de ingreso" className="shrink-0">
                            <div className="flex items-center gap-1.5">
                                <div className="flex h-10 items-center rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-sm">
                                    <Calendar className="ml-2.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                    <span className="pl-1.5 pr-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        De
                                    </span>
                                    <input
                                        type="date"
                                        aria-label="Fecha de inicio"
                                        className={dateInputClass}
                                        value={customRange?.from ?? ""}
                                        max={customRange?.to || undefined}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            onFilterChange(
                                                withCustomDateRange(
                                                    e.target.value,
                                                    customRange?.to || e.target.value,
                                                    "from"
                                                )
                                            );
                                        }}
                                    />
                                    <span className="px-0.5 text-slate-300" aria-hidden>
                                        —
                                    </span>
                                    <span className="pl-1 pr-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        A
                                    </span>
                                    <input
                                        type="date"
                                        aria-label="Fecha de fin"
                                        className={dateInputClass}
                                        value={customRange?.to ?? ""}
                                        min={customRange?.from || undefined}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            onFilterChange(
                                                withCustomDateRange(
                                                    customRange?.from || e.target.value,
                                                    e.target.value,
                                                    "to"
                                                )
                                            );
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onFilterChange({
                                            ...emptyCustomDateRange,
                                            dateRange: "all",
                                        })
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                                    title="Volver a rangos"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </FilterField>
                    ) : (
                        <FilterDropdown
                            label="Fecha de ingreso"
                            value={filters.dateRange}
                            options={DATE_OPTIONS}
                            open={openFilter === "date"}
                            onToggle={() => setOpenFilter((current) => (current === "date" ? null : "date"))}
                            onChange={(value) => {
                                setOpenFilter(null);
                                if (value === "custom") {
                                    const today = getEcuadorDateISO();
                                    onFilterChange(withCustomDateRange(today, today));
                                    return;
                                }
                                onFilterChange({
                                    dateRange: value as DateFilter,
                                    ...emptyCustomDateRange,
                                });
                            }}
                            menuClassName="w-52"
                        />
                    )}

                    {canFilterByAssignee && (
                        <FilterDropdown
                            label="Responsable"
                            value={assignedToValue}
                            options={[
                                { value: "all", label: "Todos" },
                                ...sellers.map((seller) => ({
                                    value: seller.id,
                                    label: seller.full_name,
                                })),
                            ]}
                            open={openFilter === "assignee"}
                            onToggle={() =>
                                setOpenFilter((current) => (current === "assignee" ? null : "assignee"))
                            }
                            onChange={(value) => {
                                onFilterChange("assignedTo", value);
                                setOpenFilter(null);
                            }}
                            menuClassName="w-64"
                        />
                    )}

                    <FilterField label={"\u00a0"} className="relative z-[100] ml-auto shrink-0">
                        <div ref={callMenuRef}>
                            <button
                                type="button"
                                title="Gestión de llamadas"
                                aria-label="Gestión de llamadas"
                                aria-expanded={callMenuOpen}
                                onClick={() => {
                                    setOpenFilter(null);
                                    setCallMenuOpen((open) => !open);
                                }}
                                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all ${
                                    callFilterActive || callMenuOpen
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                            >
                                <Phone className="h-4 w-4" />
                                {callStats.pendiente > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                                        {callStats.pendiente}
                                    </span>
                                )}
                            </button>
                        {callMenuOpen && (
                            <div className="absolute right-0 top-[calc(100%+0.4rem)] w-[22rem] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                <h4 className="mb-2 border-b border-slate-100 px-2 pb-1.5 text-[10px] font-bold uppercase text-slate-400">
                                    Filtro e historial
                                </h4>
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => setCallFilter("pendiente")}
                                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                                            callFilter === "pendiente"
                                                ? "border-red-200 bg-red-50 text-red-800 shadow-sm"
                                                : "border-transparent text-slate-600 hover:border-red-100 hover:bg-red-50/50"
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <Phone className="h-3.5 w-3.5 text-red-500" />
                                            Pendiente / no llamado
                                        </span>
                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                                            {callStats.pendiente}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCallFilter("aplazada")}
                                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                                            callFilter === "aplazada"
                                                ? "border-amber-200 bg-amber-50 text-amber-900 shadow-sm"
                                                : "border-transparent text-slate-600 hover:border-amber-100 hover:bg-amber-50/50"
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                                            Aplazadas
                                        </span>
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                                            {callStats.aplazada}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCallFilter("llamado")}
                                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                                            callFilter === "llamado"
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm"
                                                : "border-transparent text-slate-600 hover:border-emerald-100 hover:bg-emerald-50/50"
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            Ya llamadas
                                        </span>
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                            {callStats.llamado}
                                        </span>
                                    </button>
                                </div>

                                <h4 className="mb-1.5 mt-3 border-b border-slate-100 px-2 pb-1.5 text-[10px] font-bold uppercase text-slate-400">
                                    Historial
                                </h4>
                                <div className="max-h-56 space-y-1.5 overflow-y-auto px-1">
                                    {callHistory.length === 0 ? (
                                        <p className="px-2 py-3 text-xs text-slate-400">
                                            Aún no hay movimientos de llamada.
                                        </p>
                                    ) : (
                                        callHistory.map((event) => (
                                            <div
                                                key={event.id}
                                                className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="truncate text-sm font-semibold text-slate-800">
                                                        {event.lead_name}
                                                    </p>
                                                    <span
                                                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                            event.tipo === "gestionada"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : event.tipo === "aplazada"
                                                                  ? "bg-amber-100 text-amber-800"
                                                                  : "bg-red-100 text-red-800"
                                                        }`}
                                                    >
                                                        {callEventLabel(event.tipo)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    {formatCallEventWhen(event.created_at)}
                                                    {event.created_by_name ? ` · ${event.created_by_name}` : ""}
                                                </p>
                                                {event.tipo === "aplazada" && event.razon && (
                                                    <p className="mt-1 text-[11px] text-slate-600">
                                                        Motivo: {event.razon}
                                                        {event.programado_hasta
                                                            ? ` · para ${formatCallEventWhen(event.programado_hasta)}`
                                                            : ""}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        </div>
                    </FilterField>
                </div>
            </div>

            {/* Footer de métricas */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-2">

                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                    <MetricHint
                        title="Resultados"
                        lines={resultsHintLines}
                        className="items-center gap-1"
                    >
                        <span>
                            Resultados: <strong className="text-slate-900 text-sm">{totalResults}</strong>
                        </span>
                    </MetricHint>

                    <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-300"></span>

                    <MetricHint
                        as="button"
                        title={
                            filters.withoutResume
                                ? "Filtro activo: sin responder"
                                : "Respondidos (con resumen)"
                        }
                        lines={
                            filters.withoutResume
                                ? [
                                      "Mostrando solo leads sin resumen ejecutivo.",
                                      "Clic de nuevo para quitar el filtro.",
                                  ]
                                : [
                                      ...respondedHintLines,
                                      "Clic para ver solo los no respondidos (sin resumen).",
                                  ]
                        }
                        className={`items-center gap-1.5 px-2.5 py-1 rounded-md border shadow-sm transition-colors ${
                            filters.withoutResume
                                ? "text-amber-800 bg-amber-50 border-amber-200"
                                : "text-brand-600 bg-brand-50 border-brand-100 hover:bg-brand-100/70"
                        }`}
                        onClick={() => {
                            const next = !filters.withoutResume;
                            onFilterChange({
                                withoutResume: next,
                                onlyInteractions: false,
                                hasBudget: false,
                                hasTradeIn: false,
                                callFilter: "all",
                            });
                        }}
                    >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        {filters.withoutResume ? (
                            <span>
                                Sin responder:{" "}
                                <strong className="text-amber-900">{totalResults}</strong>
                            </span>
                        ) : (
                            <span>
                                <strong className="text-brand-700">{respondedCount}</strong> de{" "}
                                {totalResults} respondidos
                                {totalResults > 0 && (
                                    <span className="text-brand-400 ml-0.5">
                                        ({responseRate}%)
                                    </span>
                                )}
                            </span>
                        )}
                    </MetricHint>

                    <span className="hidden sm:inline h-4 w-[1px] bg-slate-200 mx-1"></span>

                    <MetricHint
                        as="button"
                        title={`${getInteractionLabel()} — resumen guardado ese día`}
                        lines={interactionsHintLines}
                        className={`items-center gap-1.5 px-2.5 py-1 rounded-md border shadow-sm animate-in fade-in transition-colors ${
                            filters.onlyInteractions
                                ? 'text-orange-800 bg-orange-50 border-orange-200'
                                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                            const next = !filters.onlyInteractions;
                            if (!next) {
                                onFilterChange({ onlyInteractions: false, withoutResume: false });
                                return;
                            }
                            const range = getLeadsCustomYmdRange(filters);
                            if (range) {
                                onFilterChange({
                                    onlyInteractions: true,
                                    withoutResume: false,
                                    hasBudget: false,
                                    hasTradeIn: false,
                                });
                                return;
                            }
                            const today = getEcuadorDateISO();
                            onFilterChange({
                                onlyInteractions: true,
                                withoutResume: false,
                                hasBudget: false,
                                hasTradeIn: false,
                                ...withCustomDateRange(today, today),
                            });
                        }}
                    >
                        <ClipboardList className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span>
                            {getInteractionLabel()}:{' '}
                            <strong className="text-slate-900 text-sm">{interactionsCount}</strong> interacciones
                        </span>
                    </MetricHint>

                    {(budgetCount > 0 || tradeInLeadsCount > 0 || requestStats.datosPedidos.total > 0) && (
                        <>
                            {/* SEPARADOR */}
                            <span className="hidden sm:inline h-4 w-[1px] bg-slate-200 mx-1"></span>

                            {/* DROPDOWN DE ALERTAS / FILTROS EXTRA */}
                            <div className="relative group z-50">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors cursor-pointer text-sm font-medium">
                                    <div className="relative">
                                        <BellRing className="h-4 w-4 text-brand-500 animate-pulse" />
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
                                    </div>
                                    <span>Alertas Rápidas</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 group-hover:rotate-180" />
                                </button>

                                {/* Menú Desplegable */}
                                <div className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+0.5rem)] w-72 bg-white border border-slate-200 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top-right">
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 px-2 border-b border-slate-100 pb-1.5">
                                        Filtros y Notificaciones
                                    </h4>
                                    
                                    <div className="space-y-1.5">
                                        {/* Presupuesto */}
                                        {budgetCount > 0 && (
                                            <button 
                                                type="button"
                                                onClick={() => onFilterChange({ hasBudget: !filters.hasBudget, status: 'all', requestStatus: 'all', hasTradeIn: false, onlyInteractions: false, withoutResume: false })}
                                                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                    filters.hasBudget 
                                                    ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
                                                    : 'hover:bg-amber-50/50 text-slate-600 border-transparent hover:border-amber-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-md ${filters.hasBudget ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Activity className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Con Presupuesto</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filters.hasBudget ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                                                    {budgetCount}
                                                </span>
                                            </button>
                                        )}

                                        {tradeInLeadsCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onFilterChange({
                                                        hasTradeIn: !filters.hasTradeIn,
                                                        status: "all",
                                                        requestStatus: "all",
                                                        hasBudget: false,
                                                        onlyInteractions: false,
                                                        withoutResume: false,
                                                        callFilter: "all",
                                                    })
                                                }
                                                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                    filters.hasTradeIn
                                                        ? "border-indigo-400 bg-indigo-100 text-indigo-950 shadow-md ring-2 ring-indigo-300/60"
                                                        : "border-transparent text-slate-600 hover:border-indigo-100 hover:bg-indigo-50/60"
                                                }`}
                                                title="Filtrar leads con vehículo en intercambio o parte de pago"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`p-1.5 rounded-md ${
                                                            filters.hasTradeIn
                                                                ? "bg-indigo-500 text-white shadow-sm"
                                                                : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Intercambio / parte de pago</span>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        filters.hasTradeIn
                                                            ? "bg-indigo-600 text-white shadow-sm"
                                                            : "bg-slate-100 text-slate-600"
                                                    }`}
                                                >
                                                    {tradeInLeadsCount}
                                                </span>
                                            </button>
                                        )}

                                        {/* Info Faltante */}
                                        {requestStats.datosPedidos.total > 0 && (
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => onFilterChange({ status: filters.status === 'datos_pedidos' ? 'all' : 'datos_pedidos', requestStatus: 'all', asesoriaGestion: 'all', hasBudget: false, hasTradeIn: false, onlyInteractions: false, withoutResume: false })}
                                                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                        filters.status === 'datos_pedidos'
                                                        ? 'bg-purple-50 text-purple-800 border-purple-200 shadow-sm'
                                                        : 'hover:bg-purple-50/50 text-slate-600 border-transparent hover:border-purple-100'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`p-1.5 rounded-md ${filters.status === 'datos_pedidos' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            <ClipboardList className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="font-semibold text-sm">Info. Faltante</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {requestStats.datosPedidos.pendiente > 0 && filters.status !== 'datos_pedidos' && (
                                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200" title="Pendientes">
                                                                {requestStats.datosPedidos.pendiente} pend.
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filters.status === 'datos_pedidos' ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 text-slate-600'}`}>
                                                            {requestStats.datosPedidos.total}
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Sub-opciones de Info Faltante */}
                                                {filters.status === 'datos_pedidos' && (
                                                    <div className="flex flex-col gap-0.5 pl-11 pr-2 pb-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'pendiente', hasBudget: false, hasTradeIn: false, onlyInteractions: false, withoutResume: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'pendiente' 
                                                                ? 'bg-orange-100 text-orange-800 font-semibold border-orange-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Pendientes</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'pendiente' ? 'bg-orange-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.pendiente}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'en_proceso', hasBudget: false, hasTradeIn: false, onlyInteractions: false, withoutResume: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'en_proceso' 
                                                                ? 'bg-blue-100 text-blue-800 font-semibold border-blue-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>En Proceso</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'en_proceso' ? 'bg-blue-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.en_proceso}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'resuelto', hasBudget: false, hasTradeIn: false, onlyInteractions: false, withoutResume: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'resuelto' 
                                                                ? 'bg-emerald-100 text-emerald-800 font-semibold border-emerald-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Resueltos</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'resuelto' ? 'bg-emerald-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.resuelto}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'all', hasBudget: false, hasTradeIn: false, onlyInteractions: false, withoutResume: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                (filters.requestStatus === 'all' || !filters.requestStatus)
                                                                ? 'bg-purple-100 text-purple-800 font-semibold border-purple-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Todos</span>
                                                            <span className={`font-bold px-1.5 rounded ${(filters.requestStatus === 'all' || !filters.requestStatus) ? 'bg-purple-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.total}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={onReset}
                        className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors bg-white hover:bg-red-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-red-100 shadow-sm"
                    >
                        <div className="bg-slate-100 group-hover:bg-red-200 rounded-full p-0.5 transition-colors">
                            <X className="h-3 w-3" />
                        </div>
                        Limpiar filtros
                    </button>
                )}
            </div>

            {(filters.status === "asesoria_financiamiento" || filters.status === "datos_pedidos") && (() => {
                const isDatos = filters.status === "datos_pedidos";
                const stats = isDatos ? requestStats.datosPedidos : requestStats.asesoria;
                return (
                <div className="flex flex-wrap items-center gap-2 px-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {isDatos ? "Respuesta" : "Ficha de gestión"}
                    </span>
                    <div className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                        {(
                            [
                                {
                                    value: "vacios" as const,
                                    label: isDatos ? "Sin respuesta" : "Sin ficha",
                                    count: stats.vacios ?? 0,
                                    active: "bg-rose-500 text-white shadow-sm",
                                    idle: "text-rose-700 hover:bg-rose-50",
                                },
                                {
                                    value: "incompletos" as const,
                                    label: "Incompletos",
                                    count: stats.incompletos ?? 0,
                                    active: "bg-amber-500 text-white shadow-sm",
                                    idle: "text-amber-800 hover:bg-amber-50",
                                },
                                {
                                    value: "llenos" as const,
                                    label: "Completos",
                                    count: stats.llenos ?? 0,
                                    active: "bg-emerald-600 text-white shadow-sm",
                                    idle: "text-emerald-700 hover:bg-emerald-50",
                                },
                                {
                                    value: "all" as const,
                                    label: "Todos",
                                    count: stats.total,
                                    active: "bg-slate-800 text-white shadow-sm",
                                    idle: "text-slate-600 hover:bg-slate-50",
                                },
                            ]
                        ).map((option) => {
                            const current = filters.asesoriaGestion || "all";
                            const active = current === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        onFilterChange({
                                            asesoriaGestion: option.value,
                                            requestStatus: "all",
                                        })
                                    }
                                    className={`flex items-center gap-1.5 rounded-[0.65rem] px-2.5 py-1.5 text-xs font-semibold transition-all ${
                                        active ? option.active : option.idle
                                    }`}
                                >
                                    {option.label}
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                            active ? "bg-white/20" : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {option.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                );
            })()}
        </div>
    );
}