"use client";

import Link from "next/link";
import { RefreshCw, Search, Users } from "lucide-react";
import { MarcacionMonthPicker } from "@/components/features/accounting/marcaciones/MarcacionMonthPicker";

const controlClass =
    "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100";

interface MarcacionesToolbarProps {
    monthInput: string;
    currentMonthValue: string;
    desdeInput: string;
    hastaInput: string;
    loading: boolean;
    onMonthChange: (yearMonth: string) => void;
    onDesdeChange: (value: string) => void;
    onHastaChange: (value: string) => void;
    onConsultar: () => void;
    onMesActual: () => void;
    onRefresh: () => void;
}

export function MarcacionesToolbar({
    monthInput,
    currentMonthValue,
    desdeInput,
    hastaInput,
    loading,
    onMonthChange,
    onDesdeChange,
    onHastaChange,
    onConsultar,
    onMesActual,
    onRefresh,
}: MarcacionesToolbarProps) {
    const isCurrentMonth = monthInput === currentMonthValue;

    return (
        <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <Link
                        href="/employee"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                        <Users className="h-4 w-4 text-slate-500" />
                        Personal
                    </Link>
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : "text-slate-500"}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(16rem,1fr)_auto_minmax(0,1.4fr)] xl:items-end">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Consultar por mes
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <MarcacionMonthPicker value={monthInput} onChange={onMonthChange} />
                            <button
                                type="button"
                                onClick={onMesActual}
                                disabled={isCurrentMonth}
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-50"
                            >
                                Mes actual
                            </button>
                        </div>
                    </div>

                    <div className="hidden h-10 w-px bg-slate-200 xl:block" />

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Rango puntual
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className="min-w-0 flex-1">
                                <span className="sr-only">Desde</span>
                                <input
                                    type="date"
                                    value={desdeInput}
                                    onChange={(e) => onDesdeChange(e.target.value)}
                                    className={controlClass}
                                />
                            </label>
                            <label className="min-w-0 flex-1">
                                <span className="sr-only">Hasta</span>
                                <input
                                    type="date"
                                    value={hastaInput}
                                    onChange={(e) => onHastaChange(e.target.value)}
                                    className={controlClass}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={onConsultar}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
                            >
                                <Search className="h-4 w-4" />
                                Consultar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
