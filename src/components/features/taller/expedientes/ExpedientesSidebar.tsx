import React from "react";
import { Search, Folder } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

interface SidebarProps {
    ordenes: OrdenTrabajo[];
    selectedStatus: string | null;
    onSelectStatus: (status: string | null) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

export function ExpedientesSidebar({ ordenes, selectedStatus, onSelectStatus, searchTerm, onSearchChange }: SidebarProps) {
    const estados = [
        { id: 'recepcion', label: 'Recepción' },
        { id: 'en_proceso', label: 'En Proceso' },
        { id: 'terminado', label: 'Terminado' },
        { id: 'entregado', label: 'Entregados' }
    ];

    const countByStatus = (status: string) => ordenes.filter(o => o.estado === status).length;

    return (
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 font-black text-slate-800 mb-4">
                    <div className="bg-slate-900 p-1.5 rounded-lg text-white">
                        <Folder className="h-4 w-4" />
                    </div>
                    Base de Expedientes
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar placa, cliente..." 
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Carpetas Principales</div>
                
                <button 
                    onClick={() => onSelectStatus(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedStatus ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <span className="flex items-center gap-2"><Folder className="h-4 w-4 text-slate-400" /> Todos</span>
                    <span className="bg-slate-200/50 text-slate-500 text-xs px-2 py-0.5 rounded-full">{ordenes.length}</span>
                </button>

                <div className="mt-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Por Estado</div>
                    {estados.map(estado => (
                        <button 
                            key={estado.id}
                            onClick={() => onSelectStatus(estado.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedStatus === estado.id ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="flex items-center gap-2">
                                <Folder className={`h-4 w-4 ${selectedStatus === estado.id ? 'text-slate-700' : 'text-slate-400'}`} /> 
                                {estado.label}
                            </span>
                            <span className="text-slate-400 text-xs">{countByStatus(estado.id)}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}