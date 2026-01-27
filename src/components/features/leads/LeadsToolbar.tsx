import {
    Search,
    X,
    ChevronDown,
    Calendar,
    Flame,
    Activity,
    User,
    MessageSquare,
    ClipboardList // Icono para interacciones/gestión
} from "lucide-react";

import type { LeadsFilters } from "@/types/leads.types";


interface LeadsToolbarProps {
    filters: LeadsFilters;
    onFilterChange: (key: keyof LeadsFilters, value: any) => void;
    onReset: () => void;
    totalResults: number;
    respondedCount?: number;     // Métrica 1: De la lista actual
    interactionsCount?: number;  // Métrica 2: Trabajo realizado en fecha X
    currentUserRole?: string | null;
    sellers?: { id: string; full_name: string }[];
}

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
    <div className={`relative group w-full ${className}`}>
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

export function LeadsToolbar({
    filters,
    onFilterChange,
    onReset,
    totalResults,
    respondedCount = 0,
    interactionsCount = 0,
    currentUserRole,
    sellers = []
}: LeadsToolbarProps) {

    const isAdmin = currentUserRole?.toLowerCase() === 'admin';
    const assignedToValue = filters.assignedTo || 'all';

    const hasActiveFilters =
        filters.status !== 'all' ||
        filters.temperature !== 'all' ||
        filters.dateRange !== 'all' ||
        filters.exactDate !== '' ||
        filters.search !== '' ||
        (isAdmin && assignedToValue !== 'all');

    // Porcentaje para la métrica vieja
    const responseRate = totalResults > 0 ? Math.round((respondedCount / totalResults) * 100) : 0;

    // Texto dinámico para la nueva métrica
    const getInteractionLabel = () => {
        if (filters.exactDate) {
            // Convertir YYYY-MM-DD a formato legible
            const [y, m, d] = filters.exactDate.split('-');
            return `Gestión del ${d}/${m}`;
        }
        return "Gestión de Hoy";
    };

    return (
        <div className="space-y-4">
            {/* Contenedor Principal de Filtros */}
            <div className="flex flex-col xl:flex-row gap-4 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">

                {/* 1. BUSCADOR */}
                <div className="flex-1 relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Search className="h-4.5 w-4.5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono, ID o vehículo..."
                        className="h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:bg-slate-50/50 transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                    />
                </div>

                {/* 2. FILTROS */}
                <div className="p-1 xl:p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:flex gap-3 items-center">

                    <div className="min-w-[150px]">
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
                            <option value="en_proceso">⏳ En Proceso</option>
                        </CustomSelect>
                    </div>

                    <div className="min-w-[150px]">
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

                    {/* Filtro Fecha (Exacta o Rango) */}
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 p-0.5 min-w-[200px]">
                        <div className="relative flex-1">
                            {filters.exactDate ? (
                                <div className="relative flex items-center">
                                    <div className="absolute left-2.5 text-brand-500 pointer-events-none">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <input
                                        type="date"
                                        className="h-9 w-full rounded-md border-0 bg-white pl-8 pr-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-500 shadow-sm"
                                        value={filters.exactDate}
                                        onChange={(e) => onFilterChange('exactDate', e.target.value)}
                                    />
                                    <button
                                        onClick={() => onFilterChange('exactDate', '')}
                                        className="absolute right-8 hover:bg-slate-100 p-0.5 rounded text-slate-400 hover:text-red-500"
                                        title="Volver a rangos"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <CustomSelect
                                    icon={Calendar}
                                    value={filters.dateRange}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                                            onFilterChange('exactDate', today);
                                        } else {
                                            onFilterChange('dateRange', e.target.value);
                                        }
                                    }}
                                    className="border-none shadow-none bg-transparent"
                                >
                                    <option value="all">📅 Todo el tiempo</option>
                                    <option value="today">Hoy (Creados hoy)</option>
                                    <option value="7days">Últimos 7 días</option>
                                    <option value="15days">Últimos 15 días</option>
                                    <option value="30days">Últimos 30 días</option>
                                    <option value="custom">🔎 Fecha exacta...</option>
                                </CustomSelect>
                            )}
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="min-w-[160px]">
                            <CustomSelect
                                icon={User}
                                value={assignedToValue}
                                onChange={(e) => onFilterChange('assignedTo', e.target.value)}
                            >
                                <option value="all">Resp: Todos</option>
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

            {/* Footer de métricas */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-2">

                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                    <span>
                        Resultados: <strong className="text-slate-900 text-sm">{totalResults}</strong>
                    </span>

                    <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-300"></span>

                    {/* MÉTRICA 1 (Original): Respondidos en la lista visual actual */}
                    <div className="flex items-center gap-1.5 text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                            <strong className="text-brand-700">{respondedCount}</strong> de {totalResults} respondidos
                        </span>
                        {totalResults > 0 && (
                            <span className="text-brand-400 ml-0.5">({responseRate}%)</span>
                        )}
                    </div>

                    {/* SEPARADOR */}
                    <span className="hidden sm:inline h-4 w-[1px] bg-slate-200 mx-1"></span>

                    {/* MÉTRICA 2 (Nueva Inteligente): Interacciones realizadas en la fecha X */}
                    {/* Esta reacciona a los filtros de Responsable y Fecha */}
                    <div className="flex items-center gap-1.5 text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm animate-in fade-in"
                        title="Leads gestionados en la fecha seleccionada por el responsable seleccionado">
                        <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
                        <span>
                            {getInteractionLabel()}: <strong className="text-slate-900 text-sm">{interactionsCount}</strong> interacciones
                        </span>
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