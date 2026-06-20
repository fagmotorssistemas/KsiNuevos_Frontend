"use client";

import { useState, useMemo } from "react";
import { FileSpreadsheet, ClipboardList } from "lucide-react";

import { useInventory, type InventoryCar } from "@/hooks/useInventory";
import {
    InventoryKpiStats,
    type InventoryKpiFilter,
} from "@/components/features/inventory/InventoryKpiStats";
import { InventoryToolbar } from "@/components/features/inventory/InventoryToolbar";
import { InventoryTable } from "@/components/features/inventory/InventoryTable";
import { InventoryDetailModal } from "@/components/features/inventory/InventoryDetailModal";
import { InventoryCreateModal } from "@/components/features/inventory/InventoryCreateModal";
import { InventoryExportPrintModal } from "@/components/features/inventory/InventoryExportPrintModal";
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth";

export default function InventoryPage() {
    const { profile } = useAuth();
    
    const { 
        cars, 
        isLoading, 
        totalCount,
        processedInventory,
        allCars,
        page,
        setPage,
        rowsPerPage,
        filters,
        sortBy,
        updateFilter,
        setSortBy,
        resetFilters,
        reload,
        patchCar,
    } = useInventory();

    // Estados de Modales
    const [selectedCar, setSelectedCar] = useState<InventoryCar | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isExportPrintModalOpen, setIsExportPrintModalOpen] = useState(false);

    // Handlers Edición
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

    // Handlers Creación
    const handleOpenCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
    };

    const handleCreateSuccess = () => {
        reload(); // Recargar la lista para ver el nuevo auto
    };

    const kpiSummary = useMemo(
        () => ({
            totalVehiculosRegistrados: allCars.length,
            totalActivos: allCars.filter((c) => c.status === "disponible").length,
            totalBaja: allCars.filter((c) => c.status === "vendido").length,
        }),
        [allCars]
    );

    const activeKpiFilter: InventoryKpiFilter =
        filters.status === "disponible"
            ? "active"
            : filters.status === "vendido"
              ? "baja"
              : "all";

    const handleKpiFilterChange = (filter: InventoryKpiFilter) => {
        if (filter === "active") updateFilter("status", "disponible");
        else if (filter === "baja") updateFilter("status", "vendido");
        else updateFilter("status", "all");
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Inventario de Vehículos
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                        Gestión total de la flota ({allCars.length} vehículos).
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="primary"
                        size="sm"
                        className="gap-2"
                        onClick={() => setIsExportPrintModalOpen(true)}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Exportar / Imprimir
                    </Button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                <InventoryKpiStats
                    data={kpiSummary}
                    loading={isLoading}
                    activeFilter={activeKpiFilter}
                    onFilterChange={handleKpiFilterChange}
                />

                <InventoryToolbar
                    filters={filters}
                    sortBy={sortBy}
                    onFilterChange={updateFilter}
                    onSortChange={setSortBy}
                    onReset={resetFilters}
                    resultsCount={totalCount}
                />

                {isLoading ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-10 flex justify-center items-center">
                        <span className="text-slate-400 animate-pulse">Cargando inventario...</span>
                    </div>
                ) : (
                    <InventoryTable
                        cars={cars}
                        onEdit={handleEditCar}
                        page={page}
                        totalCount={totalCount}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        currentUserRole={profile?.role}
                        currentUserId={profile?.id}
                    />
                )}
            </div>

            {/* MODAL DE EDICIÓN */}
            {isDetailModalOpen && selectedCar && (
                <InventoryDetailModal 
                    car={selectedCar}
                    onClose={handleCloseDetailModal}
                    onUpdate={handleUpdateSuccess}
                    currentUserRole={profile?.role}
                />
            )}

            {/* MODAL DE CREACIÓN */}
            {isCreateModalOpen && (
                <InventoryCreateModal 
                    onClose={handleCloseCreateModal}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* MODAL EXPORTAR / IMPRIMIR */}
            <InventoryExportPrintModal
                isOpen={isExportPrintModalOpen}
                onClose={() => setIsExportPrintModalOpen(false)}
                allFilteredCars={processedInventory}
                fullInventory={allCars}
            />
        </div>
    );
}