"use client";

import { useState, useMemo } from "react";
import {
    FileSpreadsheet,
    Printer,
    X,
    Loader2,
    CheckSquare,
    Filter,
    ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { InventoryCar } from "@/hooks/useInventory";
import {
    INVENTORY_EXPORT_FIELDS,
    DEFAULT_EXPORT_FIELD_IDS,
    type ExportFieldId,
} from "./inventoryExportFields";

export type ExportStatusFilter = "current" | "all" | "disponible" | "vendido" | "reservado" | "mantenimiento" | "devuelto" | "conwilsonhernan" | "consignacion";

/** Cómo ordenar las filas al exportar o imprimir (agrupa lógicamente, p. ej. todas las Ford juntas). */
export type ExportOrganizeBy =
    | "as_list"
    | "brand"
    | "model"
    | "year_desc"
    | "year_asc"
    | "status"
    | "location"
    | "price_asc"
    | "price_desc";

const ORGANIZE_OPTIONS: { value: ExportOrganizeBy; label: string; hint?: string }[] = [
    { value: "as_list", label: "Como en la lista actual", hint: "Respeta el orden que ves en pantalla (o en datos sin reordenar)." },
    { value: "brand", label: "Por marca (A-Z)", hint: "Agrupa por marca: Ford, Kia, Toyota… luego modelo y año." },
    { value: "model", label: "Por modelo (A-Z)", hint: "Orden alfabético por modelo; empata por marca." },
    { value: "year_desc", label: "Por año (más nuevo primero)" },
    { value: "year_asc", label: "Por año (más antiguo primero)" },
    { value: "status", label: "Por estado", hint: "Disponible, vendido, reservado… alfabético." },
    { value: "location", label: "Por ubicación", hint: "Agrupa por local o sede." },
    { value: "price_asc", label: "Por precio (menor → mayor)" },
    { value: "price_desc", label: "Por precio (mayor → menor)" },
];

function cmpLocale(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? "").localeCompare(b ?? "", "es", { sensitivity: "base", numeric: true });
}

function sortCarsForExport(cars: InventoryCar[], by: ExportOrganizeBy): InventoryCar[] {
    const list = [...cars];
    switch (by) {
        case "as_list":
            return list;
        case "brand":
            list.sort((a, b) => {
                const cb = cmpLocale(a.brand, b.brand);
                if (cb !== 0) return cb;
                const cm = cmpLocale(a.model, b.model);
                if (cm !== 0) return cm;
                return (b.year ?? 0) - (a.year ?? 0);
            });
            return list;
        case "model":
            list.sort((a, b) => {
                const cm = cmpLocale(a.model, b.model);
                if (cm !== 0) return cm;
                const cb = cmpLocale(a.brand, b.brand);
                if (cb !== 0) return cb;
                return (b.year ?? 0) - (a.year ?? 0);
            });
            return list;
        case "year_desc":
            list.sort((a, b) => {
                const cy = (b.year ?? 0) - (a.year ?? 0);
                if (cy !== 0) return cy;
                return cmpLocale(a.brand, b.brand) || cmpLocale(a.model, b.model);
            });
            return list;
        case "year_asc":
            list.sort((a, b) => {
                const cy = (a.year ?? 0) - (b.year ?? 0);
                if (cy !== 0) return cy;
                return cmpLocale(a.brand, b.brand) || cmpLocale(a.model, b.model);
            });
            return list;
        case "status":
            list.sort((a, b) => {
                const cs = cmpLocale(String(a.status ?? ""), String(b.status ?? ""));
                if (cs !== 0) return cs;
                return cmpLocale(a.brand, b.brand) || cmpLocale(a.model, b.model);
            });
            return list;
        case "location":
            list.sort((a, b) => {
                const cl = cmpLocale(String(a.location ?? ""), String(b.location ?? ""));
                if (cl !== 0) return cl;
                return cmpLocale(a.brand, b.brand) || cmpLocale(a.model, b.model);
            });
            return list;
        case "price_asc":
            list.sort((a, b) => {
                const cp = (a.price ?? 0) - (b.price ?? 0);
                if (cp !== 0) return cp;
                return cmpLocale(a.brand, b.brand) || cmpLocale(a.model, b.model);
            });
            return list;
        case "price_desc":
            list.sort((a, b) => {
                const cp = (b.price ?? 0) - (a.price ?? 0);
                if (cp !== 0) return cp;
                return cmpLocale(a.brand, b.brand) || cmpLocale(a.model, b.model);
            });
            return list;
        default:
            return list;
    }
}

const STATUS_OPTIONS: { value: ExportStatusFilter; label: string }[] = [
    { value: "current", label: "Vista actual (filtros aplicados)" },
    { value: "all", label: "Todos los vehículos" },
    { value: "disponible", label: "Solo disponibles" },
    { value: "vendido", label: "Solo vendidos" },
    { value: "reservado", label: "Solo reservados" },
    { value: "mantenimiento", label: "Solo taller" },
    { value: "devuelto", label: "Solo devueltos" },
    { value: "conwilsonhernan", label: "Con Wilson Hernan" },
    { value: "consignacion", label: "En consignación" },
];

interface InventoryExportPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Lista ya filtrada y ordenada según la vista (processedInventory) */
    allFilteredCars: InventoryCar[];
    /** Si usamos "current", aplicamos esta lista tal cual; si no, filtramos por status desde la misma fuente */
    fullInventory?: InventoryCar[];
}

