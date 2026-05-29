"use client";

import { useState, useMemo, useEffect } from "react";
import {
    X,
    Search,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Car,
    FileCheck2,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { normalizePlate } from "@/lib/inventario/normalizePlate";
import {
    VEHICLE_DEBT_CATALOG,
    VEHICLE_DOCUMENT_CATALOG,
    docCatalogByType,
} from "@/lib/inventario/vehicleDocumentCatalog";
import {
    getDebtCheckStatus,
    getDocumentCheckStatus,
    getFinesCheckStatus,
    type ChecklistCellStatus,
} from "@/lib/inventario/vehicleLegalUi";
import {
    loadBulkVehicleLegalChecklist,
    type VehicleLegalChecklistBulk,
} from "@/services/vehicleLegal.service";
import type { VehiculoInventario } from "@/types/inventario.types";
import type { VehicleDetailTab } from "./VehicleDetailModal";

type ReportView = "active" | "baja";

type SortKey = "vehicle" | "plate" | "year" | "progress";

interface InventarioDocumentReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehiculos: VehiculoInventario[];
    onOpenVehicle?: (vehiculo: VehiculoInventario, tab?: VehicleDetailTab) => void;
}

const LEGAL_COLUMNS = VEHICLE_DOCUMENT_CATALOG.filter((d) => d.category === "legal");
const PHYSICAL_COLUMNS = VEHICLE_DOCUMENT_CATALOG.filter((d) => d.category === "physical");
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function SortableHeader({
    label,
    sortKey,
    current,
    asc,
    onSort,
    className = "",
    stickyLeft = false,
}: {
    label: string;
    sortKey: SortKey;
    current: SortKey | null;
    asc: boolean;
    onSort: (k: SortKey) => void;
    className?: string;
    stickyLeft?: boolean;
}) {
    const active = current === sortKey;
    return (
        <th
            className={`px-3 py-2 text-left ${stickyLeft ? "sticky left-0 z-20 bg-slate-50 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]" : ""} ${className}`}
            rowSpan={2}
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-slate-600 uppercase tracking-wide hover:text-blue-600 transition-colors whitespace-nowrap"
            >
                {label}
                <ChevronsUpDown
                    className={`h-3 w-3 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
                />
            </button>
        </th>
    );
}

function YesNoCell({ status, title }: { status: ChecklistCellStatus; title: string }) {
    if (status === "na") {
        return (
            <span className="text-[11px] text-slate-300" title={title}>
                —
            </span>
        );
    }
    const isYes = status === "ok";
    return (
        <span
            title={title}
            className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                isYes
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-600 border-red-200"
            }`}
        >
            {isYes ? "Sí" : "No"}
        </span>
    );
}

function VehicleNameCell({ vehiculo }: { vehiculo: VehiculoInventario }) {
    const marca = vehiculo.marca?.trim() || "Sin marca";
    const modelo = vehiculo.modelo?.trim() || vehiculo.descripcion?.trim() || "—";
    const extra =
        vehiculo.descripcion?.trim() &&
        vehiculo.descripcion.trim().toLowerCase() !== modelo.toLowerCase()
            ? vehiculo.descripcion.trim()
            : null;

    return (
        <div className="flex items-start gap-2.5 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                <Car className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 capitalize leading-tight">{marca}</p>
                <p
                    className="text-[12px] text-slate-600 capitalize leading-snug line-clamp-2 mt-0.5"
                    title={modelo}
                >
                    {modelo}
                </p>
                {extra && (
                    <p className="text-[10px] text-slate-400 capitalize line-clamp-1 mt-0.5" title={extra}>
                        {extra}
                    </p>
                )}
            </div>
        </div>
    );
}

