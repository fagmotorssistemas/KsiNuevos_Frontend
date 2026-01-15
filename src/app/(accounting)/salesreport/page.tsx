"use client";

import { RefreshCw, LayoutGrid } from "lucide-react";
import { useVentasData } from "@/hooks/accounting/useVentasData";
import { VentasKpiStats } from "@/components/features/accounting/salesreport/VentasKpiStats";
import { VentasTable } from "@/components/features/accounting/salesreport/VentasTable";

export default function VentasPage() {
    const { data, loading, refresh } = useVentasData();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Reporte Comercial Vehículos
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
                        Seguimiento de entregas, stock y rendimiento de agentes
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={refresh}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                    >
                        Actualizar Reporte
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* 1. Dashboard de Métricas */}
                <VentasKpiStats
                    data={data ? data.resumen : null}
                    loading={loading}
                />

                {/* 2. Listado Detallado */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-8 bg-slate-100 rounded w-1/4 animate-pulse mb-6"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                            ))}
                        </div>
                    ) : (
                        <VentasTable ventas={data?.listado || []} />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    Fuente: DATA_USR.REPORTE_VENTAS_VEHICULOS
                    <br />
                    Los datos representan facturación cerrada y vehículos entregados.
                </p>
            </div>
        </div>
    );
}