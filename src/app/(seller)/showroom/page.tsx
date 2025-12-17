"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
// Asegúrate de importar el hook desde donde lo creaste
import { useShowroom } from "@/hooks/useShowroom"; 
import ShowroomToolbar from "../../../components/features/showroom/ShowroomToolbar";
import ShowroomCard from "../../../components/features/showroom/ShowroomCard";
import VisitFormModal from "../../../components/features/showroom/VisitFormModal";

// Subcomponente Header simple
const Header = ({ onNew }: { onNew: () => void }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-slate-700" />
                Showroom & Tráfico
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestión de visitas, walk-ins y actividad diaria de vendedores.</p>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-95">
            <Plus className="h-4 w-4" /> Registrar Visita
        </button>
    </div>
);

export default function ShowroomPage() {
    // 1. Usamos el Hook para traer toda la lógica y datos
    const { 
        visits, 
        salespersons, 
        isLoading, 
        userRole, 
        filters, 
        setSearchTerm, 
        setDateFilter, 
        setSelectedSalesperson,
        reload 
    } = useShowroom();

    // Estado local solo para UI (Modales, etc)
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Header onNew={() => setIsModalOpen(true)} />

            {/* 2. El Toolbar recibe los datos y setters del hook directamente */}
            <ShowroomToolbar 
                searchTerm={filters.search}
                onSearchChange={setSearchTerm}
                dateFilter={filters.date}
                onDateFilterChange={setDateFilter}
                // Aquí pasamos el rol real que viene de la base de datos
                currentUserRole={userRole}
                salespersons={salespersons}
                selectedSalesperson={filters.salesperson}
                onSalespersonChange={setSelectedSalesperson}
            />

            {isLoading ? (
                <div className="py-20 flex justify-center text-slate-400">Cargando actividad...</div>
            ) : visits.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">No hay visitas registradas con estos filtros.</p>
                    <button onClick={() => setDateFilter('all')} className="text-sm text-blue-600 hover:underline mt-2">Ver todo el historial</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visits.map(visit => (
                        <ShowroomCard key={visit.id} visit={visit} />
                    ))}
                </div>
            )}

            <VisitFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={reload} // Usamos reload del hook para refrescar tras crear
            />
        </div>
    );
}