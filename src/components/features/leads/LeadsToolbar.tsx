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
    BellRing,
    ArrowLeftRight
} from "lucide-react";

import type { LeadsFilters } from "@/types/leads.types";


interface LeadsToolbarProps {
    filters: LeadsFilters;
    onFilterChange: (key: keyof LeadsFilters | Partial<LeadsFilters>, value?: any) => void;
    onReset: () => void;
    totalResults: number;
    respondedCount?: number;     // Métrica 1: De la lista actual
    interactionsCount?: number;  // Métrica 2: Trabajo realizado en fecha X
    budgetCount?: number;        // Métrica 3: Leads con presupuesto
    tradeInLeadsCount?: number; // Leads con al menos un trade_in_cars
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
    budgetCount = 0,
    tradeInLeadsCount = 0,
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
        filters.hasBudget ||
        filters.hasTradeIn ||
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

                    {(budgetCount > 0 || tradeInLeadsCount > 0 || requestStats.datosPedidos.total > 0 || requestStats.asesoria.total > 0) && (
                        <>
                            {/* SEPARADOR */}
                            <span className="hidden sm:inline h-4 w-[1px] bg-slate-200 mx-1"></span>

                            {/* DROPDOWN DE ALERTAS / FILTROS EXTRA */}
                            <div className="relative group z-50">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors cursor-pointer text-sm font-medium">
                                    <div className="relative">
                                        <BellRing className="h-4 w-4 text-brand-500 animate-pulse" />
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
                                    </div>
                                    <span>Alertas Rápidas</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 group-hover:rotate-180" />
                                </button>

                                {/* Menú Desplegable */}
                                <div className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+0.5rem)] w-72 bg-white border border-slate-200 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top-right">
                                    <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 px-2 border-b border-slate-100 pb-1.5">
                                        Filtros y Notificaciones
                                    </h4>
                                    
                                    <div className="space-y-1.5">
                                        {/* Presupuesto */}
                                        {budgetCount > 0 && (
                                            <button 
                                                type="button"
                                                onClick={() => onFilterChange({ hasBudget: !filters.hasBudget, status: 'all', requestStatus: 'all', hasTradeIn: false })}
                                                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                    filters.hasBudget 
                                                    ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
                                                    : 'hover:bg-amber-50/50 text-slate-600 border-transparent hover:border-amber-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-md ${filters.hasBudget ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Activity className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Con Presupuesto</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filters.hasBudget ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                                                    {budgetCount}
                                                </span>
                                            </button>
                                        )}

