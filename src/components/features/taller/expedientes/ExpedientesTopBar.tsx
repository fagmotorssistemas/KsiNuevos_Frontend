import React from "react";
import { Search, Folder, Filter } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface TopBarProps {
    ordenes: OrdenTrabajo[];
    selectedStatus: string | null;
    onSelectStatus: (status: string | null) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    
    // Nuevas props para el filtro contable
    selectedContableStatus: string | null;
    onSelectContableStatus: (status: string | null) => void;
}

export function ExpedientesTopBar({ 
    ordenes, selectedStatus, onSelectStatus, searchTerm, onSearchChange,
    selectedContableStatus, onSelectContableStatus
}: TopBarProps) {
    const estados = [
        { id: 'recepcion', label: 'Recepción' },
        { id: 'en_proceso', label: 'En Proceso' },
        { id: 'terminado', label: 'Terminado' },
        { id: 'entregado', label: 'Entregados' }
    ];

    const countByStatus = (status: string) => ordenes.filter(o => o.estado === status).length;

    return (
        <div className="bg-white rounded-2xl border-slate-200 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center w-full shadow-sm z-10 flex-shrink-0">
            
            {/* Buscador y Filtro Contable */}    
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                {/* Buscador */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por placa o cliente" 
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Filtro Contable */}
                <div className="relative w-full sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select 
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none"
                        value={selectedContableStatus || ""}
                        onChange={(e) => onSelectContableStatus(e.target.value === "" ? null : e.target.value)}
                    >
                        <option value="">Cualquier Pago</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="facturado">Facturado</option>
                        <option value="pagado">Pagado</option>
                        <option value="anulado">Anulado</option>
                    </select>
                </div>
            </div>

            {/* Filtros por Estado del Taller (Pestañas horizontales) */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                <button 
                    onClick={() => onSelectStatus(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        !selectedStatus 
                        ? 'bg-slate-800 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    <Folder className="h-4 w-4" /> Todos
                    <span className={`text-xs px-2 py-0.5 rounded-full ${!selectedStatus ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {ordenes.length}
                    </span>
                </button>
                
                {estados.map(estado => (
                    <button 
                        key={estado.id}
                        onClick={() => onSelectStatus(estado.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            selectedStatus === estado.id 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {estado.label}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedStatus === estado.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {countByStatus(estado.id)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}