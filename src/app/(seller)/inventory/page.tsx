"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileSpreadsheet, ClipboardList, LayoutGrid } from "lucide-react";

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
import { useAuth } from "@/hooks/useAuth";

export default function InventoryPage() {
    const { profile, isAdminLike } = useAuth();
    const ventasRole = isAdminLike ? "admin" : profile?.role;
    
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
            setSelectedCar({ ...selectedCar, ...patch });
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

                <div className="flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                    <Link
                        href="/inventory/reportes-vehiculares"
                        className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                        <LayoutGrid className="h-4 w-4 text-red-500" />
                        Reportes
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
                        currentUserRole={ventasRole}
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
                    currentUserRole={ventasRole}
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