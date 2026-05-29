"use client";

import { useState, useMemo, useCallback } from "react";
import {
    X,
    Search,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    Check,
    Loader2,
    Car,
    LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";

import { ImageViewerModal } from "@/components/features/inventory/ImageViewerModal";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryCar } from "@/hooks/useInventory";
import {
    parseListingChecklist,
    type ListingChecklistKey,
} from "@/types/inventory-listing-checklist";

type ReportView = "disponible" | "vendido";

type SortKey =
    | "vehicle"
    | "year"
    | "plate"
    | "price"
    | "mileage"
    | "location";

interface InventoryVehicleReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    cars: InventoryCar[];
    onEdit?: (car: InventoryCar) => void;
    onReload?: () => void;
    currentUserRole?: string | null;
}

const CHECKLIST_COLUMNS: { key: ListingChecklistKey; label: string; short: string }[] = [
    { key: "pagina_web", label: "Página web", short: "PC" },
    { key: "marketplace", label: "Marketplace", short: "MP" },
    { key: "patio_tuerca", label: "Patio Tuerca", short: "PT" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatPrice(price: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(price ?? 0);
}

function formatKm(km: number | null) {
    return km ? `${km.toLocaleString()} km` : "0 km";
}

function SortableHeader({
    label,
    sortKey,
    current,
    asc,
    onSort,
    className = "",
}: {
    label: string;
    sortKey: SortKey;
    current: SortKey | null;
    asc: boolean;
    onSort: (k: SortKey) => void;
    className?: string;
}) {
    const active = current === sortKey;
    return (
        <th className={`px-2 py-2 text-left ${className}`}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:text-red-600 transition-colors"
            >
                {label}
                <ChevronsUpDown
                    className={`h-3 w-3 shrink-0 ${active ? "text-red-600" : "text-slate-400"}`}
                />
                {active && (
                    <span className="sr-only">{asc ? "ascendente" : "descendente"}</span>
                )}
            </button>
        </th>
    );
}

function ChecklistToggle({
    checked,
    disabled,
    saving,
    onChange,
}: {
    checked: boolean;
    disabled?: boolean;
    saving?: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled || saving}
            onClick={() => onChange(!checked)}
            className={`mx-auto flex h-4 w-4 items-center justify-center rounded border transition-all ${
                checked
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-slate-300 bg-white hover:border-red-400"
            } ${disabled ? "opacity-50 cursor-default" : "cursor-pointer"}`}
        >
            {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : checked ? (
                <Check className="h-3 w-3 stroke-[3]" />
            ) : null}
        </button>
    );
}

export function InventoryVehicleReportsModal({
    isOpen,
    onClose,
    cars,
    onEdit,
    onReload,
    currentUserRole,
}: InventoryVehicleReportsModalProps) {
    const { supabase } = useAuth();
    const [search, setSearch] = useState("");
    const [activeView, setActiveView] = useState<ReportView>("disponible");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [viewingCar, setViewingCar] = useState<InventoryCar | null>(null);
    const [savingCell, setSavingCell] = useState<string | null>(null);

    const role = currentUserRole?.toLowerCase() || "";
    const canEdit = role === "admin" || role === "marketing";

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc((p) => !p);
        else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const viewCounts = useMemo(
        () => ({
            disponible: cars.filter((c) => c.status === "disponible").length,
            vendido: cars.filter((c) => c.status === "vendido").length,
        }),
        [cars]
    );

    const filteredCars = useMemo(() => {
        let list = cars.filter((c) => c.status === activeView);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (c) =>
                    c.brand.toLowerCase().includes(q) ||
                    c.model.toLowerCase().includes(q) ||
                    (c.plate && c.plate.toLowerCase().includes(q)) ||
                    (c.plate_short && c.plate_short.toLowerCase().includes(q))
            );
        }
        if (sortKey) {
            const dir = sortAsc ? 1 : -1;
            list = [...list].sort((a, b) => {
                switch (sortKey) {
                    case "vehicle":
                        return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "es") * dir;
                    case "year":
                        return ((a.year ?? 0) - (b.year ?? 0)) * dir;
                    case "plate":
                        return (a.plate_short || a.plate || "").localeCompare(
                            b.plate_short || b.plate || "",
                            "es"
                        ) * dir;
                    case "price":
                        return ((a.price ?? 0) - (b.price ?? 0)) * dir;
                    case "mileage":
                        return ((a.mileage ?? 0) - (b.mileage ?? 0)) * dir;
                    case "location":
                        return String(a.location ?? "").localeCompare(String(b.location ?? ""), "es") * dir;
                    default:
                        return 0;
                }
            });
        }
        return list;
    }, [cars, activeView, search, sortKey, sortAsc]);

    const handleViewChange = (view: ReportView) => {
        setActiveView(view);
        setPage(1);
    };

    const totalCount = filteredCars.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
    const safePage = Math.min(page, totalPages);

    const paginatedCars = useMemo(() => {
        const start = (safePage - 1) * rowsPerPage;
        return filteredCars.slice(start, start + rowsPerPage);
    }, [filteredCars, safePage, rowsPerPage]);

    const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
    const rangeEnd = Math.min(safePage * rowsPerPage, totalCount);

    const toggleChecklist = useCallback(
        async (car: InventoryCar, key: ListingChecklistKey, checked: boolean) => {
            if (!canEdit) return;
            const cellId = `${car.id}-${key}`;
            setSavingCell(cellId);
            const current = parseListingChecklist(
                (car as { listing_checklist?: unknown }).listing_checklist
            );
            const next = { ...current, [key]: checked };
            const query = car.plate
                ? supabase
                      .from("inventoryoracle")
                      .update({ listing_checklist: next, updated_at: new Date().toISOString() })
                      .eq("plate", car.plate.toUpperCase())
                : supabase
                      .from("inventoryoracle")
                      .update({ listing_checklist: next, updated_at: new Date().toISOString() })
                      .eq("id", car.id);
            const { error } = await query;
            if (error) {
                toast.error("No se pudo actualizar");
            } else {
                toast.success("Actualizado");
                onReload?.();
            }
            setSavingCell(null);
        },
        [canEdit, supabase, onReload]
    );

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-[98vw] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
                                <LayoutGrid className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-900">Reportes Vehiculares</h2>
                                <p className="text-sm text-slate-500 truncate">
                                    {activeView === "disponible"
                                        ? "Stock disponible para venta"
                                        : "Historial de vehículos vendidos"}
                                    <span className="text-slate-400 mx-1.5">·</span>
                                    <span className="font-medium text-slate-700">{totalCount}</span> vehículos
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Tabs + búsqueda */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50/80">
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-200/60">
                            <button
                                type="button"
                                onClick={() => handleViewChange("disponible")}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                    activeView === "disponible"
                                        ? "bg-white text-red-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Disponibles
                                <span className="ml-1.5 tabular-nums text-xs font-bold opacity-80">
                                    ({viewCounts.disponible})
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleViewChange("vendido")}
                                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                    activeView === "vendido"
                                        ? "bg-white text-red-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                Vendidos
                                <span className="ml-1.5 tabular-nums text-xs font-bold opacity-80">
                                    ({viewCounts.vendido})
                                </span>
                            </button>
                        </div>

                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar marca, modelo o placa..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                            />
                        </div>
                    </div>

                    {/* Tabla compacta — sin scroll horizontal */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                        <table className="w-full table-fixed text-xs">
                            <colgroup>
                                <col className="w-[24%]" />
                                <col className="w-[7%]" />
                                <col className="w-[11%]" />
                                <col className="w-[8%]" />
                                <col className="w-[8%]" />
                                <col className="w-[4%]" />
                                <col className="w-[4%]" />
                                <col className="w-[4%]" />
                                <col className="w-[8%]" />
                                <col className="w-[10%]" />
                            </colgroup>
                            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                <tr>
                                    <SortableHeader
                                        label="Vehículo"
                                        sortKey="vehicle"
                                        current={sortKey}
                                        asc={sortAsc}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader label="Placa" sortKey="plate" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortableHeader label="Año/Color" sortKey="year" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortableHeader label="Precio" sortKey="price" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortableHeader label="Km" sortKey="mileage" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    {CHECKLIST_COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className="px-1 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase"
                                            title={col.label}
                                        >
                                            {col.short}
                                        </th>
                                    ))}
                                    <SortableHeader label="Ubic." sortKey="location" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">
                                        Acción
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedCars.length > 0 ? (
                                    paginatedCars.map((car) => {
                                        const checklist = parseListingChecklist(
                                            (car as { listing_checklist?: unknown }).listing_checklist
                                        );
                                        const plate = car.plate_short || car.plate || "S/P";

                                        return (
                                            <tr key={car.id} className="hover:bg-red-50/30 transition-colors border-b border-slate-100 last:border-0">
                                                <td className="px-2 py-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {car.img_main_url ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewingCar(car)}
                                                                className="h-7 w-7 shrink-0 rounded-full overflow-hidden border border-slate-200 hover:ring-2 hover:ring-red-200 transition-all"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={car.img_main_url}
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </button>
                                                        ) : (
                                                            <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
                                                                <Car className="h-3 w-3 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <span
                                                            className="text-[14px] font-bold leading-snug text-slate-800 capitalize truncate"
                                                            title={`${car.brand} ${car.model}`}
                                                        >
                                                            {car.brand} {car.model}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 font-mono text-[13px] font-semibold text-slate-700 truncate">
                                                    {plate}
                                                </td>
                                                <td className="px-2 py-2 text-[13px] text-slate-600 capitalize truncate" title={`${car.year} · ${car.color}`}>
                                                    {car.year || "—"} · {car.color || "—"}
                                                </td>
                                                <td className="px-2 py-2 text-[13px] font-semibold text-slate-900 tabular-nums truncate">
                                                    {formatPrice(car.price)}
                                                </td>
                                                <td className="px-2 py-2 text-[13px] text-slate-500 tabular-nums truncate">
                                                    {formatKm(car.mileage)}
                                                </td>
                                                {CHECKLIST_COLUMNS.map((col) => (
                                                    <td key={col.key} className="px-1 py-2 text-center">
                                                        <ChecklistToggle
                                                            checked={checklist[col.key]}
                                                            disabled={!canEdit}
                                                            saving={savingCell === `${car.id}-${col.key}`}
                                                            onChange={(v) => toggleChecklist(car, col.key, v)}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-2 text-[13px] text-slate-500 capitalize truncate">
                                                    {car.location || "Patio"}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (canEdit && onEdit) onEdit(car);
                                                            else setViewingCar(car);
                                                        }}
                                                        className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-[13px] font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
                                                    >
                                                        {canEdit ? "Gestionar" : "Ver"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                                            {activeView === "disponible"
                                                ? "No hay vehículos disponibles que coincidan con la búsqueda."
                                                : "No hay vehículos vendidos que coincidan con la búsqueda."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            >
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>
                                        {n} por página
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (safePage <= 3) pageNum = i + 1;
                                else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = safePage - 2 + i;
                                return (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setPage(pageNum)}
                                        className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                                            safePage === pageNum
                                                ? "bg-red-600 text-white"
                                                : "text-slate-600 hover:bg-slate-200/80"
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 tabular-nums">
                            {rangeStart} – {rangeEnd} de {totalCount} resultados
                        </p>
                    </div>
                </div>
            </div>

            {viewingCar && (
                <ImageViewerModal car={viewingCar} onClose={() => setViewingCar(null)} />
            )}
        </>
    );
}
