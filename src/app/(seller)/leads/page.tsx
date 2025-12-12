"use client";

import { useState } from "react";

// 1. IMPORTAMOS NUESTRAS PIEZAS DE LEGO (Features)
import { useLeads, type LeadWithDetails } from "@/hooks/useLeads";
import { LeadsList } from "@/components/features/leads/LeadsList";
import { LeadDetailModal } from "@/components/features/leads/LeadDetailModal";

// 2. IMPORTAMOS UI GENÉRICA
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth"; // Solo para mostrar el email en el header

export default function LeadsPage() {
    // --- HOOKS & LÓGICA ---
    // Toda la lógica de carga, ordenamiento y Supabase vive ahora dentro de useLeads()
    const { 
        leads, 
        isLoading, 
        sortDescriptor, 
        setSortDescriptor, 
        reload 
    } = useLeads();
    
    // Obtenemos el usuario solo para el saludo del header
    const { profile } = useAuth();

    // --- ESTADO LOCAL DE LA PÁGINA (Solo UI) ---
    const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- HANDLERS ---
    const handleOpenModal = (lead: LeadWithDetails) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
        setIsModalOpen(false);
        // Recargamos los datos al cerrar por si editaste el resumen o agregaste interacciones
        reload(); 
    };

    // --- RENDER ---
    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            
            {/* 1. HEADER */}
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Tablero de Leads</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {profile ? `Bienvenido, ${profile.full_name}` : 'Gestión de prospectos'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm">Filtros</Button>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={reload} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                </div>
            </div>

            {/* 2. TABLA DE LEADS (Componente Puro) */}
            <LeadsList 
                leads={leads}
                isLoading={isLoading}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                onLeadSelect={handleOpenModal}
            />

            {/* 3. MODAL DE DETALLE (Componente Inteligente) */}
            {isModalOpen && selectedLead && (
                <LeadDetailModal 
                    lead={selectedLead} 
                    onClose={handleCloseModal} 
                />
            )}
        </div>
    );
}