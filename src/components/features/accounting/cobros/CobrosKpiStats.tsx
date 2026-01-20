import { 
    Wallet, 
    CalendarCheck, 
    Activity,
    PieChart
} from "lucide-react";
import { ResumenCobros } from "@/types/cobros.types";

interface CobrosKpiStatsProps {
    data: ResumenCobros | null;
    loading: boolean;
}

export function CobrosKpiStats({ data, loading }: CobrosKpiStatsProps) {
    
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    // Calcular total para porcentajes
    const totalDistribucion = Object.values(data.distribucionPorTipo).reduce((a, b) => a + b, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            
            {/* 1. Recaudación Total */}
            <div className="md:col-span-1 p-5 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Wallet className="h-20 w-20 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-800 uppercase">Total Recaudado</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900">{formatMoney(data.totalRecaudado)}</h3>
                    <p className="text-xs text-emerald-700 font-medium mt-1">Ingresos registrados</p>
                </div>
            </div>

            {/* 2. Recaudación Mes Actual */}
            <div className="md:col-span-1 p-5 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CalendarCheck className="h-20 w-20 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                            <CalendarCheck className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-blue-800 uppercase">Este Mes</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900">{formatMoney(data.totalMesActual)}</h3>
                    <p className="text-xs text-blue-700 font-medium mt-1">Gestión del periodo en curso</p>
                </div>
            </div>

            {/* 3. Transacciones */}
            <div className="md:col-span-1 p-5 rounded-xl border border-violet-100 bg-violet-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity className="h-20 w-20 text-violet-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
                            <Activity className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-violet-800 uppercase">Movimientos</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900">{data.cantidadTransacciones}</h3>
                    <p className="text-xs text-violet-700 font-medium mt-1">Pagos procesados</p>
                </div>
            </div>

            {/* 4. Distribución (Barras) */}
            <div className="md:col-span-1 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                    <PieChart className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Origen de Fondos</span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[100px] pr-2 scrollbar-thin">
                    {Object.entries(data.distribucionPorTipo).map(([tipo, monto]) => (
                        <div key={tipo}>
                            <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-1">
                                <span className="truncate max-w-[120px]" title={tipo}>{tipo}</span>
                                <span>{((monto/totalDistribucion)*100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-slate-800 rounded-full" 
                                    style={{ width: `${(monto/totalDistribucion)*100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}