import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    Search,
    X,
    ChevronDown,
    Car,
    Tag,
    ArrowUpDown,
    Calendar,
    Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InventoryDateRange, InventoryFilters, SortOption } from "../../../hooks/useInventory";

interface InventoryToolbarProps {
    filters: InventoryFilters;
    sortBy: SortOption;
    onFilterChange: (
        key: keyof InventoryFilters | Partial<InventoryFilters>,
        value?: InventoryFilters[keyof InventoryFilters]
    ) => void;
    onSortChange: (value: SortOption) => void;
    onReset: () => void;
    resultsCount: number;
}

type FilterOption = {
    value: string;
    label: string;
    dot?: string;
};

type OpenFilter = "status" | "year" | "date" | "sort" | null;

const STATUS_OPTIONS: FilterOption[] = [
    { value: "all", label: "Todos", dot: "bg-slate-300" },
    { value: "disponible", label: "Disponible", dot: "bg-emerald-500" },
    { value: "reservado", label: "Reservado", dot: "bg-amber-400" },
    { value: "vendido", label: "Vendido", dot: "bg-rose-500" },
    { value: "mantenimiento", label: "Taller", dot: "bg-orange-500" },
];

const YEAR_OPTIONS: FilterOption[] = [
    { value: "", label: "Todos" },
    { value: "2024", label: "2024 o más nuevo" },
    { value: "2022", label: "2022 o más nuevo" },
    { value: "2020", label: "2020 o más nuevo" },
    { value: "2015", label: "2015 o más nuevo" },
];

const DATE_OPTIONS: FilterOption[] = [
    { value: "all", label: "Todo el tiempo" },
    { value: "today", label: "Hoy" },
    { value: "7days", label: "Últimos 7 días" },
    { value: "15days", label: "Últimos 15 días" },
    { value: "thisMonth", label: "Este mes" },
    { value: "custom", label: "Rango personalizado" },
];

const SORT_OPTIONS: FilterOption[] = [
    { value: "newest", label: "Más recientes" },
    { value: "price_asc", label: "Precio: menor a mayor" },
    { value: "price_desc", label: "Precio: mayor a menor" },
    { value: "year_desc", label: "Año: más nuevos" },
];

const dateInputClass =
    "h-10 w-[8.75rem] shrink-0 bg-transparent px-0.5 text-sm font-medium text-slate-700 outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden";

