import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    Search,
    CalendarDays,
    User,
    X,
    ChevronDown,
    Check,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ShowroomToolbarProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    dateFilter: string;
    onDateFilterChange: (val: string) => void;
    dateFrom: string;
    dateTo: string;
    onCustomDateChange: (from: string, to: string) => void;
    currentUserRole?: string | null;
    salespersons?: { id: string; full_name: string }[];
    selectedSalesperson: string;
    onSalespersonChange: (val: string) => void;
    visitCount: number;
    isLoading?: boolean;
}

type FilterOption = {
    value: string;
    label: string;
};

type OpenFilter = "date" | "seller" | null;

const DATE_OPTIONS: FilterOption[] = [
    { value: "today", label: "Hoy" },
    { value: "yesterday", label: "Ayer" },
    { value: "week", label: "Últimos 7 días" },
    { value: "month", label: "Este mes" },
    { value: "custom", label: "Fecha personalizada" },
    { value: "all", label: "Todo el historial" },
];

const dateInputClass =
    "h-10 w-[8.75rem] shrink-0 bg-transparent px-0.5 text-sm font-medium text-slate-700 outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden";

function formatDayLabel(ymd: string) {
    const [year, month, day] = ymd.split("-");
    if (!year || !month || !day) return ymd;
    return `${day}/${month}`;
}

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
    value,
    options,
    open,
    onToggle,
    onChange,
    icon: Icon,
    menuClassName = "w-56",
    highlighted,
}: {
    value: string;
    options: FilterOption[];
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
    icon: LucideIcon;
    menuClassName?: string;
    highlighted?: boolean;
}) {
    const selected = options.find((option) => option.value === value) ?? options[0];
    const isActive = highlighted ?? false;

    return (
        <div className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={onToggle}
                className={`flex h-10 w-full items-center gap-2 rounded-xl border pl-3 pr-2 text-left text-sm font-medium shadow-sm transition-all ${
                    isActive || open
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
            >
                <Icon className={`h-4 w-4 shrink-0 ${isActive || open ? "text-white/70" : "text-slate-400"}`} />
                <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        isActive || open ? "text-white/70" : "text-slate-400"
                    } ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open ? (
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
                                        ? "bg-slate-900 font-semibold text-white"
                                        : "text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

export default function ShowroomToolbar({
    searchTerm,
    onSearchChange,
    dateFilter,
    onDateFilterChange,
    dateFrom,
    dateTo,
    onCustomDateChange,
    currentUserRole,
    salespersons = [],
    selectedSalesperson,
    onSalespersonChange,
    visitCount,
    isLoading = false,
}: ShowroomToolbarProps) {
    const isAdmin = currentUserRole?.toLowerCase() === "admin";
    const isCustomRange = dateFilter === "custom";
    const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
    const filterMenusRef = useRef<HTMLDivElement>(null);

    const sellerOptions: FilterOption[] = [
        { value: "all", label: "Todos los vendedores" },
        ...salespersons.map((sp) => ({ value: sp.id, label: sp.full_name })),
    ];

    useEffect(() => {
        if (!openFilter) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!filterMenusRef.current?.contains(event.target as Node)) {
                setOpenFilter(null);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpenFilter(null);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [openFilter]);

    const periodCaption = isCustomRange && dateFrom && dateTo
        ? dateFrom === dateTo
            ? formatDayLabel(dateFrom)
            : `${formatDayLabel(dateFrom)} – ${formatDayLabel(dateTo)}`
        : DATE_OPTIONS.find((option) => option.value === dateFilter)?.label ?? "";

    return (
        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                <div className="relative min-w-0 flex-1 group">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-700" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, auto o marca..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div ref={filterMenusRef} className="flex flex-wrap items-end gap-3">
                    {isCustomRange ? (
                        <FilterField label="Periodo" className="shrink-0">
                            <div className="flex items-center gap-1.5">
                                <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-slate-50 shadow-sm">
                                    <CalendarDays className="ml-2.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span className="pl-1.5 pr-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        De
                                    </span>
                                    <input
                                        type="date"
                                        aria-label="Fecha desde"
                                        className={dateInputClass}
                                        value={dateFrom}
                                        max={dateTo || undefined}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            onCustomDateChange(e.target.value, dateTo || e.target.value);
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
                                        aria-label="Fecha hasta"
                                        className={dateInputClass}
                                        value={dateTo}
                                        min={dateFrom || undefined}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            onCustomDateChange(dateFrom || e.target.value, e.target.value);
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onDateFilterChange("today")}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                                    title="Volver a rangos"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </FilterField>
                    ) : (
                        <FilterField label="Periodo" className="min-w-[190px]">
                            <FilterDropdown
                                icon={CalendarDays}
                                value={dateFilter}
                                options={DATE_OPTIONS}
                                open={openFilter === "date"}
                                onToggle={() => setOpenFilter((current) => (current === "date" ? null : "date"))}
                                onChange={(value) => {
                                    onDateFilterChange(value);
                                    setOpenFilter(null);
                                }}
                                highlighted={dateFilter !== "today"}
                                menuClassName="w-56"
                            />
                        </FilterField>
                    )}

                    {isAdmin ? (
                        <FilterField label="Vendedor" className="min-w-[200px]">
                            <FilterDropdown
                                icon={User}
                                value={selectedSalesperson}
                                options={sellerOptions}
                                open={openFilter === "seller"}
                                onToggle={() => setOpenFilter((current) => (current === "seller" ? null : "seller"))}
                                onChange={(value) => {
                                    onSalespersonChange(value);
                                    setOpenFilter(null);
                                }}
                                highlighted={selectedSalesperson !== "all"}
                                menuClassName="w-64"
                            />
                        </FilterField>
                    ) : null}

                    <div className="flex h-10 min-w-[88px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="leading-tight">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                {isLoading ? "Cargando" : periodCaption}
                            </p>
                            <p className="text-sm font-bold tabular-nums text-slate-900">
                                {isLoading ? "…" : visitCount} {visitCount === 1 ? "visita" : "visitas"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
