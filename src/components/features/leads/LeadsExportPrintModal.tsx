"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
    Calendar,
    CalendarDays,
    CalendarRange,
    FileSpreadsheet,
    Loader2,
    Printer,
    Sun,
    X,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLeadsAPI } from "@/services/leads.service";
import type { DateFilter, LeadWithDetails, LeadsFilters } from "@/types/leads.types";

export type LeadsExportDateMode =
    | "today"
    | "exactDate"
    | "thisMonth"
    | "7days"
    | "15days";

const DATE_MODE_OPTIONS: {
    value: LeadsExportDateMode;
    label: string;
    hint: string;
    icon: ComponentType<{ className?: string }>;
}[] = [
    { value: "today", label: "Hoy", hint: "Ingresos de hoy", icon: Sun },
    { value: "7days", label: "7 días", hint: "Última semana", icon: CalendarRange },
    { value: "15days", label: "15 días", hint: "Última quincena", icon: CalendarDays },
    { value: "thisMonth", label: "Este mes", hint: "Mes en curso", icon: Calendar },
    { value: "exactDate", label: "Fecha exacta", hint: "Elegir un día", icon: CalendarDays },
];

const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_PAGES = 100;

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getEcuadorDateISO(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

function formatInterest(lead: LeadWithDetails): string {
    const car = lead.interested_cars?.[0];
    if (!car) return "";
    return [car.brand, car.model, car.year].filter(Boolean).join(" ").trim();
}

function formatTemperature(lead: LeadWithDetails): string {
    return String(lead.month_temperature ?? lead.temperature ?? "").trim();
}

function buildExportFilters(
    baseFilters: LeadsFilters,
    dateMode: LeadsExportDateMode,
    exactDate: string
): LeadsFilters {
    if (dateMode === "exactDate") {
        return {
            ...baseFilters,
            exactDate,
            dateRange: "all",
            onlyInteractions: false,
        };
    }
    return {
        ...baseFilters,
        exactDate: "",
        dateRange: dateMode as DateFilter,
        onlyInteractions: false,
    };
}

function dateRangeLabel(dateMode: LeadsExportDateMode, exactDate: string): string {
    if (dateMode === "exactDate") return exactDate || "fecha exacta";
    if (dateMode === "today") return "hoy";
    if (dateMode === "thisMonth") return "este mes";
    if (dateMode === "7days") return "últimos 7 días";
    return "últimos 15 días";
}

async function fetchAllLeadsForExport(
    supabase: SupabaseClient,
    filters: LeadsFilters
): Promise<LeadWithDetails[]> {
    const all: LeadWithDetails[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    let cachedTotal: number | undefined;
    let cachedResponded: number | undefined;

    while (all.length < total && page <= EXPORT_MAX_PAGES) {
        const result = await fetchLeadsAPI(supabase, page, EXPORT_PAGE_SIZE, filters, {
            cachedTotal: page > 1 ? cachedTotal : undefined,
            cachedResponded: page > 1 ? cachedResponded : undefined,
        });

        if (page === 1) {
            cachedTotal = result.count;
            cachedResponded = result.respondedCount;
            total = result.count;
        }

        all.push(...result.data);
        if (result.data.length === 0) break;
        page += 1;
    }

    return all;
}

type ExportColumn = {
    key: "cliente" | "telefono" | "interes" | "resumen" | "temp" | "responsable";
    label: string;
    getValue: (lead: LeadWithDetails) => string;
};

interface LeadsExportPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    supabase: SupabaseClient;
    /** Filtros actuales del tablero (estado, vendedor, búsqueda…). La fecha la elige el modal. */
    baseFilters: LeadsFilters;
    /** Solo admin ve / exporta la columna Responsable. */
    isAdmin: boolean;
}

export function LeadsExportPrintModal({
    isOpen,
    onClose,
    supabase,
    baseFilters,
    isAdmin,
}: LeadsExportPrintModalProps) {
    const [dateMode, setDateMode] = useState<LeadsExportDateMode>("today");
    const [exactDate, setExactDate] = useState(getEcuadorDateISO);
    const [isWorking, setIsWorking] = useState(false);
    const [progressLabel, setProgressLabel] = useState<string | null>(null);

    const columns = useMemo<ExportColumn[]>(() => {
        const cols: ExportColumn[] = [
            {
                key: "cliente",
                label: "Cliente",
                getValue: (lead) => lead.name?.trim() || "",
            },
            {
                key: "telefono",
                label: "Teléfono",
                getValue: (lead) => lead.phone?.trim() || "",
            },
            {
                key: "interes",
                label: "Interés",
                getValue: formatInterest,
            },
            {
                key: "resumen",
                label: "Resumen",
                getValue: (lead) => lead.resume?.trim() || "",
            },
            {
                key: "temp",
                label: "Temp",
                getValue: formatTemperature,
            },
        ];

        if (isAdmin) {
            cols.push({
                key: "responsable",
                label: "Responsable",
                getValue: (lead) => lead.profiles?.full_name?.trim() || "Sin asignar",
            });
        }

        return cols;
    }, [isAdmin]);

    const canSubmit = dateMode !== "exactDate" || Boolean(exactDate);

    const loadRows = async (): Promise<LeadWithDetails[] | null> => {
        if (!canSubmit) {
            alert("Selecciona una fecha exacta.");
            return null;
        }

        const filters = buildExportFilters(baseFilters, dateMode, exactDate);
        setProgressLabel("Cargando leads…");
        const rows = await fetchAllLeadsForExport(supabase, filters);
        if (rows.length === 0) {
            alert("No hay leads en el rango seleccionado.");
            return null;
        }
        return rows;
    };

    const handleExportExcel = async () => {
        setIsWorking(true);
        try {
            const rows = await loadRows();
            if (!rows) return;

            setProgressLabel("Generando Excel…");
            const sheetRows = rows.map((lead) => {
                const row: Record<string, string> = {};
                for (const col of columns) {
                    row[col.label] = col.getValue(lead);
                }
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(sheetRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
            worksheet["!cols"] = columns.map((col) => ({
                wch: col.key === "resumen" ? 40 : col.key === "interes" ? 28 : 18,
            }));

            const stamp = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(workbook, `Leads_${stamp}.xlsx`);
            onClose();
        } catch (e) {
            console.error("Error exportando leads a Excel", e);
            alert("No se pudo generar el Excel.");
        } finally {
            setIsWorking(false);
            setProgressLabel(null);
        }
    };

    const handlePrint = async () => {
        setIsWorking(true);
        try {
            const rows = await loadRows();
            if (!rows) return;

            setProgressLabel("Preparando impresión…");
            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                alert("Permite ventanas emergentes para imprimir.");
                return;
            }

            const rangeText = dateRangeLabel(dateMode, exactDate);
            const headers = columns.map((c) => c.label).join("</th><th>");
            const rowsHtml = rows
                .map(
                    (lead) =>
                        "<tr>" +
                        columns
                            .map((col) => {
                                const text = col.getValue(lead) || "—";
                                return `<td>${escapeHtml(text)}</td>`;
                            })
                            .join("") +
                        "</tr>"
                )
                .join("");

            printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Leads - ${escapeHtml(rangeText)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; color: #1e293b; }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    p { margin-bottom: 12px; color: #64748b; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    td:nth-child(4) { max-width: 280px; word-break: break-word; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Tablero de leads</h1>
  <p>${rows.length} lead(s) · ${escapeHtml(rangeText)} · ${new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}</p>
  <table>
    <thead><tr><th>${headers}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 300);
            onClose();
        } catch (e) {
            console.error("Error imprimiendo leads", e);
            alert("No se pudo abrir la ventana de impresión.");
        } finally {
            setIsWorking(false);
            setProgressLabel(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        Exportar o imprimir leads
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isWorking}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            Rango de tiempo (ingresos)
                        </label>
                        <div
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                            role="radiogroup"
                            aria-label="Rango de tiempo"
                        >
                            {DATE_MODE_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const selected = dateMode === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        disabled={isWorking}
                                        onClick={() => setDateMode(opt.value)}
                                        className={`
                                            group relative flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-all
                                            focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            ${
                                                selected
                                                    ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/15"
                                                    : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                                            }
                                            ${opt.value === "exactDate" ? "sm:col-span-1 col-span-2" : ""}
                                        `}
                                    >
                                        <span
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                                                selected
                                                    ? "bg-white/15 text-white"
                                                    : "bg-white text-slate-500 border border-slate-200 group-hover:text-slate-700"
                                            }`}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="text-sm font-semibold leading-tight">
                                            {opt.label}
                                        </span>
                                        <span
                                            className={`text-[11px] leading-tight ${
                                                selected ? "text-slate-300" : "text-slate-500"
                                            }`}
                                        >
                                            {opt.hint}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {dateMode === "exactDate" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-sm font-medium text-slate-700">
                                Elige el día
                            </label>
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    value={exactDate}
                                    disabled={isWorking}
                                    onChange={(e) => setExactDate(e.target.value)}
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-sm font-medium text-slate-700 shadow-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 space-y-1">
                        <p>
                            Columnas: Cliente, Teléfono, Interés, Resumen, Temp
                            {isAdmin ? ", Responsable" : ""}.
                        </p>
                        <p>
                            Respeta filtros actuales del tablero (estado, búsqueda
                            {isAdmin ? ", vendedor" : ""}) y el alcance de tu usuario.
                        </p>
                    </div>

                    {progressLabel && (
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {progressLabel}
                        </p>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        disabled={isWorking || !canSubmit}
                        onClick={handleExportExcel}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isWorking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="h-4 w-4" />
                        )}
                        Excel
                    </button>
                    <button
                        type="button"
                        disabled={isWorking || !canSubmit}
                        onClick={handlePrint}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isWorking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Printer className="h-4 w-4" />
                        )}
                        Imprimir / PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
