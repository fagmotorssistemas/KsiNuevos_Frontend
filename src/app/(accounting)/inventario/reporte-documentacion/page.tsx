"use client";

import { useState, useMemo } from "react";
import { RefreshCw, FileCheck2 } from "lucide-react";
import { useInventarioData } from "@/hooks/accounting/useInventarioData";
import { InventarioDocumentReport } from "@/components/features/inventario/InventarioDocumentReportsModal";
import { VehicleDetailModal, type VehicleDetailTab } from "@/components/features/inventario/VehicleDetailModal";
import type { VehiculoInventario } from "@/types/inventario.types";

export default function ReporteDocumentacionPage() {
    const { data, loading, refresh } = useInventarioData();
    const [detailVehicle, setDetailVehicle] = useState<VehiculoInventario | null>(null);
    const [detailInitialTab, setDetailInitialTab] = useState<VehicleDetailTab>("documentos");
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
                        Mismas columnas que la pestaña Documentos del detalle del vehículo
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        refresh();
                        setChecklistReloadKey((k) => k + 1);
                    }}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors self-start"
                    title="Actualizar datos"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            <InventarioDocumentReport
                vehiculos={vehiculos}
                reloadKey={checklistReloadKey}
                onOpenVehicle={(v, tab) => {
                    setDetailInitialTab(tab ?? "documentos");
                    setDetailVehicle(v);
                }}
            />

            {detailVehicle && (
                <VehicleDetailModal
                    key={detailVehicle.placa}
                    vehiculo={detailVehicle}
                    initialTab={detailInitialTab}
                    onLegalChange={() => setChecklistReloadKey((k) => k + 1)}
                    onClose={() => {
                        setDetailVehicle(null);
                        setChecklistReloadKey((k) => k + 1);
                    }}
                />
            )}
        </div>
    );
}
