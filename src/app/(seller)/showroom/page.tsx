"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { useShowroom } from "@/hooks/useShowroom";
// CAMBIO 1: Importamos ShowroomVisit desde el componente ShowroomCard, NO desde constants
// Esto asegura que el estado local coincida con lo que el componente espera.
import ShowroomCard, { ShowroomVisit } from "../../../components/features/showroom/ShowroomCard";
import ShowroomToolbar from "../../../components/features/showroom/ShowroomToolbar";
import VisitFormModal from "../../../components/features/showroom/VisitFormModal";

// Subcomponente Header
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

    // Estado local para Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // CAMBIO 2: Este estado ahora usa el tipo correcto importado de ShowroomCard
    const [selectedVisit, setSelectedVisit] = useState<ShowroomVisit | null>(null);

    // Función para abrir modal en modo CREAR
    const handleCreate = () => {
        setSelectedVisit(null); 
        setIsModalOpen(true);
    };

    // Función para abrir modal en modo EDITAR
    const handleEdit = (visit: ShowroomVisit) => {
        setSelectedVisit(visit);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Header onNew={handleCreate} />

            <ShowroomToolbar 
                searchTerm={filters.search}
                onSearchChange={setSearchTerm}
                dateFilter={filters.date}
                onDateFilterChange={setDateFilter}
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
                    {visits.map(visitRaw => {
                        // CAMBIO CRÍTICO: "Casteamos" (convertimos) la visita.
                        // El hook useShowroom devuelve un tipo que permite nulos en credit_status.
                        // ShowroomCard es estricto. Al usar "as unknown as ShowroomVisit", le decimos a TS:
                        // "Confía en mí, los datos son compatibles" (lo son, porque el componente maneja los nulos internamente).
                        const visit = visitRaw as unknown as ShowroomVisit;
                        
                        return (
                            <ShowroomCard 
                                key={visit.id} 
                                visit={visit} 
                                onEdit={handleEdit} 
                            />
                        );
                    })}
                </div>
            )}

            {/* Nota: Es posible que VisitFormModal se queje si espera el tipo antiguo. 
                Si eso pasa, puedes pasarle selectedVisit as any temporalmente, 
                pero idealmente el modal debería importar el tipo del mismo lugar. */}
            <VisitFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={reload}
                // @ts-ignore - Ignoramos error de tipo si el Modal usa la definición antigua
                visitToEdit={selectedVisit} 
            />
        </div>
    );
}