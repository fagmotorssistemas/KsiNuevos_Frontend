"use client";

import { useMemo } from "react";
import { GitCompare, RefreshCw } from "lucide-react";
import { useVentasData } from "@/hooks/accounting/useVentasData";
import { SalesComparisonView } from "@/components/features/accounting/salesreport/SalesComparisonView";
import { setSidebarShell } from "@/lib/sidebar-shell";

export default function SalesComparePage() {
    if (typeof window !== "undefined") {
        setSidebarShell("seller");
    }

    const { data, loading, refresh } = useVentasData();

    const brands = useMemo(() => {
        if (!data?.listado) return [];
        return Array.from(new Set(data.listado.map((venta) => venta.marca).filter(Boolean))).sort();
    }, [data]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-700">
                        <GitCompare className="h-3.5 w-3.5" />
                        Ventas
                    </div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        Comparativa de ventas
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin text-slate-400" /> : null}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Unidades entregadas, mes contra mes. Los meses cerrados salen completos; el actual se actualiza cada día.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refresh}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Actualizar
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <SalesComparisonView
                    ventas={data?.listado ?? []}
                    loading={loading}
                    brands={brands}
                />
            </div>
        </div>
    );
}