                                        {tradeInLeadsCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onFilterChange({
                                                        hasTradeIn: !filters.hasTradeIn,
                                                        status: "all",
                                                        requestStatus: "all",
                                                        hasBudget: false,
                                                    })
                                                }
                                                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                    filters.hasTradeIn
                                                        ? "border-indigo-400 bg-indigo-100 text-indigo-950 shadow-md ring-2 ring-indigo-300/60"
                                                        : "border-transparent text-slate-600 hover:border-indigo-100 hover:bg-indigo-50/60"
                                                }`}
                                                title="Filtrar leads con vehículo en intercambio o parte de pago"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`p-1.5 rounded-md ${
                                                            filters.hasTradeIn
                                                                ? "bg-indigo-500 text-white shadow-sm"
                                                                : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Intercambio / parte de pago</span>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        filters.hasTradeIn
                                                            ? "bg-indigo-600 text-white shadow-sm"
                                                            : "bg-slate-100 text-slate-600"
                                                    }`}
                                                >
                                                    {tradeInLeadsCount}
                                                </span>
                                            </button>
                                        )}

                                        {/* Info Faltante */}
                                        {requestStats.datosPedidos.total > 0 && (
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => onFilterChange({ status: filters.status === 'datos_pedidos' ? 'all' : 'datos_pedidos', requestStatus: 'all', hasBudget: false, hasTradeIn: false })}
                                                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                        filters.status === 'datos_pedidos'
                                                        ? 'bg-purple-50 text-purple-800 border-purple-200 shadow-sm'
                                                        : 'hover:bg-purple-50/50 text-slate-600 border-transparent hover:border-purple-100'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`p-1.5 rounded-md ${filters.status === 'datos_pedidos' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            <ClipboardList className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="font-semibold text-sm">Info. Faltante</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {requestStats.datosPedidos.pendiente > 0 && filters.status !== 'datos_pedidos' && (
                                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200" title="Pendientes">
                                                                {requestStats.datosPedidos.pendiente} pend.
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filters.status === 'datos_pedidos' ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 text-slate-600'}`}>
                                                            {requestStats.datosPedidos.total}
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Sub-opciones de Info Faltante */}
                                                {filters.status === 'datos_pedidos' && (
                                                    <div className="flex flex-col gap-0.5 pl-11 pr-2 pb-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'pendiente', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'pendiente' 
                                                                ? 'bg-orange-100 text-orange-800 font-semibold border-orange-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Pendientes</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'pendiente' ? 'bg-orange-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.pendiente}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'en_proceso', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'en_proceso' 
                                                                ? 'bg-blue-100 text-blue-800 font-semibold border-blue-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>En Proceso</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'en_proceso' ? 'bg-blue-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.en_proceso}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'resuelto', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'resuelto' 
                                                                ? 'bg-emerald-100 text-emerald-800 font-semibold border-emerald-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Resueltos</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'resuelto' ? 'bg-emerald-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.resuelto}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'datos_pedidos', requestStatus: 'all', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                (filters.requestStatus === 'all' || !filters.requestStatus)
                                                                ? 'bg-purple-100 text-purple-800 font-semibold border-purple-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Todos</span>
                                                            <span className={`font-bold px-1.5 rounded ${(filters.requestStatus === 'all' || !filters.requestStatus) ? 'bg-purple-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.datosPedidos.total}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Asesorías */}
                                        {requestStats.asesoria.total > 0 && (
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => onFilterChange({ status: filters.status === 'asesoria_financiamiento' ? 'all' : 'asesoria_financiamiento', requestStatus: 'all', hasBudget: false, hasTradeIn: false })}
                                                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                                                        filters.status === 'asesoria_financiamiento'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                                                        : 'hover:bg-emerald-50/50 text-slate-600 border-transparent hover:border-emerald-100'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`p-1.5 rounded-md ${filters.status === 'asesoria_financiamiento' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            <User className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="font-semibold text-sm">Asesorías Fin.</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {requestStats.asesoria.pendiente > 0 && filters.status !== 'asesoria_financiamiento' && (
                                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200" title="Pendientes">
                                                                {requestStats.asesoria.pendiente} pend.
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filters.status === 'asesoria_financiamiento' ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
                                                            {requestStats.asesoria.total}
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Sub-opciones de Asesorías */}
                                                {filters.status === 'asesoria_financiamiento' && (
                                                    <div className="flex flex-col gap-0.5 pl-11 pr-2 pb-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'pendiente', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'pendiente' 
                                                                ? 'bg-orange-100 text-orange-800 font-semibold border-orange-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Pendientes</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'pendiente' ? 'bg-orange-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.asesoria.pendiente}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'en_proceso', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'en_proceso' 
                                                                ? 'bg-blue-100 text-blue-800 font-semibold border-blue-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>En Proceso</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'en_proceso' ? 'bg-blue-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.asesoria.en_proceso}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'resuelto', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                filters.requestStatus === 'resuelto' 
                                                                ? 'bg-emerald-100 text-emerald-800 font-semibold border-emerald-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Resueltos</span>
                                                            <span className={`font-bold px-1.5 rounded ${filters.requestStatus === 'resuelto' ? 'bg-emerald-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.asesoria.resuelto}</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onFilterChange({ status: 'asesoria_financiamiento', requestStatus: 'all', hasBudget: false, hasTradeIn: false }); }}
                                                            className={`flex justify-between items-center px-2 py-1.5 rounded-md text-xs transition-colors border ${
                                                                (filters.requestStatus === 'all' || !filters.requestStatus)
                                                                ? 'bg-emerald-100 text-emerald-800 font-semibold border-emerald-200 shadow-sm' 
                                                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <span>Todos</span>
                                                            <span className={`font-bold px-1.5 rounded ${(filters.requestStatus === 'all' || !filters.requestStatus) ? 'bg-emerald-200/50' : 'bg-slate-100 text-slate-500'}`}>{requestStats.asesoria.total}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
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