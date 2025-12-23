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
    MapPin
} from "lucide-react";
import type { VehicleStat, OpportunityStat } from "@/hooks/useVehicleStats";

interface VehicleStatsViewProps {
    stats: VehicleStat[];      
    opportunities: OpportunityStat[];
    isLoading: boolean;
    // Props para el filtro de estado
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
    const avgResponseRate = stats.length > 0 
        ? Math.round(stats.reduce((acc, curr) => acc + curr.response_rate, 0) / stats.length) 
        : 0;
    
    // Oportunidades
    const topOpportunity = opportunities.length > 0 ? opportunities[0] : null;

    if (isLoading) {
        return <div className="p-12 text-center text-slate-400 animate-pulse">Cargando análisis avanzado...</div>;
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
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Car className="h-4 w-4" />
                        Inventario
                    </button>
                    <button
                        onClick={() => setViewMode('demand')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                            viewMode === 'demand' 
                            ? 'bg-white text-purple-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Oportunidades
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

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Vehículo Estrella</span>
                                {topPerformer ? (
                                    <div className="font-bold text-slate-900 text-lg truncate max-w-[200px]">
                                        {topPerformer.brand} {topPerformer.model}
                                    </div>
                                ) : <span className="text-slate-400">-</span>}
                            </div>
                            {topPerformer && (
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-blue-600">{topPerformer.total_leads} Leads</span>
                                    <span className="block text-xs text-purple-600">{topPerformer.showroom_count} Visitas</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {stats.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                No hay actividad registrada para vehículos con estado <strong>{statusFilter}</strong> en este periodo.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                            <th className="py-3 px-4 w-[35%]">Vehículo</th>
                                            <th className="py-3 px-4 text-center">Estado</th>
                                            <th className="py-3 px-4 text-center bg-blue-50/50 text-blue-800">Leads</th>
                                            <th className="py-3 px-4 text-center bg-purple-50/50 text-purple-800">Showroom</th>
                                            <th className="py-3 px-4 text-center">Efectividad</th>
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
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                        car.status === 'disponible' ? 'bg-green-100 text-green-700' :
                                                        car.status === 'vendido' ? 'bg-slate-100 text-slate-500 line-through' :
                                                        car.status === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {car.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/30">
                                                    {car.total_leads}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-purple-700 bg-purple-50/30">
                                                    {car.showroom_count}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2 max-w-[100px] mx-auto">
                                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${car.response_rate > 80 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${car.response_rate}%` }} />
                                                        </div>
                                                        <span className="text-xs font-medium">{car.response_rate}%</span>
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
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white text-purple-600 rounded-lg shadow-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-purple-900">Demanda Insatisfecha</h4>
                                <p className="text-xs text-purple-700/80">Clientes buscando lo que no tienes en stock.</p>
                            </div>
                        </div>
                        {topOpportunity && (
                            <div className="text-right">
                                <span className="block text-xs text-purple-700 uppercase font-bold">Más Pedido</span>
                                <span className="font-bold text-purple-900 capitalize">{topOpportunity.brand} {topOpportunity.model}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="py-3 px-4 w-[10%] text-center">Rank</th>
                                        <th className="py-3 px-4">Vehículo Solicitado</th>
                                        <th className="py-3 px-4 text-center">Solicitudes</th>
                                        <th className="py-3 px-4 text-right">Último Lead</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {opportunities.map((opp, idx) => (
                                        <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                                            <td className="py-3 px-4 text-center text-slate-400 font-mono">#{idx + 1}</td>
                                            <td className="py-3 px-4 font-bold text-slate-800 capitalize">
                                                {opp.brand} {opp.model}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                                                    {opp.request_count}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-xs text-slate-500">
                                                {new Date(opp.last_requested_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}