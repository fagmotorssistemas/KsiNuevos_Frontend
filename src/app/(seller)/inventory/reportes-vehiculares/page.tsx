"use client";

import { useState } from "react";
import { RefreshCw, LayoutGrid } from "lucide-react";

import { useInventory, type InventoryCar } from "@/hooks/useInventory";
import { InventoryVehicleReport } from "@/components/features/inventory/InventoryVehicleReportsModal";
import { InventoryDetailModal } from "@/components/features/inventory/InventoryDetailModal";
import { useAuth } from "@/hooks/useAuth";

export default function ReportesVehicularesPage() {
    const { profile } = useAuth();
    const { allCars, isLoading, reload, patchCar } = useInventory();
    const [selectedCar, setSelectedCar] = useState<InventoryCar | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
                <button
                    type="button"
                    onClick={() => void reload()}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-start"
                    title="Actualizar datos"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            <InventoryVehicleReport
                cars={allCars}
                onEdit={handleEditCar}
                onReload={() => void reload()}
                currentUserRole={profile?.role}
            />

            {isDetailModalOpen && selectedCar && (
                <InventoryDetailModal
                    car={selectedCar}
                    onClose={handleCloseDetailModal}
                    onUpdate={handleUpdateSuccess}
                    currentUserRole={profile?.role}
                />
            )}
        </div>
    );
}
