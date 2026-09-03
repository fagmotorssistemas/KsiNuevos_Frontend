"use client";

import { useState } from "react";
import { CalendarClock, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import {
    getCurrentMonthValue,
    useMarcacionesMes,
} from "@/hooks/accounting/useMarcaciones";
import { MarcacionMonthPicker } from "@/components/features/accounting/marcaciones/MarcacionMonthPicker";
import { MarcacionesMesList } from "@/components/features/accounting/marcaciones/MarcacionesMesList";
import { MarcacionesSectionNav } from "@/components/features/accounting/marcaciones/MarcacionesSectionNav";
import {
    buildMarcacionesMesResumen,
    exportMarcacionesMesExcel,
    exportMarcacionesMesPdf,
} from "@/components/features/accounting/marcaciones/marcaciones-mes-export";

export default function MarcacionesMesPage() {
    const currentMonthValue = getCurrentMonthValue();
    const [monthInput, setMonthInput] = useState(currentMonthValue);
    const { data, loading, error, refresh } = useMarcacionesMes(monthInput);
    const canExport = Boolean(data?.empleados.length) && !loading;

    const exportar = (tipo: "excel" | "pdf") => {
        if (!data) return;
        const { rows, pie } = buildMarcacionesMesResumen(data);
        if (tipo === "excel") exportMarcacionesMesExcel(data.mes, rows, pie);
        else exportMarcacionesMesPdf(data.mes, rows, pie);
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-4">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                    Informe del mes
                    {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
                    Resumen del mes por persona: hechas, legales, extra y de menos.
                </p>
            </div>

            <MarcacionesSectionNav />

            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Periodo
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="w-full sm:w-72">
                                <MarcacionMonthPicker
                                    value={monthInput}
                                    onChange={(next) => setMonthInput(next || currentMonthValue)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={refresh}
                                disabled={loading}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : "text-slate-500"}`} />
                                Actualizar
                            </button>
                        </div>
                    </div>

                    <div className="hidden h-12 w-px bg-slate-200 lg:block" />

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Exportar
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => exportar("excel")}
                                disabled={!canExport}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-emerald-50 hover:border-emerald-200 disabled:opacity-50"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                Excel
                            </button>
                            <button
                                type="button"
                                onClick={() => exportar("pdf")}
                                disabled={!canExport}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-red-50 hover:border-red-200 disabled:opacity-50"
                            >
                                <FileText className="h-4 w-4 text-red-600" />
                                PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="duration-700 animate-in fade-in slide-in-from-bottom-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {error ? (
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium text-red-600">{error}</p>
                            <button
                                type="button"
                                onClick={refresh}
                                className="mt-3 text-sm text-slate-600 underline hover:text-slate-900"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500">
                                Cargando informe. La primera vez puede tardar hasta un minuto.
                            </p>
                            <div className="mb-6 h-8 w-1/4 animate-pulse rounded bg-slate-100"></div>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="h-16 animate-pulse rounded-lg border border-slate-100 bg-slate-50"
                                ></div>
                            ))}
                        </div>
                    ) : data ? (
                        <MarcacionesMesList data={data} />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
