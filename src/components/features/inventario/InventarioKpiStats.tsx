import { 
    CarFront, 
    CheckCircle2, 
    XCircle, 
    LayoutList 
} from "lucide-react";
import { ResumenInventario } from "@/types/inventario.types";

interface InventarioKpiStatsProps {
    data: ResumenInventario | null;
    loading: boolean;
}

export function InventarioKpiStats({ data, loading }: InventarioKpiStatsProps) {
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
            
            {/* Total Vehículos */}
            <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CarFront className="h-24 w-24 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                            <LayoutList className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                            Parque Automotor
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.totalVehiculosRegistrados}
                    </h3>
                    <p className="text-sm text-blue-700 font-medium mt-2">
                        Total histórico registrado
                    </p>
                </div>
            </div>

            {/* Activos / Stock */}
            <div className="p-6 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="h-24 w-24 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <CarFront className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
                            Disponibles (Stock)
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.totalActivos}
                    </h3>
                    <p className="text-sm text-emerald-700 font-medium mt-2">
                        Vehículos listos para venta
                    </p>
                </div>
            </div>

            {/* Bajas */}
            <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <XCircle className="h-24 w-24 text-slate-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            Dados de Baja / Vendidos
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.totalBaja}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-2">
                        Fuera de inventario activo
                    </p>
                </div>
            </div>

        </div>
    );
}