function getEcuadorDateISO() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
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
            <p className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
    className = "",
    highlighted,
    align = "left",
}: {
    value: string;
    options: FilterOption[];
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
    icon: LucideIcon;
    menuClassName?: string;
    className?: string;
    highlighted?: boolean;
    align?: "left" | "right";
}) {
    const selected = options.find((option) => option.value === value) ?? options[0];
    const isActive = highlighted ?? (value !== "all" && value !== "");

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={onToggle}
                className={`flex h-10 w-full items-center gap-2 rounded-lg border pl-3 pr-2 text-left text-sm font-medium shadow-sm transition-all ${
                    isActive || open
                        ? "border-indigo-200 bg-indigo-50 text-indigo-950"
                        : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
            >
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                {selected?.dot ? (
                    <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open ? (
                <div
                    role="listbox"
                    className={`absolute ${align === "right" ? "right-0" : "left-0"} top-[calc(100%+0.4rem)] z-[90] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ${menuClassName}`}
                >
                    {options.map((option) => {
                        const active = option.value === value;
                        return (
                            <button
                                key={option.value || "all"}
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
                                {active ? <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" /> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

export function InventoryToolbar({
    filters,
    sortBy,
    onFilterChange,
    onSortChange,
    onReset,
    resultsCount,
}: InventoryToolbarProps) {
    const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
    const filterMenusRef = useRef<HTMLDivElement>(null);
    const isCustomRange = filters.dateRange === "custom";

    const hasActiveFilters =
        filters.status !== "all" ||
        filters.location !== "all" ||
        filters.minYear !== "" ||
        filters.search !== "" ||
        filters.dateRange !== "all";

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

    const toggleFilter = (key: Exclude<OpenFilter, null>) => {
        setOpenFilter((current) => (current === key ? null : key));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-end gap-4 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Search className="h-4.5 w-4.5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar auto (Ej: Toyota, P5, SUV)..."
                        className="h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:bg-slate-50/50 transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange("search", e.target.value)}
                    />
                    <div className="hidden xl:block absolute right-0 top-2 bottom-2 w-px bg-slate-100"></div>
                </div>

                <div
                    ref={filterMenusRef}
                    className="p-1 xl:p-0 grid grid-cols-2 md:flex gap-3 items-end"
                >
                    <FilterField label="Estado" className="min-w-[150px]">
                        <FilterDropdown
                            icon={Tag}
                            value={filters.status}
                            options={STATUS_OPTIONS}
                            open={openFilter === "status"}
                            onToggle={() => toggleFilter("status")}
                            onChange={(value) => {
                                onFilterChange("status", value);
                                setOpenFilter(null);
                            }}
                            menuClassName="w-52"
                        />
                    </FilterField>

                    <FilterField label="Año del auto" className="min-w-[170px]">
                        <FilterDropdown
                            icon={Car}
                            value={filters.minYear}
                            options={YEAR_OPTIONS}
                            open={openFilter === "year"}
                            onToggle={() => toggleFilter("year")}
                            onChange={(value) => {
                                onFilterChange("minYear", value);
                                setOpenFilter(null);
                            }}
                            menuClassName="w-52"
                        />
                    </FilterField>

                    {isCustomRange ? (
                        <FilterField label="Fecha de ingreso" className="col-span-2 md:col-span-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <div className="flex h-10 items-center rounded-lg border border-indigo-200 bg-indigo-50/40 shadow-sm">
                                    <Calendar className="ml-2.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                    <span className="pl-1.5 pr-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        De
                                    </span>
                                    <input
                                        type="date"
                                        aria-label="Fecha de ingreso desde"
                                        className={dateInputClass}
                                        value={filters.dateFrom}
                                        max={filters.dateTo || undefined}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            onFilterChange({
                                                dateRange: "custom",
                                                dateFrom: e.target.value,
                                                dateTo: filters.dateTo || e.target.value,
                                            });
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
                                        aria-label="Fecha de ingreso hasta"
                                        className={dateInputClass}
                                        value={filters.dateTo}
                                        min={filters.dateFrom || undefined}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            onFilterChange({
                                                dateRange: "custom",
                                                dateFrom: filters.dateFrom || e.target.value,
                                                dateTo: e.target.value,
                                            });
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onFilterChange({
                                            dateRange: "all",
                                            dateFrom: "",
                                            dateTo: "",
                                        })
                                    }
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                                    title="Volver a rangos"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </FilterField>
                    ) : (
                        <FilterField label="Fecha de ingreso" className="min-w-[170px]">
                            <FilterDropdown
                                icon={Calendar}
                                value={filters.dateRange}
                                options={DATE_OPTIONS}
                                open={openFilter === "date"}
                                onToggle={() => toggleFilter("date")}
                                onChange={(value) => {
                                    setOpenFilter(null);
                                    if (value === "custom") {
                                        const today = getEcuadorDateISO();
                                        onFilterChange({
                                            dateRange: "custom",
                                            dateFrom: today,
                                            dateTo: today,
                                        });
                                        return;
                                    }
                                    onFilterChange({
                                        dateRange: value as InventoryDateRange,
                                        dateFrom: "",
                                        dateTo: "",
                                    });
                                }}
                                menuClassName="w-52"
                            />
                        </FilterField>
                    )}

                    <FilterField label="Ordenar" className="min-w-[190px]">
                        <FilterDropdown
                            icon={ArrowUpDown}
                            value={sortBy}
                            options={SORT_OPTIONS}
                            open={openFilter === "sort"}
                            onToggle={() => toggleFilter("sort")}
                            highlighted={sortBy !== "newest"}
                            align="right"
                            onChange={(value) => {
                                onSortChange(value as SortOption);
                                setOpenFilter(null);
                            }}
                            menuClassName="w-56"
                        />
                    </FilterField>
                </div>
            </div>

            <div className="flex justify-between items-center px-2">
                <span className="text-xs font-medium text-slate-500">
                    Vehículos encontrados: <strong className="text-slate-900 text-sm">{resultsCount}</strong>
                </span>

                {hasActiveFilters ? (
                    <button
                        onClick={onReset}
                        className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors bg-white hover:bg-red-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-red-100 shadow-sm"
                    >
                        <div className="bg-slate-100 group-hover:bg-red-200 rounded-full p-0.5 transition-colors">
                            <X className="h-3 w-3" />
                        </div>
                        Limpiar filtros
                    </button>
                ) : null}
            </div>
        </div>
    );
}
