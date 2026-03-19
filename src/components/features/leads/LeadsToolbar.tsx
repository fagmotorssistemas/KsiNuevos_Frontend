import {
    Search,
    X,
    ChevronDown,
    Calendar,
    Flame,
    Activity,
    User,
    MessageSquare,
    ClipboardList, // Icono para interacciones/gestión
    BellRing
} from "lucide-react";

import type { LeadsFilters } from "@/types/leads.types";


interface LeadsToolbarProps {
    filters: LeadsFilters;
    onFilterChange: (key: keyof LeadsFilters | Partial<LeadsFilters>, value?: any) => void;
    onReset: () => void;
    totalResults: number;
    respondedCount?: number;     // Métrica 1: De la lista actual
    interactionsCount?: number;  // Métrica 2: Trabajo realizado en fecha X
    requestStats?: {
        datosPedidos: { pendiente: number; en_proceso: number; resuelto: number; total: number };
        asesoria: { pendiente: number; en_proceso: number; resuelto: number; total: number };
    };
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

// Helper seguro para obtener fecha Ecuador usando Intl (Infalible)
const getEcuadorDateISO = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
};

export function LeadsToolbar({
    filters,
    onFilterChange,
    onReset,
    totalResults,
    respondedCount = 0,
    interactionsCount = 0,
    requestStats = { 
        datosPedidos: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 }, 
        asesoria: { pendiente: 0, en_proceso: 0, resuelto: 0, total: 0 } 
    },
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
        (filters.requestStatus && filters.requestStatus !== 'all') ||
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
                        placeholder="Buscar por nombre, teléfono, ID Kommo o vehículo..."
                        className="h-11 w-full rounded-xl border-none bg-transparent pl-11 pr-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 focus:bg-slate-50/50 transition-all"
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                    />
                </div>

                {/* 2. FILTROS */}
                <div className="p-1 xl:p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:flex gap-3 items-center">

                    <div className="min-w-[150px] relative">
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
                            <option value="datos_pedidos">📋 Info. Faltante</option>
                            <option value="asesoria_financiamiento">🏦 Asesoria Financiamiento</option>
                        </CustomSelect>
                        {filters.requestStatus && filters.requestStatus !== 'all' && (
                            <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm capitalize z-10">
                                {filters.requestStatus.replace('_', ' ')}
                            </div>
                        )}
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
                                            // Cuando elige fecha personalizada, le ponemos hoy por defecto
                                            const today = getEcuadorDateISO(); 
                                            onFilterChange('exactDate', today);
                                        } else {
                                            // Si elige "Hoy" en la lista, el servicio ahora lo maneja con rango horario exacto
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

                    {/* MÉTRICA 1: Respondidos (Ahora calculado manualmente y preciso) */}
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

                    {/* MÉTRICA 2: Interacciones (Calculado con offset manual) */}
                    <div className="flex items-center gap-1.5 text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm animate-in fade-in"
                        title="Leads gestionados en la fecha seleccionada por el responsable seleccionado">
                        <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
                        <span>
                            {getInteractionLabel()}: <strong className="text-slate-900 text-sm">{interactionsCount}</strong> interacciones
                        </span>
                    </div>

                    {(requestStats.datosPedidos.total > 0 || requestStats.asesoria.total > 0) && (
                        <>
                            {/* SEPARADOR */}
                            <span className="hidden sm:inline h-4 w-[1px] bg-slate-200 mx-1"></span>

                            {/* NOTIFICACIONES PENDIENTES CON POPOVER */}
                            <div className="flex items-center gap-2">
                                {requestStats.datosPedidos.total > 0 && (
                                    <div className="relative group">
                                        <button 
                                            onClick={() => onFilterChange('status', 'datos_pedidos')}
                                            className="flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 shadow-sm animate-in fade-in transition-colors cursor-pointer"
                                            title="Ver Información Faltante"
                                        >
                                            {requestStats.datosPedidos.pendiente > 0 ? (
                                                <BellRing className="h-3.5 w-3.5 animate-bounce text-purple-600" />
                                            ) : (
                                                <BellRing className="h-3.5 w-3.5 text-purple-400" />
                                            )}
                                            <span>
                                                <strong className="font-bold">{requestStats.datosPedidos.pendiente}</strong> Info. Faltante
                                            </span>
                                        </button>
                                        
                                        {/* Popover Hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white border border-slate-200 shadow-xl rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 cursor-default">
                                            <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1">Info. Faltante</h4>
                                            <div className="space-y-1 text-xs">
                                                <div 
                                                    className="flex justify-between items-center text-orange-600 hover:bg-orange-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'pendiente' }); }}
                                                >
                                                    <span>Pendientes</span>
                                                    <span className="font-bold bg-orange-100/50 px-1.5 rounded">{requestStats.datosPedidos.pendiente}</span>
                                                </div>
                                                <div 
                                                    className="flex justify-between items-center text-blue-600 hover:bg-blue-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'en_proceso' }); }}
                                                >
                                                    <span>En Proceso</span>
                                                    <span className="font-bold bg-blue-100/50 px-1.5 rounded">{requestStats.datosPedidos.en_proceso}</span>
                                                </div>
                                                <div 
                                                    className="flex justify-between items-center text-emerald-600 hover:bg-emerald-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'resuelto' }); }}
                                                >
                                                    <span>Resueltos</span>
                                                    <span className="font-bold bg-emerald-100/50 px-1.5 rounded">{requestStats.datosPedidos.resuelto}</span>
                                                </div>
                                                <div 
                                                    className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1 mt-1 hover:bg-slate-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'all' }); }}
                                                >
                                                    <span className="font-medium">Total</span>
                                                    <span className="font-bold">{requestStats.datosPedidos.total}</span>
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
                                        </div>
                                    </div>
                                )}
                                
                                {requestStats.asesoria.total > 0 && (
                                    <div className="relative group">
                                        <button 
                                            onClick={() => onFilterChange('status', 'asesoria_financiamiento')}
                                            className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 shadow-sm animate-in fade-in transition-colors cursor-pointer"
                                            title="Ver Asesorías"
                                        >
                                            {requestStats.asesoria.pendiente > 0 ? (
                                                <BellRing className="h-3.5 w-3.5 animate-bounce text-emerald-600" />
                                            ) : (
                                                <BellRing className="h-3.5 w-3.5 text-emerald-400" />
                                            )}
                                            <span>
                                                <strong className="font-bold">{requestStats.asesoria.pendiente}</strong> Asesorías
                                            </span>
                                        </button>

                                        {/* Popover Hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white border border-slate-200 shadow-xl rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 cursor-default">
                                            <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1">Asesorías Fin.</h4>
                                            <div className="space-y-1 text-xs">
                                                <div 
                                                    className="flex justify-between items-center text-orange-600 hover:bg-orange-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'pendiente' }); }}
                                                >
                                                    <span>Pendientes</span>
                                                    <span className="font-bold bg-orange-100/50 px-1.5 rounded">{requestStats.asesoria.pendiente}</span>
                                                </div>
                                                <div 
                                                    className="flex justify-between items-center text-blue-600 hover:bg-blue-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'en_proceso' }); }}
                                                >
                                                    <span>En Proceso</span>
                                                    <span className="font-bold bg-blue-100/50 px-1.5 rounded">{requestStats.asesoria.en_proceso}</span>
                                                </div>
                                                <div 
                                                    className="flex justify-between items-center text-emerald-600 hover:bg-emerald-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'resuelto' }); }}
                                                >
                                                    <span>Resueltos</span>
                                                    <span className="font-bold bg-emerald-100/50 px-1.5 rounded">{requestStats.asesoria.resuelto}</span>
                                                </div>
                                                <div 
                                                    className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1 mt-1 hover:bg-slate-50 p-1 rounded cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'all' }); }}
                                                >
                                                    <span className="font-medium">Total</span>
                                                    <span className="font-bold">{requestStats.asesoria.total}</span>
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
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