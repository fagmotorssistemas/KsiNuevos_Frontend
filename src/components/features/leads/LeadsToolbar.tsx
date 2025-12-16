import { 
    Search, 
    X, 
    ChevronDown, 
    Calendar, 
    Flame, 
    Activity,
    User,
    MessageSquare // Icono para respondidos
} from "lucide-react";

import type { LeadsFilters } from "@/hooks/useLeads";

interface LeadsToolbarProps {
    filters: LeadsFilters;
    onFilterChange: (key: keyof LeadsFilters, value: any) => void;
    onReset: () => void;
    totalResults: number;
    // NUEVA PROP: Cantidad de respondidos
    respondedCount?: number; 
    currentUserRole?: string | null;
    sellers?: { id: string; full_name: string }[];
}

// --- SUB-COMPONENTE: SELECTOR PERSONALIZADO ---
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
    <div className="relative group w-full">
        {/* Icono Izquierdo */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors">
            <Icon className="h-4 w-4" />
        </div>
        
        {/* Select Nativo */}
        <select
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-8 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            value={value}
            onChange={onChange}
        >
            {children}
        </select>

        {/* Icono Flecha Derecha */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown className="h-3.5 w-3.5" />
        </div>
    </div>
);

export function LeadsToolbar({ 
    filters, 
    onFilterChange, 
    onReset, 
    totalResults,
    respondedCount = 0, // Default a 0
    currentUserRole,
    sellers = [] 
}: LeadsToolbarProps) {
    
    // Verificamos si es admin
    const isAdmin = currentUserRole?.toLowerCase() === 'admin';

    // Asignamos directamente
    const assignedToValue = filters.assignedTo || 'all';

    const hasActiveFilters = 
        filters.status !== 'all' || 
        filters.temperature !== 'all' || 
        filters.dateRange !== 'all' || 
        filters.search !== '' ||
        (isAdmin && assignedToValue !== 'all');

    // Calculamos el porcentaje para mostrarlo visualmente bonito (opcional)
    const responseRate = totalResults > 0 ? Math.round((respondedCount / totalResults) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* Contenedor Principal */}
            <div className="flex flex-col xl:flex-row gap-4 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* 1. BUSCADOR */}
                <div className="flex-1 relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Search className="h-4.5 w-4.5" />
                    </div>
                    <input 
                        type="text" 
                        // MODIFICADO: Agregado "o vehículo" al placeholder
                        placeholder="Buscar por nombre, teléfono, ID o vehículo..." 
                        className="h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:bg-slate-50/50 transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                    />
                </div>

                {/* 2. FILTROS */}
                <div className="p-1 xl:p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:flex gap-3 items-center">
                    
                    {/* Filtro Estado */}
                    <div className="min-w-[160px]">
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
                    <div className="min-w-[160px]">
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
                    <div className="min-w-[160px]">
                        <CustomSelect 
                            icon={Calendar}
                            value={filters.dateRange}
                            onChange={(e) => onFilterChange('dateRange', e.target.value)}
                        >
                            <option value="all">Fecha: Todas</option>
                            <option value="today">📅 Hoy</option>
                            <option value="7days">7 días</option>
                            <option value="15days">15 días</option>
                            <option value="30days">30 días</option>
                        </CustomSelect>
                    </div>

                    {/* --- FILTRO RESPONSABLE (SOLO ADMIN) --- */}
                    {isAdmin && (
                        <div className="min-w-[180px] animate-in fade-in zoom-in-95 duration-300">
                            <CustomSelect 
                                icon={User}
                                value={assignedToValue}
                                onChange={(e) => onFilterChange('assignedTo', e.target.value)}
                            >
                                <option value="all">Responsable: Todos</option>
                                {sellers?.length === 0 && (
                                    <option disabled>Cargando...</option>
                                )}
                                {sellers?.map((seller) => (
                                    <option key={seller.id} value={seller.id}>
                                        {seller.full_name}
                                    </option>
                                ))}
                            </CustomSelect>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer de filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-2">
                
                {/* MÉTRICAS DE RESULTADOS */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span>
                        Resultados: <strong className="text-slate-900 text-sm">{totalResults}</strong>
                    </span>
                    
                    {/* SEPARADOR */}
                    <span className="h-1 w-1 rounded-full bg-slate-300"></span>

                    {/* NUEVO: CONTADOR DE RESPONDIDOS */}
                    <div className="flex items-center gap-1.5 text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                            <strong className="text-brand-700">{respondedCount}</strong> de {totalResults} respondidos
                        </span>
                        {totalResults > 0 && (
                            <span className="text-brand-400 ml-0.5">({responseRate}%)</span>
                        )}
                    </div>
                </div>
                
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