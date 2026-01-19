import { 
    TrendingUp, 
    TrendingDown, 
    Scale,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { ResumenFinanciero } from "@/types/finanzas.types";

interface FinanzasKpiStatsProps {
    data: ResumenFinanciero | null;
    loading: boolean;
}

export function FinanzasKpiStats({ data, loading }: FinanzasKpiStatsProps) {
    
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2
        }).format(amount);
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            
            {/* Ingresos Totales */}
            <div className="p-6 rounded-xl border border-emerald-100 bg-white shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="h-24 w-24 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                            Ingresos Totales
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {formatMoney(data.totalIngresos)}
                    </h3>
                    <p className="text-xs text-emerald-600 font-medium mt-2">
                        Acumulado histórico positivo
                    </p>
                </div>
            </div>

            {/* Egresos Totales */}
            <div className="p-6 rounded-xl border border-red-100 bg-white shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingDown className="h-24 w-24 text-red-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-red-50 text-red-600">
                            <ArrowDownRight className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                            Egresos Totales
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {formatMoney(data.totalEgresos)}
                    </h3>
                    <p className="text-xs text-red-600 font-medium mt-2">
                        Gastos y salidas registrados
                    </p>
                </div>
            </div>

            {/* Balance Neto */}
            <div className={`p-6 rounded-xl border shadow-sm relative overflow-hidden ${
                data.balanceNeto >= 0 
                    ? 'border-blue-200 bg-blue-50/50' 
                    : 'border-orange-200 bg-orange-50/50'
            }`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Scale className={`h-24 w-24 ${data.balanceNeto >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`p-2 rounded-lg ${data.balanceNeto >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            <Scale className="h-5 w-5" />
                        </div>
                        <span className={`text-sm font-bold uppercase tracking-wide ${data.balanceNeto >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                            Balance Neto Real
                        </span>
                    </div>
                    <h3 className={`text-3xl font-bold tracking-tight ${data.balanceNeto >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                        {formatMoney(data.balanceNeto)}
                    </h3>
                    <p className={`text-xs font-medium mt-2 ${data.balanceNeto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {data.cantidadMovimientos} movimientos procesados
                    </p>
                </div>
            </div>

        </div>
    );
}