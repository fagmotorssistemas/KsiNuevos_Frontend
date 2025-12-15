"use client";

import { useState } from "react";

// Features
import { useLeads, type LeadWithDetails } from "@/hooks/useLeads";
import { LeadsList } from "@/components/features/leads/LeadsList";
import { LeadDetailModal } from "@/components/features/leads/LeadDetailModal";
import { LeadsToolbar } from "@/components/features/leads/LeadsToolbar";

// UI
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth"; 

export default function LeadsPage() {
    // Hooks & Lógica
    const { 
        leads,            // Solo los 10 de la página actual
        totalCount,       // Total real filtrado (ej: 50)
        isLoading, 
        sortDescriptor, 
        setSortDescriptor, 
        filters, 
        updateFilter, 
        resetFilters, 
        reload,
        // Paginación
        page,
        setPage,
        rowsPerPage
    } = useLeads();
    
    const { profile } = useAuth();

    // Estado Local UI
    const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Handlers
    const handleOpenModal = (lead: LeadWithDetails) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
        setIsModalOpen(false);
        reload(); 
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            
            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900">Tablero de Leads</h1>
                    <p className="text-md text-slate-500 mt-1">
                        {profile ? `Hola, ${profile.full_name}` : 'Gestión de prospectos'}
                        <span className="ml-1 text-slate-400">• {totalCount} leads totales</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={reload} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Actualizando...' : 'Actualizar Datos'}
                    </Button>
                </div>
            </div>

            {/* 2. BARRA DE HERRAMIENTAS */}
            <LeadsToolbar 
                filters={filters}
                onFilterChange={updateFilter}
                onReset={resetFilters}
                totalResults={totalCount} // Usamos totalCount aquí
            />

            {/* 3. TABLA DE LEADS */}
            <LeadsList 
                leads={leads}
                isLoading={isLoading}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                onLeadSelect={handleOpenModal}
                // Props de Paginación conectadas
                page={page}
                totalCount={totalCount}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                // PROP AGREGADA: Pasamos el rol para mostrar la columna de responsable
                currentUserRole={profile?.role}
            />

            {/* 4. MODAL DE DETALLE */}
            {isModalOpen && selectedLead && (
                <LeadDetailModal 
                    lead={selectedLead} 
                    onClose={handleCloseModal} 
                />
            )}
        </div>
    );
}