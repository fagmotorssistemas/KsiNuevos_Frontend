"use client";

import { useState } from "react";
import { Plus, Users, LayoutGrid, List } from "lucide-react";
import { useShowroom } from "@/hooks/useShowroom";
import ShowroomCard, { ShowroomVisit } from "../../../components/features/showroom/ShowroomCard";
// Importamos la nueva tabla
import { ShowroomTable } from "../../../components/features/showroom/ShowroomTable";
import ShowroomToolbar from "../../../components/features/showroom/ShowroomToolbar";
import VisitFormModal from "../../../components/features/showroom/VisitFormModal";

// Subcomponente Header con Toggle de Vista
const Header = ({ 
    onNew, 
    viewMode, 
    onViewChange 
}: { 
    onNew: () => void;
    viewMode: 'table' | 'grid';
    onViewChange: (mode: 'table' | 'grid') => void;
}) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-slate-700" />
                Showroom & Tráfico
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestión de visitas, walk-ins y actividad diaria de vendedores.</p>
        </div>

        <div className="flex items-center gap-3">
            {/* Toggle de Vistas */}
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center">
                <button
                    onClick={() => onViewChange('table')}
                    className={`p-2 rounded-md transition-all ${
                        viewMode === 'table' 
                        ? 'bg-slate-100 text-slate-900 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Vista de Lista"
                >
                    <List className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onViewChange('grid')}
                    className={`p-2 rounded-md transition-all ${
                        viewMode === 'grid' 
                        ? 'bg-slate-100 text-slate-900 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Vista de Cuadrícula"
                >
                    <LayoutGrid className="h-4 w-4" />
                </button>
            </div>

            <button onClick={onNew} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-95">
                <Plus className="h-4 w-4" /> 
                <span className="hidden sm:inline">Registrar Visita</span>
                <span className="sm:hidden">Nuevo</span>
            </button>
        </div>
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
    const [selectedVisit, setSelectedVisit] = useState<ShowroomVisit | null>(null);

    // NUEVO ESTADO: Control de vista (Por defecto 'table' como pediste)
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const handleCreate = () => {
        setSelectedVisit(null); 
        setIsModalOpen(true);
    };

    const handleEdit = (visit: ShowroomVisit) => {
        setSelectedVisit(visit);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Header 
                onNew={handleCreate} 
                viewMode={viewMode}
                onViewChange={setViewMode}
            />

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
                <div className="py-20 flex justify-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                        <span>Cargando actividad...</span>
                    </div>
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No hay visitas registradas con estos filtros.</p>
                    <button onClick={() => setDateFilter('all')} className="text-sm text-blue-600 hover:underline mt-2">Ver todo el historial</button>
                </div>
            ) : (
                <>
                    {/* Renderizado Condicional según viewMode */}
                    {viewMode === 'table' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <ShowroomTable 
                                visits={visits as unknown as ShowroomVisit[]} 
                                onEdit={handleEdit} 
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {visits.map(visitRaw => {
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
                </>
            )}

            <VisitFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={reload}
                // @ts-ignore
                visitToEdit={selectedVisit} 
            />
        </div>
    );
}