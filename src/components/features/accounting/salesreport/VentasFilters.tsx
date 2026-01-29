import { 
    Search, 
    X, 
    Calendar,
    User,
    Tag,
    Filter,
    ChevronDown // Importamos este icono para mejorar los selects
} from "lucide-react";

// Tipos mantenidos exactamente igual
export type DateRangePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

export interface FilterState {
    search: string;
    brand: string;
    agency: string;
    salesperson: string;
    datePreset: DateRangePreset;
}

interface VentasFiltersProps {
    filters: FilterState;
    onFilterChange: (key: keyof FilterState, value: string) => void;
    onClearFilters: () => void;
    availableBrands: string[];
    availableAgencies: string[];
    availableAgents: string[];
}

export function VentasFilters({ 
    filters, 
    onFilterChange, 
    onClearFilters,
    availableBrands,
    availableAgencies, // Mantenido aunque no se usaba en el original activo
    availableAgents
}: VentasFiltersProps) {

    const datePresets: { label: string, value: DateRangePreset }[] = [
        { label: 'Todo', value: 'all' },
        { label: 'Hoy', value: 'today' },
        { label: 'Esta Semana', value: 'this_week' },
        { label: 'Este Mes', value: 'this_month' },
        { label: 'Mes Pasado', value: 'last_month' },
    ];

    const hasActiveFilters = 
        filters.search !== '' || 
        filters.brand !== 'all' || 
        filters.agency !== 'all' || 
        filters.salesperson !== 'all' || 
        filters.datePreset !== 'all';

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 mb-8">
            
            {/* Encabezado de Filtros */}
            <div className="flex items-center gap-2 mb-6 text-slate-800">
                <div className="p-2 bg-red-50 rounded-lg">
                    <Filter className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="font-bold text-lg">Filtros de Venta</h3>
            </div>

            <div className="space-y-6">
                {/* Fila 1: Búsqueda y Fechas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Buscador - Ocupa 4 columnas en desktop */}
                    <div className="lg:col-span-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Búsqueda Global
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Cliente, modelo, chasis..."
                                value={filters.search}
                                onChange={(e) => onFilterChange('search', e.target.value)}
                                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all hover:bg-slate-100 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Presets de Fecha - Ocupa 8 columnas en desktop */}
                    <div className="lg:col-span-8">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            <Calendar className="h-3.5 w-3.5" />
                            Periodo de tiempo
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {datePresets.map((preset) => {
                                const isActive = filters.datePreset === preset.value;
                                return (
                                    <button
                                        key={preset.value}
                                        onClick={() => onFilterChange('datePreset', preset.value)}
                                        className={`
                                            px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 border
                                            ${isActive 
                                                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200 transform scale-105' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                                            }
                                        `}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* Fila 2: Selectores Específicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
                    
                    {/* Selector de Marca - 5 columnas */}
                    <div className="lg:col-span-5 space-y-2">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" /> Marca del Vehículo
                        </label>
                        <div className="relative">
                            <select
                                value={filters.brand}
                                onChange={(e) => onFilterChange('brand', e.target.value)}
                                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all cursor-pointer text-slate-700"
                            >
                                <option value="all">Todas las marcas</option>
                                {availableBrands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    {/* Selector de Vendedor - 5 columnas */}
                    <div className="lg:col-span-5 space-y-2">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" /> Vendedor Asignado
                        </label>
                        <div className="relative">
                            <select
                                value={filters.salesperson}
                                onChange={(e) => onFilterChange('salesperson', e.target.value)}
                                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all cursor-pointer text-slate-700"
                            >
                                <option value="all">Todos los vendedores</option>
                                {availableAgents.map(agent => (
                                    <option key={agent} value={agent}>{agent}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    {/* Botón Limpiar - 2 columnas */}
                    <div className="lg:col-span-2">
                        <button
                            onClick={onClearFilters}
                            disabled={!hasActiveFilters}
                            className={`
                                w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
                                ${hasActiveFilters
                                    ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:shadow-sm cursor-pointer'
                                    : 'bg-slate-50 border-transparent text-slate-300 cursor-not-allowed'
                                }
                            `}
                        >
                            <X className={`h-4 w-4 ${hasActiveFilters ? 'text-red-500' : 'text-slate-300'}`} />
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}