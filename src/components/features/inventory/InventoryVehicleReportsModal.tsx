"use client";

import { useState, useMemo, useCallback } from "react";
import {
    Search,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    Check,
    Loader2,
    Car,
} from "lucide-react";
import { toast } from "sonner";

import { ImageViewerModal } from "@/components/features/inventory/ImageViewerModal";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryCar } from "@/hooks/useInventory";
import {
    parseListingChecklist,
    resolveListingChecklist,
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

interface InventoryVehicleReportProps {
    cars: InventoryCar[];
    onEdit?: (car: InventoryCar) => void;
    onReload?: () => void;
    currentUserRole?: string | null;
}

const CHECKLIST_COLUMNS: { key: ListingChecklistKey; label: string }[] = [
    { key: "patio_tuerca", label: "Patio Tuerca" },
    { key: "marketplace", label: "Marketplace" },
    { key: "pagina_web", label: "Página web" },
    { key: "ficha_tecnica", label: "Ficha técnica" },
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
        <th className={`px-2 py-2.5 text-left ${className}`}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-600 uppercase tracking-wide hover:text-red-600 transition-colors"
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

export function InventoryVehicleReport({
    cars,
    onEdit,
    onReload,
    currentUserRole,
}: InventoryVehicleReportProps) {
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

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
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

                <div className="overflow-x-auto">
                        <table className="min-w-max w-full text-xs">
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
                                            className="px-2 py-2.5 text-center text-[13px] font-semibold text-slate-700 min-w-[96px] max-w-[112px] whitespace-normal leading-snug align-bottom"
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                    <SortableHeader label="Ubic." sortKey="location" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <th className="px-2 py-2.5 text-center text-[13px] font-semibold text-slate-600 uppercase">
                                        Acción
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedCars.length > 0 ? (
                                    paginatedCars.map((car) => {
                                        const checklist = resolveListingChecklist(
                                            (car as { listing_checklist?: unknown }).listing_checklist,
                                            {
                                                img_main_url: car.img_main_url,
                                                img_gallery_urls: car.img_gallery_urls,
                                            }
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
                                                {CHECKLIST_COLUMNS.map((col) => {
                                                    const isPaginaWebAuto = col.key === "pagina_web";
                                                    return (
                                                        <td key={col.key} className="px-1 py-2 text-center">
                                                            <ChecklistToggle
                                                                checked={checklist[col.key]}
                                                                disabled={!canEdit || isPaginaWebAuto}
                                                                saving={savingCell === `${car.id}-${col.key}`}
                                                                onChange={(v) => toggleChecklist(car, col.key, v)}
                                                            />
                                                        </td>
                                                    );
                                                })}
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
                                        <td colSpan={11} className="px-4 py-16 text-center text-slate-400">
                                            {activeView === "disponible"
                                                ? "No hay vehículos disponibles que coincidan con la búsqueda."
                                                : "No hay vehículos vendidos que coincidan con la búsqueda."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50/50">
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

            {viewingCar && (
                <ImageViewerModal car={viewingCar} onClose={() => setViewingCar(null)} />
            )}
        </>
    );
}
