"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, LayoutGrid, Package, FileSpreadsheet } from "lucide-react";

import { useInventory, type InventoryCar } from "@/hooks/useInventory";
import { InventoryVehicleReport } from "@/components/features/inventory/InventoryVehicleReportsModal";
import { InventoryDetailModal } from "@/components/features/inventory/InventoryDetailModal";
import { InventoryExportPrintModal } from "@/components/features/inventory/InventoryExportPrintModal";
import { useAuth } from "@/hooks/useAuth";

export default function ReportesVehicularesPage() {
    const { profile, isAdminLike } = useAuth();
    const ventasRole = isAdminLike ? "admin" : profile?.role;
    const { allCars, processedInventory, isLoading, reload, patchCar } = useInventory();
    const [selectedCar, setSelectedCar] = useState<InventoryCar | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);

    const handleEditCar = (car: InventoryCar) => {
        setSelectedCar(car);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setSelectedCar(null);
        setIsDetailModalOpen(false);
    };

    const handleUpdateSuccess = async (patch: Partial<InventoryCar>) => {
        if (selectedCar) {
            patchCar(selectedCar.id, patch);
            setSelectedCar((prev) => (prev ? { ...prev, ...patch } : null));
        }
        await reload({ silent: true });
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Reportes Vehiculares
                        {isLoading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-red-500" />
                        Checklist de publicación — disponibles y vendidos
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                        <Link
                            href="/inventory"
                            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                            <Package className="h-4 w-4 text-slate-500" />
                            Inventario
                        </Link>
                        <span className="h-6 w-px bg-slate-200" aria-hidden />
                        <button
                            type="button"
                            onClick={() => setIsExportPrintModalOpen(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Exportar
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => void reload()}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <InventoryVehicleReport
                cars={allCars}
                onEdit={handleEditCar}
                onReload={() => void reload()}
                currentUserRole={ventasRole}
            />

            {isDetailModalOpen && selectedCar && (
                <InventoryDetailModal
                    car={selectedCar}
                    onClose={handleCloseDetailModal}
                    onUpdate={handleUpdateSuccess}
                    currentUserRole={ventasRole}
                />
            )}
            <InventoryExportPrintModal
                isOpen={isExportPrintModalOpen}
                onClose={() => setIsExportPrintModalOpen(false)}
                allFilteredCars={processedInventory}
                fullInventory={allCars}
            />
        </div>
    );
}
