"use client";

import { useState } from "react";

// Features
import { useLeads, type LeadWithDetails } from "@/hooks/useLeads";
import { LeadsList } from "@/components/features/leads/LeadsList";
import { LeadDetailModal } from "@/components/features/leads/LeadDetailModal";
import { LeadsToolbar } from "@/components/features/leads/LeadsToolbar"; // <--- NUEVO IMPORT

// UI
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth"; 

export default function LeadsPage() {
    // Hooks & Lógica
    // Ahora extraemos también los filtros y sus funciones de control
    const { 
        leads,            // Estos leads YA vienen filtrados
        rawCount,         // Total real (opcional, para stats)
        isLoading, 
        sortDescriptor, 
        setSortDescriptor, 
        filters,          // Estado de filtros
        updateFilter,     // Función para cambiar un filtro
        resetFilters,     // Función para limpiar
        reload 
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

            {/* 2. BARRA DE HERRAMIENTAS (Filtros y Buscador) */}
            <LeadsToolbar 
                filters={filters}
                onFilterChange={updateFilter}
                onReset={resetFilters}
                totalResults={leads.length}
            />

            {/* 3. TABLA DE LEADS */}
            <LeadsList 
                leads={leads}
                isLoading={isLoading}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                onLeadSelect={handleOpenModal}
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