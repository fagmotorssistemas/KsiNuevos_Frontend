import React from "react";
import { Search, Folder, Filter, User, ArrowDownNarrowWide } from "lucide-react";
import { OrdenTrabajo } from "@/types/taller";

/** IDs de clientes internos en taller_clientes; el resto se consideran externos */
export const CLIENTE_INTERNO_FAG_ID = "36432144-fd73-4682-af49-3647b8e4958e";
export const CLIENTE_INTERNO_AUTOMEKANO_ID = "8b44cf1d-3f5f-4408-91fd-f5b6a03b3bba";

export type ClienteTipoFilter = "" | "interno_fag" | "interno_automekano" | "externos";

/** Ordenamiento: fecha_ingreso desc = más reciente primero, numero_orden desc/asc, etc. */
export type OrdenamientoFilter = "fecha_ingreso_desc" | "fecha_ingreso_asc" | "numero_orden_desc" | "numero_orden_asc" | "placa_asc";

export function isOrdenClienteExterno(clienteId: string): boolean {
    return clienteId !== CLIENTE_INTERNO_FAG_ID && clienteId !== CLIENTE_INTERNO_AUTOMEKANO_ID;
}

interface TopBarProps {
    ordenes: OrdenTrabajo[];
    selectedStatus: string | null;
    onSelectStatus: (status: string | null) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    
    // Nuevas props para el filtro contable
    selectedContableStatus: string | null;
    onSelectContableStatus: (status: string | null) => void;

    // Filtro por tipo de cliente (interno FAG, interno AUTOMEKANO, externos)
    selectedClienteTipo: ClienteTipoFilter;
    onSelectClienteTipo: (tipo: ClienteTipoFilter) => void;

    // Ordenamiento
    ordenamiento: OrdenamientoFilter;
    onOrdenamientoChange: (orden: OrdenamientoFilter) => void;
}

export function ExpedientesTopBar({ 
    ordenes, selectedStatus, onSelectStatus, searchTerm, onSearchChange,
    selectedContableStatus, onSelectContableStatus,
    selectedClienteTipo, onSelectClienteTipo,
    ordenamiento, onOrdenamientoChange
}: TopBarProps) {
    const estados = [
        { id: 'recepcion', label: 'Recepción' },
        { id: 'en_proceso', label: 'En Proceso' },
        { id: 'terminado', label: 'Terminado' },
        { id: 'entregado', label: 'Entregados' }
    ];

    const countByStatus = (status: string) => ordenes.filter(o => o.estado === status).length;

    return (
        <div className="flex flex-col w-full gap-3 z-10 flex-shrink-0">
            {/* Barra 1: Buscador y filtros */}
            <div className="w-full bg-white rounded-2xl border border-slate-200 px-6 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div className="relative w-full sm:w-100">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por placa, cliente, marca o modelo" 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none"
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
                    <div className="relative w-full sm:w-52">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none"
                            value={selectedClienteTipo}
                            onChange={(e) => onSelectClienteTipo((e.target.value || "") as ClienteTipoFilter)}
                        >
                            <option value="">Todos los clientes</option>
                            <option value="interno_fag">Fabian Aguirre</option>
                            <option value="interno_automekano">AUTOMEKANO </option>
                            <option value="externos">Clientes externos</option>
                        </select>
                    </div>
                    <div className="relative w-full sm:w-52">
                        <ArrowDownNarrowWide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer appearance-none"
                            value={ordenamiento}
                            onChange={(e) => onOrdenamientoChange(e.target.value as OrdenamientoFilter)}
                        >
                            <option value="fecha_ingreso_desc">Últimos ingresados</option>
                            <option value="fecha_ingreso_asc">Más antiguos primero</option>
                            <option value="numero_orden_desc">Nº orden (mayor primero)</option>
                            <option value="numero_orden_asc">Nº orden (menor primero)</option>
                            <option value="placa_asc">Por placa (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Barra 2: Filtros por estado del taller */}
            <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 px-6 py-3 shadow-sm">
                <div className="flex gap-2 overflow-x-auto w-full scrollbar-hide">
                    <button 
                        onClick={() => onSelectStatus(null)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            !selectedStatus 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
        </div>
    );
}