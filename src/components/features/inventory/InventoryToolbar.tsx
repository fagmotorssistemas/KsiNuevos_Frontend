import { 
    Search, 
    X, 
    ChevronDown, 
    Car, 
    MapPin, 
    Tag,
    ArrowUpDown
} from "lucide-react";
import type { InventoryFilters, SortOption } from "../../../hooks/useInventory";

interface InventoryToolbarProps {
    filters: InventoryFilters;
    sortBy: SortOption;
    onFilterChange: (key: keyof InventoryFilters, value: any) => void;
    onSortChange: (value: SortOption) => void;
    onReset: () => void;
    resultsCount: number;
}

// Selector Custom (Reutilizable del diseño anterior)
const CustomSelect = ({ 
    value, 
    onChange, 
    icon: Icon, 
    children,
    className = ""
}: { 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
    icon: any; 
    children: React.ReactNode; 
    className?: string;
}) => (
    <div className={`relative group ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors">
            <Icon className="h-4 w-4" />
        </div>
        <select
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-8 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            value={value}
            onChange={onChange}
        >
            {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown className="h-3.5 w-3.5" />
        </div>
    </div>
);

export function InventoryToolbar({ 
    filters, 
    sortBy, 
    onFilterChange, 
    onSortChange, 
    onReset, 
    resultsCount 
}: InventoryToolbarProps) {
    const hasActiveFilters = filters.status !== 'all' || filters.location !== 'all' || filters.minYear !== '' || filters.search !== '';

    return (
        <div className="space-y-4">
            {/* Fila Principal de Controles */}
            <div className="flex flex-col xl:flex-row gap-4 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* 1. BUSCADOR */}
                <div className="flex-1 relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Search className="h-4.5 w-4.5" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar auto (Ej: Toyota, P5, SUV)..." 
                        className="h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:bg-slate-50/50 transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                    />
                    <div className="hidden xl:block absolute right-0 top-2 bottom-2 w-px bg-slate-100"></div>
                </div>

                {/* 2. FILTROS */}
                <div className="p-1 xl:p-0 grid grid-cols-2 md:flex gap-3 items-center">
                    
                    {/* Filtro Estado */}
                    <div className="min-w-[160px]">
                        <CustomSelect 
                            icon={Tag}
                            value={filters.status}
                            onChange={(e) => onFilterChange('status', e.target.value)}
                        >
                            <option value="all">Estado: Todos</option>
                            <option value="disponible">🟢 Disponible</option>
                            <option value="reservado">🟡 Reservado</option>
                            <option value="vendido">🔴 Vendido</option>
                            <option value="mantenimiento">🔧 Taller</option>
                        </CustomSelect>
                    </div>

                    {/* Filtro Año Mínimo */}
                    <div className="min-w-[140px]">
                        <CustomSelect 
                            icon={Car}
                            value={filters.minYear}
                            onChange={(e) => onFilterChange('minYear', e.target.value)}
                        >
                            <option value="">Año: Todos</option>
                            <option value="2024">2024+</option>
                            <option value="2022">2022+</option>
                            <option value="2020">2020+</option>
                            <option value="2015">2015+</option>
                        </CustomSelect>
                    </div>

                    {/* Ordenar Por */}
                    <div className="min-w-[170px]">
                        <CustomSelect 
                            icon={ArrowUpDown}
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as SortOption)}
                        >
                            <option value="newest">✨ Recientes</option>
                            <option value="price_asc">💰 Precio: Menor a Mayor</option>
                            <option value="price_desc">💰 Precio: Mayor a Menor</option>
                            <option value="year_desc">📅 Año: Más Nuevos</option>
                        </CustomSelect>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-2">
                <span className="text-xs font-medium text-slate-500">
                    Vehículos encontrados: <strong className="text-slate-900 text-sm">{resultsCount}</strong>
                </span>
                
                {hasActiveFilters && (
                    <button 
                        onClick={onReset}
                        className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors bg-white hover:bg-red-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-red-100 shadow-sm"
                    >
                        <div className="bg-slate-100 group-hover:bg-red-200 rounded-full p-0.5 transition-colors">
                            <X className="h-3 w-3" />
                        </div>
                        Limpiar filtros
                    </button>
                )}
            </div>
        </div>
    );
}