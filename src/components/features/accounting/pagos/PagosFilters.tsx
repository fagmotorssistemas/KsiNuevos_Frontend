import { 
    Search, 
    Filter, 
    Layers
} from "lucide-react";

export type GastoCategory = 
    | 'ALL' 
    | 'COMPRA_VEHICULO' 
    | 'MANTENIMIENTO' 
    | 'LEGAL' 
    | 'SERVICIOS' 
    | 'FINANCIERO' 
    | 'CUV' 
    | 'SALDOS_INICIALES' 
    | 'OTROS';

export interface PagosFilterState {
    searchTerm: string;
    // datePreset se maneja externamente ahora
    category: GastoCategory;
}

interface PagosFiltersProps {
    filters: PagosFilterState;
    onChange: (newFilters: PagosFilterState) => void;
    isVisible: boolean; 
    onToggle: () => void;
}

export function PagosFilters({ filters, onChange, isVisible, onToggle }: PagosFiltersProps) {

    const categories: { id: GastoCategory; label: string }[] = [
        { id: 'ALL', label: 'Todos los Registros' },
        { id: 'COMPRA_VEHICULO', label: 'Compra de Vehículos' },
        { id: 'MANTENIMIENTO', label: 'Mantenimiento y Taller' },
        { id: 'LEGAL', label: 'Notaría y Legal' },
        { id: 'SERVICIOS', label: 'Servicios y Suministros' },
        { id: 'FINANCIERO', label: 'Financiero y Nómina' },
        { id: 'CUV', label: 'CUV / Tránsito' },
        { id: 'SALDOS_INICIALES', label: 'Saldos Iniciales' },
        { id: 'OTROS', label: 'Otros Gastos (Varios)' },
    ];

    return (
        <div className="mb-6">
             <button 
                onClick={onToggle}
                className="flex items-center gap-2 text-sm font-medium text-red-600 mb-3 hover:text-red-700 transition-colors"
            >
                <Filter className="h-4 w-4" />
                {isVisible ? 'Ocultar Filtros Avanzados' : 'Búsqueda y Filtros Avanzados'}
            </button>

            {isVisible && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-in slide-in-from-top-2 duration-200">
                    
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        
                        {/* 1. Buscador Universal */}
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar proveedor, concepto, factura..."
                                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                                value={filters.searchTerm}
                                onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
                            />
                        </div>

                        {/* 2. Filtro de Categoría Inteligente */}
                        <div className="relative min-w-[240px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Layers className="h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                className="block w-full pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 appearance-none bg-white cursor-pointer"
                                value={filters.category}
                                onChange={(e) => onChange({ ...filters, category: e.target.value as GastoCategory })}
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <Filter className="h-3 w-3 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}