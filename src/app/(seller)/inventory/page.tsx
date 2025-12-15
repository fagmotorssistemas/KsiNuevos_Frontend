"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useInventory, type InventoryCar } from "@/hooks/useInventory";
import { InventoryToolbar } from "@/components/features/inventory/InventoryToolbar";
import { InventoryTable } from "@/components/features/inventory/InventoryTable";
import { InventoryDetailModal } from "@/components/features/inventory/InventoryDetailModal";
import { InventoryCreateModal } from "@/components/features/inventory/InventoryCreateModal";
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth";

export default function InventoryPage() {
    const { profile } = useAuth();
    const { 
        cars, 
        isLoading, 
        totalCount, // Usamos totalCount que viene del hook
        page,       // <--- Paginación: Página actual
        setPage,    // <--- Paginación: Función para cambiar página
        rowsPerPage,// <--- Paginación: Límite por página (10)
        filters,
        sortBy,
        updateFilter,
        setSortBy,
        resetFilters,
        reload 
    } = useInventory();

    // Estados de Modales
    const [selectedCar, setSelectedCar] = useState<InventoryCar | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Handlers Edición
    const handleEditCar = (car: InventoryCar) => {
        setSelectedCar(car);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setSelectedCar(null);
        setIsDetailModalOpen(false);
    };

    const handleUpdateSuccess = () => {
        reload();
        // Opcional: Cerrar modal si se desea
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

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Inventario de Vehículos</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestión total de la flota ({totalCount} vehículos).
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="gap-2"
                        onClick={handleOpenCreateModal}
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Vehículo
                    </Button>
                </div>
            </div>

            {/* Barra de Herramientas */}
            <InventoryToolbar 
                filters={filters}
                sortBy={sortBy}
                onFilterChange={updateFilter}
                onSortChange={setSortBy}
                onReset={resetFilters}
                resultsCount={totalCount} // Usamos totalCount aquí también
            />

            {/* VISTA DE TABLA */}
            {isLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 flex justify-center items-center">
                    <span className="text-slate-400 animate-pulse">Cargando inventario...</span>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    <InventoryTable 
                        cars={cars}
                        onEdit={handleEditCar}
                        // --- PROPS DE PAGINACIÓN AÑADIDAS ---
                        page={page}
                        totalCount={totalCount}   // El total real (ej: 60)
                        rowsPerPage={rowsPerPage} // El límite (ej: 10)
                        onPageChange={setPage}    // Función para cambiar página
                    />
                </div>
            )}

            {/* MODAL DE EDICIÓN */}
            {isDetailModalOpen && selectedCar && (
                <InventoryDetailModal 
                    car={selectedCar}
                    onClose={handleCloseDetailModal}
                    onUpdate={handleUpdateSuccess}
                />
            )}

            {/* MODAL DE CREACIÓN */}
            {isCreateModalOpen && (
                <InventoryCreateModal 
                    onClose={handleCloseCreateModal}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </div>
    );
}