"use client";

import { Fragment, useState, useMemo, useEffect, type ReactNode } from "react";
import {
    Search,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
    Car,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { normalizePlate } from "@/lib/inventario/normalizePlate";
import { matchesInventorySearch } from "@/lib/inventario/inventorySearch";
import {
    VEHICLE_DOCUMENT_CATALOG,
    docCatalogByType,
    type DocCatalogEntry,
} from "@/lib/inventario/vehicleDocumentCatalog";
import {
    getDocumentCheckStatus,
    getCatalogDocumentRow,
    getFinesCheckStatus,
    listDocumentFiles,
    isDocumentCatalogItemVisible,
    type ChecklistCellStatus,
} from "@/lib/inventario/vehicleLegalUi";
import {
    loadBulkVehicleLegalChecklist,
    type VehicleLegalChecklistBulk,
} from "@/services/vehicleLegal.service";
import { listLatestContrasteConsultasByPlacas } from "@/services/contrasteConsultas.service";
import {
    formatContrasteConsultedPretty,
    formatContrasteRelative,
} from "@/lib/inventario/ecuadorContraste";
import { VehicleDocumentFilesModal } from "@/components/features/inventario/legal/VehicleDocumentFilesModal";
import type { VehicleDocumentFileRow, VehicleDocumentRow } from "@/types/vehicleLegal.types";
import type { VehiculoInventario } from "@/types/inventario.types";
import type { VehicleDetailTab } from "./VehicleDetailModal";

type ReportView = "active" | "baja";

type SortKey = "vehicle" | "plate" | "year" | "progress" | "contraste" | "alerts";

interface InventarioDocumentReportProps {
    vehiculos: VehiculoInventario[];
    onOpenVehicle?: (vehiculo: VehiculoInventario, tab?: VehicleDetailTab) => void;
    /** Incrementar para recargar checklist tras editar documentos en el modal */
    reloadKey?: number;
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
    title,
}: {
    label: string;
    sortKey: SortKey;
    current: SortKey | null;
    asc: boolean;
    onSort: (k: SortKey) => void;
    className?: string;
    stickyLeft?: boolean;
    title?: string;
}) {
    const active = current === sortKey;
    return (
        <th
            className={`px-3 py-3 text-left ${stickyLeft ? "sticky left-0 z-20 bg-slate-50 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]" : ""} ${className}`}
            title={title}
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

function YesNoCell({
    status,
    title,
    files,
    onPreview,
}: {
    status: ChecklistCellStatus;
    title: string;
    files?: VehicleDocumentFileRow[];
    onPreview?: () => void;
}) {
    if (status === "na") {
        return (
            <span className="text-[11px] text-slate-400" title={title}>
                —
            </span>
        );
    }
    if (status === "warn") {
        return (
            <span
                title={title}
                className="inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-amber-50 text-amber-800 border-amber-200"
            >
                Rev.
            </span>
        );
    }
    const isYes = status === "ok";
    const canPreview = isYes && files && files.length > 0 && onPreview;
    const label = isYes ? "Sí" : "No";

    if (!canPreview) {
        return (
            <span
                title={title}
                className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                    isYes
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200"
                }`}
            >
                {label}
            </span>
        );
    }

    return (
        <button
            type="button"
            title={`${title} — Ver ${files.length} archivo${files.length !== 1 ? "s" : ""}`}
            onClick={onPreview}
            className="inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:ring-2 hover:ring-emerald-200/80 cursor-pointer transition-all"
        >
            {label}
        </button>
    );
}

type FilePreviewState = {
    title: string;
    subtitle: string;
    files: VehicleDocumentFileRow[];
};

function DocumentYesNoCell({
    doc,
    catalogLabel,
    status,
    vehicleLabel,
    onPreview,
}: {
    doc: VehicleDocumentRow | undefined;
    catalogLabel: string;
    status: ChecklistCellStatus;
    vehicleLabel: string;
    onPreview: (preview: FilePreviewState) => void;
}) {
    const files = doc ? listDocumentFiles(doc) : [];
    return (
        <YesNoCell
            status={status}
            title={catalogLabel}
            files={files}
            onPreview={
                files.length > 0
                    ? () =>
                          onPreview({
                              title: catalogLabel,
                              subtitle: vehicleLabel,
                              files,
                          })
                    : undefined
            }
        />
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
        if (!isDocumentCatalogItemVisible(cat.docType, entry.documents)) continue;
        total += 1;
        const doc = getCatalogDocumentRow(entry.documents, cat.docType);
        if (getDocumentCheckStatus(doc, cat) === "ok") done += 1;
    }
    total += 1;
    if (getFinesCheckStatus(entry.pendingFinesCount, entry.totalFinesCount) === "ok") done += 1;
    return { done, total };
}

function documentCellStatus(
    linked: boolean,
    entry: VehicleLegalChecklistBulk["byPlate"] extends Map<string, infer V> ? V | undefined : never,
    col: DocCatalogEntry
): ChecklistCellStatus {
    if (!linked || !entry) return "na";
    if (!isDocumentCatalogItemVisible(col.docType, entry.documents)) return "na";
    const catalog = docCatalogByType(col.docType)!;
    const doc = getCatalogDocumentRow(entry.documents, col.docType);
    return getDocumentCheckStatus(doc, catalog);
}

type ChecklistEntry = VehicleLegalChecklistBulk["byPlate"] extends Map<string, infer V> ? V : never;

function documentaryStatusBadge(pct: number | null) {
    if (pct == null) {
        return {
            text: "Sin información",
            className: "bg-slate-50 text-slate-500 border-slate-200",
        };
    }
    if (pct >= 100) {
        return {
            text: `Completo · ${pct}%`,
            className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
    }
    if (pct >= 50) {
        return {
            text: `En proceso · ${pct}%`,
            className: "bg-amber-50 text-amber-800 border-amber-200",
        };
    }
    return {
        text: `Revisión · ${pct}%`,
        className: "bg-red-50 text-red-700 border-red-200",
    };
}

function DetailFieldCard({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 min-w-0">
            <p className="text-[10px] font-medium text-slate-500 leading-tight mb-1.5">{label}</p>
            <div className="flex items-center min-h-[22px]">{children}</div>
        </div>
    );
}

function DocumentDetailPanel({
    vehiculo,
    entry,
    linked,
    pct,
    pending,
    consultedAt,
    vehicleLabel,
    onPreview,
    onManage,
}: {
    vehiculo: VehiculoInventario;
    entry: ChecklistEntry | undefined;
    linked: boolean;
    pct: number | null;
    pending: number;
    consultedAt: string | undefined;
    vehicleLabel: string;
    onPreview: (preview: FilePreviewState) => void;
    onManage?: () => void;
}) {
    const title = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ").trim() || "Vehículo";
    return (
        <div className="px-4 py-4 md:px-5 md:py-5 bg-slate-50/80 border-t border-blue-100/80">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-snug">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Placa {vehiculo.placa} · Revisión documental
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-600">
                        <span className="tabular-nums font-semibold text-slate-700">
                            {pct == null ? "—" : `${pct}%`} de la revisión completada
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>
                            {pending === 0
                                ? "Sin pendientes por revisar"
                                : `${pending} pendiente${pending === 1 ? "" : "s"} por revisar`}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onManage}
                    disabled={!onManage}
                    className="inline-flex shrink-0 items-center self-start rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    Gestionar documentación
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                <DetailFieldCard label="Año">
                    <span className="text-[13px] font-semibold text-slate-700 tabular-nums">
                        {vehiculo.anioModelo || "—"}
                    </span>
                </DetailFieldCard>
                <DetailFieldCard label="Estado de validación mediante API">
                    {consultedAt ? (
                        <span
                            title={`Última consulta: ${formatContrasteConsultedPretty(consultedAt)}`}
                            className="inline-flex flex-col items-start gap-0.5"
                        >
                            <span className="inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Sí
                            </span>
                            <span className="text-[10px] text-slate-400 leading-none">
                                {formatContrasteRelative(consultedAt)}
                            </span>
                        </span>
                    ) : (
                        <span
                            title="Aún no hay consulta EcuadorAPI guardada para esta placa"
                            className="inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-500 border-slate-200"
                        >
                            No
                        </span>
                    )}
                </DetailFieldCard>
                {LEGAL_COLUMNS.map((col) => {
                    const doc = entry ? getCatalogDocumentRow(entry.documents, col.docType) : undefined;
                    const applies =
                        linked && entry && isDocumentCatalogItemVisible(col.docType, entry.documents);
                    const status = documentCellStatus(linked, entry, col);
                    const catalogLabel =
                        applies
                            ? col.label
                            : col.docType === "levantamiento_prendas"
                              ? "No aplica — sin prenda industrial"
                              : col.label;
                    return (
                        <DetailFieldCard key={col.docType} label={col.label}>
                            <DocumentYesNoCell
                                doc={doc}
                                catalogLabel={catalogLabel}
                                status={status}
                                vehicleLabel={vehicleLabel}
                                onPreview={onPreview}
                            />
                        </DetailFieldCard>
                    );
                })}
                {PHYSICAL_COLUMNS.map((col) => {
                    const doc = entry ? getCatalogDocumentRow(entry.documents, col.docType) : undefined;
                    const status = documentCellStatus(linked, entry, col);
                    return (
                        <DetailFieldCard key={col.docType} label={col.label}>
                            <DocumentYesNoCell
                                doc={doc}
                                catalogLabel={col.label}
                                status={status}
                                vehicleLabel={vehicleLabel}
                                onPreview={onPreview}
                            />
                        </DetailFieldCard>
                    );
                })}
                <DetailFieldCard label="Multas">
                    <YesNoCell
                        status={
                            linked
                                ? getFinesCheckStatus(entry?.pendingFinesCount ?? 0, entry?.totalFinesCount ?? 0)
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
                </DetailFieldCard>
            </div>
        </div>
    );
}

export function InventarioDocumentReport({
    vehiculos,
    onOpenVehicle,
    reloadKey = 0,
}: InventarioDocumentReportProps) {
    const { supabase } = useAuth();
    const [search, setSearch] = useState("");
    const [activeView, setActiveView] = useState<ReportView>("active");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [checklistData, setChecklistData] = useState<VehicleLegalChecklistBulk | null>(null);
    const [contrasteByPlate, setContrasteByPlate] = useState<Map<string, string>>(new Map());
    const [loadingChecklist, setLoadingChecklist] = useState(false);
    const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null);
    const [expandedProId, setExpandedProId] = useState<string | null>(null);

    const plateKey = useMemo(
        () => vehiculos.map((v) => normalizePlate(v.placa)).sort().join("|"),
        [vehiculos]
    );

    useEffect(() => {
        if (vehiculos.length === 0) {
            setChecklistData(null);
            setContrasteByPlate(new Map());
            return;
        }
        let cancelled = false;
        setLoadingChecklist(true);
        void Promise.allSettled([
            loadBulkVehicleLegalChecklist(supabase, vehiculos),
            listLatestContrasteConsultasByPlacas(
                supabase,
                vehiculos.map((v) => v.placa)
            ),
        ])
            .then(([checklistResult, contrasteResult]) => {
                if (cancelled) return;
                setChecklistData(
                    checklistResult.status === "fulfilled"
                        ? checklistResult.value
                        : { byPlate: new Map() }
                );
                setContrasteByPlate(
                    contrasteResult.status === "fulfilled" ? contrasteResult.value : new Map()
                );
            })
            .finally(() => {
                if (!cancelled) setLoadingChecklist(false);
            });
        return () => {
            cancelled = true;
        };
    }, [plateKey, supabase, vehiculos, reloadKey]);

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
            list = list.filter((v) =>
                matchesInventorySearch(search, [
                    v.marca,
                    v.modelo,
                    v.anioModelo,
                    v.descripcion,
                    v.placa,
                    v.placaCaracteristica,
                    v.chasis,
                    v.color,
                    v.tipo,
                    v.version,
                ])
            );
        }

        if (sortKey) {
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
                        if (!checklistData) return 0;
                        const ea = checklistData.byPlate.get(normalizePlate(a.placa));
                        const eb = checklistData.byPlate.get(normalizePlate(b.placa));
                        const pa = ea ? countComplete(ea).done / Math.max(countComplete(ea).total, 1) : 0;
                        const pb = eb ? countComplete(eb).done / Math.max(countComplete(eb).total, 1) : 0;
                        return (pa - pb) * dir;
                    }
                    case "alerts": {
                        if (!checklistData) return 0;
                        const ea = checklistData.byPlate.get(normalizePlate(a.placa));
                        const eb = checklistData.byPlate.get(normalizePlate(b.placa));
                        const ca = ea ? countComplete(ea) : { done: 0, total: 0 };
                        const cb = eb ? countComplete(eb) : { done: 0, total: 0 };
                        const pa = Math.max(ca.total - ca.done, 0);
                        const pb = Math.max(cb.total - cb.done, 0);
                        return (pa - pb) * dir;
                    }
                    case "contraste": {
                        const da = contrasteByPlate.get(normalizePlate(a.placa)) ?? "";
                        const db = contrasteByPlate.get(normalizePlate(b.placa)) ?? "";
                        if (!da && !db) return 0;
                        if (!da) return 1;
                        if (!db) return -1;
                        return da.localeCompare(db) * dir;
                    }
                    default:
                        return 0;
                }
            });
        }
        return list;
    }, [vehiculos, activeView, search, sortKey, sortAsc, checklistData, contrasteByPlate]);

    const handleViewChange = (view: ReportView) => {
        setActiveView(view);
        setPage(1);
        setExpandedProId(null);
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

    const totalCols = 5;

    return (
        <>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
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
                            setExpandedProId(null);
                        }}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                </div>
            </div>

            {loadingChecklist && (
                <div className="flex items-center gap-2 px-4 md:px-6 py-2 text-xs text-slate-500 border-b border-slate-100 bg-blue-50/50">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    Cargando estado documental de la flota…
                </div>
            )}

            <div className="overflow-x-auto">
                    <table className="w-full text-xs border-separate border-spacing-0">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <SortableHeader
                                    label="Vehículo"
                                    sortKey="vehicle"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[220px]"
                                />
                                <SortableHeader
                                    label="Placa"
                                    sortKey="plate"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[96px]"
                                />
                                <SortableHeader
                                    label="Estado documental"
                                    sortKey="progress"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[140px]"
                                />
                                <SortableHeader
                                    label="Alertas"
                                    sortKey="alerts"
                                    current={sortKey}
                                    asc={sortAsc}
                                    onSort={handleSort}
                                    className="min-w-[120px]"
                                />
                                <th className="px-3 py-3 text-right text-[13px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody>
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
                                    const pending =
                                        progress.total > 0 ? Math.max(progress.total - progress.done, 0) : 0;
                                    const vehicleLabel = `${v.placa} · ${v.marca ?? ""} ${v.modelo ?? ""}`.trim();
                                    const consultedAt = contrasteByPlate.get(normalizePlate(v.placa));
                                    const expanded = expandedProId === v.proId;
                                    const statusBadge = documentaryStatusBadge(pct);

                                    return (
                                        <Fragment key={v.proId}>
                                            <tr
                                                className={`group border-b border-slate-100 transition-colors ${
                                                    expanded
                                                        ? "bg-blue-50/50 shadow-[inset_3px_0_0_0_rgba(59,130,246,0.35)]"
                                                        : "hover:bg-blue-50/30 bg-white"
                                                }`}
                                            >
                                                <td className={`px-3 py-3 min-w-[220px] max-w-[320px] ${expanded ? "bg-blue-50/50" : "bg-white group-hover:bg-blue-50/30"}`}>
                                                    <VehicleNameCell vehiculo={v} />
                                                </td>
                                                <td className="px-3 py-3 font-mono text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                                                    {v.placa}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}
                                                    >
                                                        {statusBadge.text}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {!linked || progress.total === 0 ? (
                                                        <span className="text-[11px] text-slate-400">—</span>
                                                    ) : pending === 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                                                            <span aria-hidden>✓</span> Sin alertas
                                                        </span>
                                                    ) : pending === 1 ? (
                                                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-800">
                                                            <span aria-hidden>⚠</span> 1 pendiente
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-red-700">
                                                            <span aria-hidden>●</span> {pending} pendientes
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        aria-expanded={expanded}
                                                        onClick={() =>
                                                            setExpandedProId(expanded ? null : v.proId)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                                                    >
                                                        Ver detalle
                                                        <ChevronDown
                                                            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                                                        />
                                                    </button>
                                                </td>
                                            </tr>
                                            {expanded ? (
                                                <tr className="border-b border-slate-200">
                                                    <td colSpan={totalCols} className="p-0">
                                                        <DocumentDetailPanel
                                                            vehiculo={v}
                                                            entry={entry}
                                                            linked={linked}
                                                            pct={pct}
                                                            pending={pending}
                                                            consultedAt={consultedAt}
                                                            vehicleLabel={vehicleLabel}
                                                            onPreview={setFilePreview}
                                                            onManage={() => onOpenVehicle?.(v, "documentos")}
                                                        />
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex min-w-[34px] justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Sí
                            </span>
                            Completo / al día
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex min-w-[34px] justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Rev.
                            </span>
                            Revisión parcial
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex min-w-[34px] justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                No
                            </span>
                            Falta o requiere atención
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex min-w-[34px] justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                                —
                            </span>
                            Sin información / no aplica
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setPage(1);
                                setExpandedProId(null);
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
                            onClick={() => {
                                setPage((p) => p - 1);
                                setExpandedProId(null);
                            }}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => {
                                setPage((p) => p + 1);
                                setExpandedProId(null);
                            }}
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

        {filePreview && (
            <VehicleDocumentFilesModal
                title={filePreview.title}
                subtitle={filePreview.subtitle}
                files={filePreview.files}
                onClose={() => setFilePreview(null)}
            />
        )}
        </>
    );
}
