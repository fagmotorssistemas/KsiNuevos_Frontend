import { 
    Search, 
    X, 
    ChevronDown, 
    Calendar, 
    Flame, 
    Activity 
} from "lucide-react";
import type { LeadsFilters } from "../../../hooks/useLeads";

interface LeadsToolbarProps {
    filters: LeadsFilters;
    onFilterChange: (key: keyof LeadsFilters, value: any) => void;
    onReset: () => void;
    totalResults: number;
}

// --- SUB-COMPONENTE: SELECTOR PERSONALIZADO ---
// Este componente envuelve el select nativo para darle un diseño moderno
const CustomSelect = ({ 
    value, 
    onChange, 
    icon: Icon, 
    children 
}: { 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
    icon: any; 
    children: React.ReactNode; 
}) => (
    <div className="relative group">
        {/* Icono Izquierdo */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors">
            <Icon className="h-4 w-4" />
        </div>
        
        {/* Select Nativo (con apariencia oculta) */}
        <select
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-8 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            value={value}
            onChange={onChange}
        >
            {children}
        </select>

        {/* Icono Flecha Derecha (Custom) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown className="h-3.5 w-3.5" />
        </div>
    </div>
);

export function LeadsToolbar({ filters, onFilterChange, onReset, totalResults }: LeadsToolbarProps) {
    const hasActiveFilters = filters.status !== 'all' || filters.temperature !== 'all' || filters.dateRange !== 'all' || filters.search !== '';

    return (
        <div className="space-y-4">
            {/* Contenedor Principal */}
            <div className="flex flex-col xl:flex-row gap-4 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* 1. BUSCADOR (Flexible) */}
                <div className="flex-1 relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Search className="h-4.5 w-4.5" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, teléfono o ID..." 
                        className="h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:bg-slate-50/50 transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                    />
                    {/* Separador vertical visual (solo en desktop) */}
                    {/* <div className="hidden xl:block absolute right-0 top-2 bottom-2 w-px bg-slate-100"></div> */}
                </div>

                {/* 2. FILTROS (Grid en móvil, Flex en desktop) */}
                <div className="p-1 xl:p-0 grid grid-cols-1 md:grid-cols-3 xl:flex gap-3 items-center">
                    
                    {/* Filtro Estado */}
                    <div className="min-w-[180px]">
                        <CustomSelect 
                            icon={Activity}
                            value={filters.status}
                            onChange={(e) => onFilterChange('status', e.target.value)}
                        >
                            <option value="all">Estado: Todos</option>
                            <option value="nuevo">🔵 Nuevo</option>
                            <option value="contactado">📞 Contactado</option>
                            <option value="interesado">🤔 Interesado</option>
                            <option value="negociando">🤝 Negociando</option>
                            <option value="ganado">✅ Ganado</option>
                            <option value="perdido">❌ Perdido</option>
                        </CustomSelect>
                    </div>

                    {/* Filtro Temperatura */}
                    <div className="min-w-[180px]">
                        <CustomSelect 
                            icon={Flame}
                            value={filters.temperature}
                            onChange={(e) => onFilterChange('temperature', e.target.value)}
                        >
                            <option value="all">Temp: Todas</option>
                            <option value="caliente">🔥 Caliente</option>
                            <option value="tibio">⛅ Tibio</option>
                            <option value="frio">🧊 Frío</option>
                        </CustomSelect>
                    </div>

                    {/* Filtro Fecha */}
                    <div className="min-w-[180px]">
                        <CustomSelect 
                            icon={Calendar}
                            value={filters.dateRange}
                            onChange={(e) => onFilterChange('dateRange', e.target.value)}
                        >
                            <option value="all">Fecha: Todas</option>
                            <option value="today">📅 Hoy</option>
                            <option value="7days">Últimos 7 días</option>
                            <option value="15days">Últimos 15 días</option>
                            <option value="30days">Últimos 30 días</option>
                        </CustomSelect>
                    </div>
                </div>
            </div>

            {/* Footer de filtros: Resumen y Botón Limpiar */}
            <div className="flex justify-between items-center px-2">
                <span className="text-xs font-medium text-slate-500">
                    Resultados encontrados: <strong className="text-slate-900 text-sm">{totalResults}</strong>
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