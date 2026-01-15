import { useState } from "react";
import { 
    Car, 
    AlertCircle, 
    CheckCircle2, 
    TrendingUp,
    Search,
    ShoppingBag,
    CalendarClock,
    Filter,
    MapPin,
    Info
} from "lucide-react";
import type { VehicleStat, OpportunityStat } from "@/hooks/useVehicleStats";

interface VehicleStatsViewProps {
    stats: VehicleStat[];      
    opportunities: OpportunityStat[];
    isLoading: boolean;
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
}

export function VehicleStatsView({ 
    stats, 
    opportunities, 
    isLoading,
    statusFilter,
    onStatusFilterChange
}: VehicleStatsViewProps) {
    
    const [viewMode, setViewMode] = useState<'performance' | 'demand'>('performance');
    
    // Cálculos
    const topPerformer = stats.length > 0 ? stats[0] : null;
    const totalLeads = stats.reduce((acc, curr) => acc + curr.total_leads, 0);
    const totalShowrooms = stats.reduce((acc, curr) => acc + curr.showroom_count, 0);
    
    // Oportunidades
    const topOpportunity = opportunities.length > 0 ? opportunities[0] : null;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium animate-pulse">Analizando mercado e inventario...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* BARRA DE CONTROLES SUPERIOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                
                {/* Toggle Vistas */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('performance')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                            viewMode === 'performance' 
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Car className="h-4 w-4" />
                        Rendimiento Inventario
                    </button>
                    <button
                        onClick={() => setViewMode('demand')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                            viewMode === 'demand' 
                            ? 'bg-white text-purple-700 shadow-sm ring-1 ring-purple-100' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Demanda Insatisfecha
                        {opportunities.length > 0 && (
                            <span className="bg-purple-600 text-white text-[10px] px-1.5 rounded-full min-w-[1.2rem] text-center">
                                {opportunities.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filtro de Estado (Solo visible en modo performance) */}
                {viewMode === 'performance' && (
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select 
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-slate-200 text-slate-700 font-medium outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="disponible">Solo Disponibles</option>
                            <option value="todos">Todos los Estados</option>
                            <option value="reservado">Reservados</option>
                            <option value="vendido">Vendidos</option>
                            <option value="consignacion">Consignación</option>
                        </select>
                    </div>
                )}
            </div>

            {/* --- VISTA 1: RENDIMIENTO INVENTARIO --- */}
            {viewMode === 'performance' && (
                <>
                    {/* Tarjetas Resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase">Leads Totales</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900">{totalLeads}</span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase">Visitas Showroom</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900">{totalShowrooms}</span>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2 flex items-center justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Vehículo Más Solicitado</span>
                                {topPerformer ? (
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg truncate max-w-[200px] md:max-w-xs">
                                            {topPerformer.brand} {topPerformer.model}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {topPerformer.year} • {topPerformer.status}
                                        </div>
                                    </div>
                                ) : <span className="text-slate-400 italic">Sin datos suficientes</span>}
                            </div>
                            {topPerformer && (
                                <div className="text-right relative z-10">
                                    <span className="block text-2xl font-bold text-blue-600">{topPerformer.total_leads}</span>
                                    <span className="block text-xs text-blue-400 font-medium uppercase tracking-wide">Leads</span>
                                </div>
                            )}
                            {/* Decoración de fondo */}
                            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-50 to-transparent opacity-50 pointer-events-none" />
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {stats.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                <div className="bg-slate-50 p-4 rounded-full mb-3">
                                    <Car className="h-8 w-8 text-slate-300" />
                                </div>
                                <p>No hay actividad registrada para vehículos con estado <strong>{statusFilter}</strong>.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                            <th className="py-3 px-4 w-[40%]">Vehículo</th>
                                            <th className="py-3 px-4 text-center">Estado</th>
                                            <th className="py-3 px-4 text-center bg-blue-50/50 text-blue-800 border-l border-blue-100">Leads</th>
                                            <th className="py-3 px-4 text-center bg-purple-50/50 text-purple-800 border-l border-purple-100">Visitas</th>
                                            <th className="py-3 px-4 text-center w-[15%]">Respuestas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {stats.map((car, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-14 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 border border-slate-200 relative flex items-center justify-center">
                                                            {car.img_url ? (
                                                                <img src={car.img_url} alt={car.model} className="h-full w-full object-cover" />
                                                            ) : <Car className="h-5 w-5 text-slate-300" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{car.brand} {car.model}</div>
                                                            <div className="text-xs text-slate-500">{car.year} • {car.price ? `$${car.price.toLocaleString()}` : 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                                                        car.status === 'disponible' ? 'bg-green-100 text-green-700' :
                                                        car.status === 'vendido' ? 'bg-slate-100 text-slate-500 line-through' :
                                                        car.status === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {car.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/20 border-l border-slate-50 group-hover:bg-blue-50/40">
                                                    {car.total_leads}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-purple-700 bg-purple-50/20 border-l border-slate-50 group-hover:bg-purple-50/40">
                                                    {car.showroom_count}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    car.response_rate > 80 ? 'bg-emerald-500' : 
                                                                    car.response_rate > 50 ? 'bg-amber-400' : 'bg-rose-400'
                                                                }`} 
                                                                style={{ width: `${car.response_rate}%` }} 
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 w-8 text-right">{car.response_rate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- VISTA 2: OPORTUNIDADES --- */}
            {viewMode === 'demand' && (
                <>
                    {/* Tarjeta Resumen */}
                    <div className="bg-gradient-to-r from-purple-50 to-white p-5 rounded-xl border border-purple-100 shadow-sm mb-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white text-purple-600 rounded-xl shadow-sm ring-1 ring-purple-100">
                                    <Search className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-purple-900 text-lg">Demanda Insatisfecha</h4>
                                    <p className="text-sm text-purple-700/80 mt-0.5 max-w-lg">
                                        Vehículos solicitados por clientes que <strong>no están en tu inventario actual</strong>.
                                        Se han filtrado automáticamente las coincidencias con tus autos disponibles.
                                    </p>
                                </div>
                            </div>
                            
                            {topOpportunity && (
                                <div className="bg-white/80 px-4 py-2 rounded-lg border border-purple-100 backdrop-blur-sm">
                                    <span className="block text-xs text-purple-500 uppercase font-bold tracking-wider mb-1">Top Oportunidad</span>
                                    <span className="font-bold text-slate-900 capitalize text-lg flex items-center gap-2">
                                        {topOpportunity.brand} {topOpportunity.model}
                                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                                            {topOpportunity.request_count} leads
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {opportunities.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                                <h3 className="text-slate-900 font-bold text-lg mb-1">¡Todo Cubierto!</h3>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    No se detectaron solicitudes significativas de vehículos que no tengas ya en stock. ¡Tu inventario está alineado con la demanda!
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                            <th className="py-3 px-4 w-[8%] text-center">#</th>
                                            <th className="py-3 px-4">Vehículo Solicitado</th>
                                            <th className="py-3 px-4 text-center">Frecuencia</th>
                                            <th className="py-3 px-4 text-right">Última Petición</th>
                                            <th className="py-3 px-4 w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {opportunities.map((opp, idx) => (
                                            <tr key={opp.key} className="hover:bg-purple-50/30 transition-colors group">
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`
                                                        inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                                                        ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                                          idx === 1 ? 'bg-slate-200 text-slate-600' : 
                                                          idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}
                                                    `}>
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-800 capitalize flex items-center gap-2">
                                                        {opp.brand} {opp.model}
                                                        {opp.year && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                {opp.year}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-bold text-purple-700">
                                                            {opp.request_count}
                                                        </span>
                                                        <span className="text-[10px] text-purple-400 uppercase font-medium">Leads</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right text-xs text-slate-500">
                                                    {new Date(opp.last_requested_at).toLocaleDateString(undefined, { 
                                                        weekday: 'short', 
                                                        year: 'numeric', 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button className="text-slate-300 hover:text-purple-600 transition-colors" title="Ver detalles">
                                                        <Search className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}