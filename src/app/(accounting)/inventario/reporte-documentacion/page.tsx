"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { RefreshCw, FileCheck2, Box } from "lucide-react";
import { useInventarioData } from "@/hooks/accounting/useInventarioData";
import { InventarioDocumentReport } from "@/components/features/inventario/InventarioDocumentReportsModal";
import { VehicleDetailModal, type VehicleDetailTab } from "@/components/features/inventario/VehicleDetailModal";
import type { VehiculoInventario } from "@/types/inventario.types";

export default function ReporteDocumentacionPage({
    params,
    searchParams,
}: {
    params: Promise<Record<string, string | string[] | undefined>>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    use(params)
    use(searchParams)
    const { data, loading, refresh } = useInventarioData();
    const [detailVehicle, setDetailVehicle] = useState<VehiculoInventario | null>(null);
    const [detailInitialTab, setDetailInitialTab] = useState<VehicleDetailTab>("documentos");
    const [detailOpenUpload, setDetailOpenUpload] = useState(false);
    const [checklistReloadKey, setChecklistReloadKey] = useState(0);

    const vehiculos = useMemo(() => data?.listado ?? [], [data?.listado]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Reporte de Documentación
                        {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <FileCheck2 className="h-3.5 w-3.5 text-blue-500" />
                        Mismas fuentes de datos que la pestaña Documentos; el detalle se abre en la fila
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                        <Link
                            href="/inventario"
                            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                            <Box className="h-4 w-4 text-slate-500" />
                            Inventario
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            refresh();
                            setChecklistReloadKey((k) => k + 1);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <InventarioDocumentReport
                vehiculos={vehiculos}
                reloadKey={checklistReloadKey}
                onOpenVehicle={(v, tab, options) => {
                    setDetailInitialTab(tab ?? "documentos");
                    setDetailOpenUpload(Boolean(options?.openUpload));
                    setDetailVehicle(v);
                }}
            />

            {detailVehicle && (
                <VehicleDetailModal
                    key={`${detailVehicle.placa}-${detailOpenUpload ? "upload" : "view"}`}
                    vehiculo={detailVehicle}
                    initialTab={detailInitialTab}
                    autoOpenUploadWizard={detailOpenUpload}
                    onLegalChange={() => setChecklistReloadKey((k) => k + 1)}
                    onClose={() => {
                        setDetailVehicle(null);
                        setDetailOpenUpload(false);
                        setChecklistReloadKey((k) => k + 1);
                    }}
                />
            )}
        </div>
    );
}
