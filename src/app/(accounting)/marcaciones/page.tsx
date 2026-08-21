"use client";

import { useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { useMarcacionesData } from "@/hooks/accounting/useMarcaciones";
import { MarcacionesKpiStats } from "@/components/features/accounting/marcaciones/MarcacionesKpiStats";
import { MarcacionesUsersList } from "@/components/features/accounting/marcaciones/MarcacionesUsersList";
import { MarcacionesRange } from "@/types/marcaciones.types";

export default function MarcacionesPage() {
    const [desdeInput, setDesdeInput] = useState("");
    const [hastaInput, setHastaInput] = useState("");
    const [range, setRange] = useState<MarcacionesRange>({});
    const { data, loading, error, refresh } = useMarcacionesData(range);

    const consultarRango = () => {
        setRange({
            desde: desdeInput || undefined,
            hasta: hastaInput || undefined,
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Marcaciones
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        Asistencia agrupada por persona y por día
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                        Desde
                        <input
                            type="date"
                            value={desdeInput}
                            onChange={(e) => setDesdeInput(e.target.value)}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                        Hasta
                        <input
                            type="date"
                            value={hastaInput}
                            onChange={(e) => setHastaInput(e.target.value)}
                            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={consultarRango}
                        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Consultar
                    </button>
                    <button
                        type="button"
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MarcacionesKpiStats data={data ? data.resumen : null} loading={loading} />

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {error ? (
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium text-red-600">{error}</p>
                            <button
                                type="button"
                                onClick={refresh}
                                className="mt-3 text-sm text-slate-600 hover:text-slate-900 underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"
                                ></div>
                            ))}
                        </div>
                    ) : (
                        <MarcacionesUsersList usuarios={data?.usuarios || []} />
                    )}
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    Datos del reloj biométrico a través del backend de cartera.
                    <br />
                    Sin rango, el backend usa julio 2026 hasta hoy.
                </p>
            </div>
        </div>
    );
}
