import { 
    Car, 
    CalendarCheck, 
    Trophy,
    BarChart3
} from "lucide-react";
import { ResumenVentas } from "@/types/ventas.types";

interface VentasKpiStatsProps {
    data: ResumenVentas | null;
    loading: boolean;
}

export function VentasKpiStats({ data, loading }: VentasKpiStatsProps) {
    
    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    // Calcular el total para los porcentajes de la gráfica
    const totalTipos = Object.values(data.distribucionPorTipo).reduce((a, b) => a + b, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            
            {/* 1. Total Histórico */}
            <div className="md:col-span-1 p-5 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Car className="h-20 w-20 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                            <Car className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-blue-800 uppercase">Total Unidades</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900">{data.totalUnidadesVendidas}</h3>
                    <p className="text-xs text-blue-700 font-medium mt-1">Vehículos entregados</p>
                </div>
            </div>

            {/* 2. Ventas Mes Actual */}
            <div className="md:col-span-1 p-5 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CalendarCheck className="h-20 w-20 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                            <CalendarCheck className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-800 uppercase">Mes Actual</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900">{data.totalVentasMesActual}</h3>
                    <p className="text-xs text-emerald-700 font-medium mt-1">Ventas este periodo</p>
                </div>
            </div>

            {/* 3. Marca Top */}
            <div className="md:col-span-1 p-5 rounded-xl border border-amber-100 bg-amber-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="h-20 w-20 text-amber-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-amber-800 uppercase">Marca Líder</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 truncate" title={data.topMarca}>
                        {data.topMarca}
                    </h3>
                    <p className="text-xs text-amber-700 font-medium mt-1">Más vendida</p>
                </div>
            </div>

            {/* 4. Distribución (Gráfico Simple) */}
            <div className="md:col-span-1 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Distribución</span>
                </div>
                <div className="space-y-3">
                    {Object.entries(data.distribucionPorTipo).slice(0, 3).map(([tipo, cantidad]) => (
                        <div key={tipo}>
                            <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-1">
                                <span>{tipo}</span>
                                <span>{cantidad} ({((cantidad/totalTipos)*100).toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-slate-800 rounded-full" 
                                    style={{ width: `${(cantidad/totalTipos)*100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}