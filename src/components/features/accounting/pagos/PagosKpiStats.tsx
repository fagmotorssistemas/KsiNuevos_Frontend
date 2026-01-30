import { 
    Banknote, 
    AlertTriangle, 
    Briefcase,
    Receipt
} from "lucide-react";
import { ResumenPagos } from "@/types/pagos.types";

interface PagosKpiStatsProps {
    data: ResumenPagos | null;
    loading: boolean;
}

export function PagosKpiStats({ data, loading }: PagosKpiStatsProps) {
    
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
            
            {/* 1. Total Pagado */}
            <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Banknote className="h-20 w-20 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                            <Banknote className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-blue-800 uppercase">Total Pagado</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatMoney(data.totalPagado)}</h3>
                    <p className="text-xs text-blue-700 font-medium mt-1">Egresos registrados</p>
                </div>
            </div>

            {/* 2. Deuda por Vencer */}
            <div className="p-5 rounded-xl border border-red-100 bg-red-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="h-20 w-20 text-red-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-red-800 uppercase">Por Vencer</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatMoney(data.totalPorVencer)}</h3>
                    <p className="text-xs text-red-700 font-medium mt-1">Obligaciones pendientes</p>
                </div>
            </div>

            {/* 3. Proveedor Top */}
            <div className="p-5 rounded-xl border border-purple-100 bg-purple-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Briefcase className="h-20 w-20 text-purple-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-purple-800 uppercase">Proveedor Frecuente</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-tight" title={data.proveedorMasFrecuente}>
                        {data.proveedorMasFrecuente}
                    </h3>
                    <p className="text-xs text-purple-700 font-medium mt-1">Mayor volumen de facturas</p>
                </div>
            </div>

            {/* 4. Cantidad Transacciones */}

            {/* <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Receipt className="h-20 w-20 text-slate-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Movimientos</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900">{data.cantidadTransacciones}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Documentos procesados</p>
                </div>
            </div> */}

        </div>
    );
}