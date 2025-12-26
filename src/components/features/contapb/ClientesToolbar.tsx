import { Search, X, Filter } from "lucide-react";
import { ClientesFilters, SortOption } from "@/hooks/contapb/useClientes";

interface ClientesToolbarProps {
    filters: ClientesFilters;
    sortBy: SortOption;
    onFilterChange: (key: keyof ClientesFilters, value: any) => void;
    onSortChange: (value: SortOption) => void;
    onReset: () => void;
    resultsCount: number;
}

export function ClientesToolbar({
    filters,
    sortBy,
    onFilterChange,
    onSortChange,
    onReset,
    resultsCount,
}: ClientesToolbarProps) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between animate-in fade-in slide-in-from-top-2">

            {/* Izquierda: Buscador y Filtros */}
            <div className="flex flex-col md:flex-row gap-3 flex-1">
                {/* Buscador */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={filters.search}
                        onChange={(e) => onFilterChange("search", e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {filters.search && (
                        <button
                            onClick={() => onFilterChange("search", "")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Filtro Calificación */}
                {/* <select
                    value={filters.calificacion}
                    onChange={(e) => onFilterChange("calificacion", e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="all">Todas las Calif.</option>
                    <option value="A">Clase A</option>
                    <option value="D">Clase D</option>
                    <option value="ZNCC">ZNCC</option>
                </select> */}
            </div>

            {/* Derecha: Ordenamiento y Contador */}
            <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <span className="text-xs font-medium text-slate-400 hidden lg:inline-block">
                    {resultsCount} resultados
                </span>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as SortOption)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-50"
                >
                    <option value="newest">Más Recientes</option>
                    <option value="oldest">Más Antiguos</option>
                    <option value="name_asc">Nombre (A-Z)</option>
                    <option value="name_desc">Nombre (Z-A)</option>
                </select>

                {/* Botón Reset (Solo si hay filtros activos) */}
                {(filters.search || filters.calificacion !== 'all') && (
                    <button
                        onClick={onReset}
                        className="text-xs text-slate-500 hover:text-blue-600 underline decoration-dotted underline-offset-2"
                    >
                        Limpiar
                    </button>
                )}
            </div>
        </div>
    );
}