export function InventoryExportPrintModal({
    isOpen,
    onClose,
    allFilteredCars,
    fullInventory = [],
}: InventoryExportPrintModalProps) {
    const [statusFilter, setStatusFilter] = useState<ExportStatusFilter>("current");
    const [selectedFields, setSelectedFields] = useState<Record<ExportFieldId, boolean>>(() => {
        const o = {} as Record<ExportFieldId, boolean>;
        INVENTORY_EXPORT_FIELDS.forEach((f) => {
            o[f.id] = DEFAULT_EXPORT_FIELD_IDS.includes(f.id);
        });
        return o;
    });
    const [organizeBy, setOrganizeBy] = useState<ExportOrganizeBy>("as_list");
    const [isExporting, setIsExporting] = useState(false);

    const carsToExport = useMemo(() => {
        if (statusFilter === "current") return allFilteredCars;
        if (statusFilter === "all") return fullInventory;
        return fullInventory.filter((c) => c.status === statusFilter);
    }, [statusFilter, allFilteredCars, fullInventory]);

    const sortedCarsToExport = useMemo(
        () => sortCarsForExport(carsToExport, organizeBy),
        [carsToExport, organizeBy]
    );

    const activeFields = useMemo(
        () => INVENTORY_EXPORT_FIELDS.filter((f) => selectedFields[f.id]),
        [selectedFields]
    );

    const toggleField = (id: ExportFieldId) => {
        setSelectedFields((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const selectAllFields = () => {
        const next = { ...selectedFields };
        INVENTORY_EXPORT_FIELDS.forEach((f) => (next[f.id] = true));
        setSelectedFields(next);
    };

    const deselectAllFields = () => {
        const next = { ...selectedFields };
        INVENTORY_EXPORT_FIELDS.forEach((f) => (next[f.id] = false));
        setSelectedFields(next);
    };

    const handleExportExcel = () => {
        if (activeFields.length === 0) {
            alert("Selecciona al menos un campo para exportar.");
            return;
        }
        setIsExporting(true);
        try {
            const rows = sortedCarsToExport.map((car) => {
                const row: Record<string, string | number> = {};
                activeFields.forEach((f) => {
                    const val = f.getValue(car);
                    row[f.label] = val != null && val !== "" ? String(val) : "";
                });
                return row;
            });
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
            const colWidths = activeFields.map(() => ({ wch: 18 }));
            worksheet["!cols"] = colWidths;
            const fileName = `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            onClose();
        } catch (e) {
            console.error("Error exportando Excel", e);
            alert("No se pudo generar el Excel.");
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = () => {
        if (activeFields.length === 0) {
            alert("Selecciona al menos un campo para imprimir.");
            return;
        }
        setIsExporting(true);
        try {
            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                alert("Permite ventanas emergentes para imprimir.");
                setIsExporting(false);
                return;
            }
            const headers = activeFields.map((f) => f.label).join("</th><th>");
            const rowsHtml = sortedCarsToExport
                .map(
                    (car) =>
                        "<tr>" +
                        activeFields
                            .map((f) => {
                                const val = f.getValue(car);
                                const text = val != null && val !== "" ? String(val) : "—";
                                return `<td>${escapeHtml(text)}</td>`;
                            })
                            .join("") +
                        "</tr>"
                )
                .join("");
            const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inventario - ${new Date().toLocaleDateString("es-ES")}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; color: #1e293b; }
    h1 { font-size: 1.25rem; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Inventario de vehículos — ${new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}</h1>
  <p style="margin-bottom: 12px; color: #64748b;">${sortedCarsToExport.length} vehículo(s)</p>
  <table>
    <thead><tr><th>${headers}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 300);
            onClose();
        } catch (e) {
            console.error("Error al imprimir", e);
            alert("No se pudo abrir la ventana de impresión.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    const countForStatus =
        statusFilter === "current"
            ? allFilteredCars.length
            : statusFilter === "all"
              ? fullInventory.length
              : fullInventory.filter((c) => c.status === statusFilter).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        Exportar o imprimir inventario
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Qué incluir */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Qué vehículos incluir
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ExportStatusFilter)}
                            className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-8 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500">
                            Se incluirán <strong>{countForStatus}</strong> vehículo(s).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Organizar filas al exportar / imprimir
                        </label>
                        <select
                            value={organizeBy}
                            onChange={(e) => setOrganizeBy(e.target.value as ExportOrganizeBy)}
                            className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-8 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                            {ORGANIZE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500">
                            {ORGANIZE_OPTIONS.find((o) => o.value === organizeBy)?.hint ??
                                "El Excel y la vista de impresión usarán este orden."}
                        </p>
                    </div>

                    {/* Campos a exportar/imprimir */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <CheckSquare className="h-4 w-4" />
                                Campos a incluir
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllFields}
                                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    Todos
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAllFields}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                    Ninguno
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 max-h-48 overflow-y-auto">
                            {INVENTORY_EXPORT_FIELDS.map((f) => (
                                <label
                                    key={f.id}
                                    className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:bg-white rounded px-2 py-1.5"
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!selectedFields[f.id]}
                                        onChange={() => toggleField(f.id)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    {f.label}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">
                            {activeFields.length} campo(s) seleccionado(s).
                        </p>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <p className="text-xs text-amber-800">
                            Exportar a Excel descargará un archivo .xlsx. Imprimir abrirá una
                            ventana con la tabla para que puedas imprimir desde el navegador.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={isExporting || sortedCarsToExport.length === 0}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="h-4 w-4" />
                            )}
                            Descargar Excel
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={isExporting || sortedCarsToExport.length === 0}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="h-4 w-4" />
                            )}
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