function countComplete(
    entry: VehicleLegalChecklistBulk["byPlate"] extends Map<string, infer V> ? V : never
): { done: number; total: number } {
    if (!entry?.inventoryoracleId) return { done: 0, total: 0 };
    let done = 0;
    let total = 0;
    for (const cat of VEHICLE_DOCUMENT_CATALOG) {
        total += 1;
        const doc = entry.documents.get(cat.docType);
        if (getDocumentCheckStatus(doc, cat) === "ok") done += 1;
    }
    for (const cat of VEHICLE_DEBT_CATALOG) {
        total += 1;
        const debt = entry.debts.get(cat.debtType);
        if (getDebtCheckStatus(debt) === "ok") done += 1;
    }
    total += 1;
    if (getFinesCheckStatus(entry.pendingFinesCount, entry.totalFinesCount) === "ok") done += 1;
    return { done, total };
}

export function InventarioDocumentReportsModal({
    isOpen,
    onClose,
    vehiculos,
    onOpenVehicle,
}: InventarioDocumentReportsModalProps) {
    const { supabase } = useAuth();
    const [search, setSearch] = useState("");
    const [activeView, setActiveView] = useState<ReportView>("active");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [checklistData, setChecklistData] = useState<VehicleLegalChecklistBulk | null>(null);
    const [loadingChecklist, setLoadingChecklist] = useState(false);

    const plateKey = useMemo(
        () => vehiculos.map((v) => normalizePlate(v.placa)).sort().join("|"),
        [vehiculos]
    );

    useEffect(() => {
        if (!isOpen || vehiculos.length === 0) {
            setChecklistData(null);
            return;
        }
        let cancelled = false;
        setLoadingChecklist(true);
        void loadBulkVehicleLegalChecklist(supabase, vehiculos)
            .then((data) => {
                if (!cancelled) setChecklistData(data);
            })
            .catch(() => {
                if (!cancelled) setChecklistData({ byPlate: new Map() });
            })
            .finally(() => {
                if (!cancelled) setLoadingChecklist(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, plateKey, supabase, vehiculos]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc((p) => !p);
        else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const viewCounts = useMemo(
        () => ({
            active: vehiculos.filter((v) => v.stock > 0).length,
            baja: vehiculos.filter((v) => v.stock === 0).length,
        }),
        [vehiculos]
    );

    const filteredVehiculos = useMemo(() => {
        let list =
            activeView === "active"
                ? vehiculos.filter((v) => v.stock > 0)
                : vehiculos.filter((v) => v.stock === 0);

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (v) =>
                    v.marca?.toLowerCase().includes(q) ||
                    v.modelo?.toLowerCase().includes(q) ||
                    v.placa?.toLowerCase().includes(q)
            );
        }

        if (sortKey && checklistData) {
            const dir = sortAsc ? 1 : -1;
            list = [...list].sort((a, b) => {
                switch (sortKey) {
                    case "vehicle":
                        return `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`, "es") * dir;
                    case "plate":
                        return a.placa.localeCompare(b.placa, "es") * dir;
                    case "year":
                        return ((Number(a.anioModelo) || 0) - (Number(b.anioModelo) || 0)) * dir;
                    case "progress": {
                        const ea = checklistData.byPlate.get(normalizePlate(a.placa));
                        const eb = checklistData.byPlate.get(normalizePlate(b.placa));
                        const pa = ea ? countComplete(ea).done / Math.max(countComplete(ea).total, 1) : 0;
                        const pb = eb ? countComplete(eb).done / Math.max(countComplete(eb).total, 1) : 0;
                        return (pa - pb) * dir;
                    }
                    default:
                        return 0;
                }
            });
        }
        return list;
    }, [vehiculos, activeView, search, sortKey, sortAsc, checklistData]);

    const handleViewChange = (view: ReportView) => {
        setActiveView(view);
        setPage(1);
    };

    const totalCount = filteredVehiculos.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
    const safePage = Math.min(page, totalPages);

    const paginated = useMemo(() => {
        const start = (safePage - 1) * rowsPerPage;
        return filteredVehiculos.slice(start, start + rowsPerPage);
    }, [filteredVehiculos, safePage, rowsPerPage]);

    const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
    const rangeEnd = Math.min(safePage * rowsPerPage, totalCount);

    const totalCols =
        4 + LEGAL_COLUMNS.length + PHYSICAL_COLUMNS.length + VEHICLE_DEBT_CATALOG.length + 2;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-[98vw] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                            <FileCheck2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-900">Reporte de Documentación</h2>
                            <p className="text-sm text-slate-500 truncate">
                                {activeView === "active"
                                    ? "Checklist legal y documental — stock activo"
                                    : "Checklist legal y documental — dados de baja"}
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

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50/80">
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-200/60">
                        <button
                            type="button"
                            onClick={() => handleViewChange("active")}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                activeView === "active"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            En stock
                            <span className="ml-1.5 tabular-nums text-xs font-bold opacity-80">
                                ({viewCounts.active})
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewChange("baja")}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                activeView === "baja"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Baja / Vendidos
                            <span className="ml-1.5 tabular-nums text-xs font-bold opacity-80">
                                ({viewCounts.baja})
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
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                    </div>
                </div>

                {loadingChecklist && (
                    <div className="flex items-center gap-2 px-6 py-2 text-xs text-slate-500 border-b border-slate-100 bg-blue-50/50">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        Cargando estado documental de la flota…
                    </div>
                )}

                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                    <table className="min-w-max w-full text-xs border-separate border-spacing-0">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader
                                    label="Vehículo"
                                    sortKey="vehicle"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    stickyLeft
                                    className="min-w-[240px]"
                                />
                                <SortableHeader
                                    label="Placa"
                                    sortKey="plate"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[88px]"
                                />
                                <SortableHeader
                                    label="Año"
                                    sortKey="year"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[56px]"
                                />
                                <SortableHeader
                                    label="%"
                                    sortKey="progress"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[48px]"
                                />
                                <th
                                    colSpan={LEGAL_COLUMNS.length}
                                    className="px-2 py-2 text-center text-[13px] font-bold text-slate-500 uppercase tracking-wide border-l border-slate-200"
                                >
                                    Propiedad y legales
                                </th>
                                <th
                                    colSpan={PHYSICAL_COLUMNS.length}
                                    className="px-2 py-2 text-center text-[13px] font-bold text-slate-500 uppercase tracking-wide border-l border-slate-200"
                                >
                                    Condición física
                                </th>
                                <th
                                    colSpan={VEHICLE_DEBT_CATALOG.length + 1}
                                    className="px-2 py-2 text-center text-[13px] font-bold text-slate-500 uppercase tracking-wide border-l border-slate-200"
                                >
                                    Multas y deudas
                                </th>
                                <th
                                    rowSpan={2}
                                    className="px-3 py-2.5 text-center text-[13px] font-semibold text-slate-600 uppercase border-l border-slate-200 min-w-[88px] whitespace-nowrap"
                                >
                                    Acción
                                </th>
                            </tr>
                            <tr className="border-t border-slate-100">
                                {LEGAL_COLUMNS.map((col) => (
                                    <th
                                        key={col.docType}
                                        className="px-2 py-2.5 text-center text-[13px] font-semibold text-slate-700 border-l border-slate-100 min-w-[96px] max-w-[120px] whitespace-normal leading-snug align-bottom"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                {PHYSICAL_COLUMNS.map((col) => (
                                    <th
                                        key={col.docType}
                                        className="px-2 py-2.5 text-center text-[13px] font-semibold text-slate-700 border-l border-slate-100 min-w-[96px] max-w-[120px] whitespace-normal leading-snug align-bottom"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                <th
                                    className="px-2 py-2.5 text-center text-[13px] font-semibold text-slate-700 border-l border-slate-100 min-w-[80px] whitespace-normal leading-snug align-bottom"
                                    title="¿Multas al día? (Sí = revisado sin pendientes)"
                                >
                                    Multas
                                </th>
                                {VEHICLE_DEBT_CATALOG.map((col) => (
                                    <th
                                        key={col.debtType}
                                        className="px-2 py-2.5 text-center text-[13px] font-semibold text-slate-700 border-l border-slate-100 min-w-[96px] max-w-[130px] whitespace-normal leading-snug align-bottom"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginated.length > 0 ? (
                                paginated.map((v) => {
                                    const entry = checklistData?.byPlate.get(normalizePlate(v.placa));
                                    const linked = Boolean(entry?.inventoryoracleId);
                                    const progress = entry ? countComplete(entry) : { done: 0, total: 0 };
                                    const pct =
                                        progress.total > 0
                                            ? Math.round((progress.done / progress.total) * 100)
                                            : linked
                                              ? 0
                                              : null;

                                    return (
                                        <tr
                                            key={v.proId}
                                            className="group hover:bg-blue-50/40 transition-colors border-b border-slate-100 last:border-0"
                                        >
                                            <td className="px-3 py-3 min-w-[240px] max-w-[280px] sticky left-0 z-[1] bg-white group-hover:bg-blue-50/40 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                                                <VehicleNameCell vehiculo={v} />
                                            </td>
                                            <td className="px-3 py-3 font-mono text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                                                {v.placa}
                                            </td>
                                            <td className="px-3 py-3 text-[13px] text-slate-600 tabular-nums whitespace-nowrap">
                                                {v.anioModelo || "—"}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                {pct == null ? (
                                                    <span className="text-[11px] text-slate-300">—</span>
                                                ) : (
                                                    <span
                                                        className={`text-[11px] font-bold tabular-nums ${
                                                            pct >= 80
                                                                ? "text-emerald-600"
                                                                : pct >= 50
                                                                  ? "text-amber-600"
                                                                  : "text-red-600"
                                                        }`}
                                                    >
                                                        {pct}%
                                                    </span>
                                                )}
                                            </td>
                                            {LEGAL_COLUMNS.map((col) => {
                                                const catalog = docCatalogByType(col.docType)!;
                                                const doc = entry?.documents.get(col.docType);
                                                const status: ChecklistCellStatus = linked
                                                    ? getDocumentCheckStatus(doc, catalog)
                                                    : "na";
                                                return (
                                                    <td key={col.docType} className="px-2 py-3 text-center border-l border-slate-50">
                                                        <YesNoCell status={status} title={col.label} />
                                                    </td>
                                                );
                                            })}
                                            {PHYSICAL_COLUMNS.map((col) => {
                                                const catalog = docCatalogByType(col.docType)!;
                                                const doc = entry?.documents.get(col.docType);
                                                const status: ChecklistCellStatus = linked
                                                    ? getDocumentCheckStatus(doc, catalog)
                                                    : "na";
                                                return (
                                                    <td key={col.docType} className="px-2 py-3 text-center border-l border-slate-50">
                                                        <YesNoCell status={status} title={col.label} />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-3 text-center border-l border-slate-50">
                                                <YesNoCell
                                                    status={
                                                        linked
                                                            ? getFinesCheckStatus(
                                                                  entry?.pendingFinesCount ?? 0,
                                                                  entry?.totalFinesCount ?? 0
                                                              )
                                                            : "na"
                                                    }
                                                    title={
                                                        entry?.pendingFinesCount
                                                            ? `${entry.pendingFinesCount} multa(s) pendiente(s)`
                                                            : entry?.totalFinesCount
                                                              ? "Multas revisadas — sin pendientes"
                                                              : "Multas no revisadas"
                                                    }
                                                />
                                            </td>
                                            {VEHICLE_DEBT_CATALOG.map((col) => {
                                                const debt = entry?.debts.get(col.debtType);
                                                const status: ChecklistCellStatus = linked
                                                    ? getDebtCheckStatus(debt)
                                                    : "na";
                                                return (
                                                    <td key={col.debtType} className="px-2 py-3 text-center border-l border-slate-50">
                                                        <YesNoCell status={status} title={col.label} />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-center border-l border-slate-50">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenVehicle?.(v, "documentos")}
                                                    disabled={!onOpenVehicle}
                                                    className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
                                                >
                                                    Gestionar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={totalCols} className="px-4 py-16 text-center text-slate-400">
                                        No hay vehículos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex min-w-[34px] justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Sí
                            </span>
                            Completo / al día
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex min-w-[34px] justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                No
                            </span>
                            Falta, pendiente o no revisado
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n} por página
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="text-sm text-slate-500 tabular-nums">
                        {rangeStart} – {rangeEnd} de {totalCount}
                    </p>
                </div>
            </div>
        </div>
    );
}
