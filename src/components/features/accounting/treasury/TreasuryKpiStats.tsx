import { 
    Landmark, 
    Wallet, 
    TrendingUp 
} from "lucide-react";
import { ResumenTesoreria } from "@/types/treasury.types";

interface TreasuryKpiStatsProps {
    data: ResumenTesoreria | null;
    loading: boolean;
}

export function TreasuryKpiStats({ data, loading }: TreasuryKpiStatsProps) {
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2
        }).format(amount);
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[1, 2].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Tarjeta de Liquidez Total */}
            <div className="p-6 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="h-24 w-24 text-emerald-600" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
                            Liquidez Total Disponible
                        </span>
                    </div>
                    
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {formatMoney(data.totalEnBancos)}
                    </h3>
                    <p className="text-sm text-emerald-700 font-medium mt-2">
                        En cuentas bancarias al día de hoy
                    </p>
                </div>
            </div>

            {/* Tarjeta de Resumen de Cuentas */}
            <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Landmark className="h-24 w-24 text-blue-600" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                            <Landmark className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                            Estructura Financiera
                        </span>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                            {data.cantidadCuentasActivas}
                        </h3>
                        <span className="text-lg text-slate-500 font-medium">Cuentas Activas</span>
                    </div>
                    <p className="text-sm text-blue-700 font-medium mt-2">
                        Registradas en la empresa #162
                    </p>
                </div>
            </div>
        </div>
    );
}