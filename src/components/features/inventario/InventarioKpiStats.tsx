import { 
    CarFront, 
    CheckCircle2, 
    XCircle 
} from "lucide-react";
import { ResumenInventario } from "@/types/inventario.types";

export type FilterType = 'all' | 'active' | 'baja';

interface InventarioKpiStatsProps {
    data: ResumenInventario | null;
    loading: boolean;
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export function InventarioKpiStats({ 
    data, 
    loading, 
    activeFilter, 
    onFilterChange 
}: InventarioKpiStatsProps) {

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    // Clases comunes para las tarjetas interactivas
    const cardBaseClass = "p-6 rounded-xl border shadow-sm relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md transform hover:-translate-y-1";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            
            {/* 1. CARD TOTAL (Filtro 'all') */}
            <div 
                onClick={() => onFilterChange('all')}
                className={`${cardBaseClass} ${
                    activeFilter === 'all' 
                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" 
                        : "bg-white border-slate-200 hover:border-blue-300"
                }`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CarFront className="h-24 w-24 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${activeFilter === 'all' ? 'bg-blue-200 text-blue-800' : 'bg-blue-50 text-blue-600'}`}>
                            <CarFront className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            Total Registrados
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.totalVehiculosRegistrados}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-2">
                        Inventario histórico completo
                    </p>
                </div>
            </div>

            {/* 2. CARD ACTIVOS (Filtro 'active') */}
            <div 
                onClick={() => onFilterChange('active')}
                className={`${cardBaseClass} ${
                    activeFilter === 'active' 
                        ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                        : "bg-white border-slate-200 hover:border-emerald-300"
                }`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="h-24 w-24 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${activeFilter === 'active' ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-50 text-emerald-600'}`}>
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
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

            {/* 3. CARD BAJAS (Filtro 'baja') */}
            <div 
                onClick={() => onFilterChange('baja')}
                className={`${cardBaseClass} ${
                    activeFilter === 'baja' 
                        ? "bg-slate-100 border-slate-500 ring-1 ring-slate-500" 
                        : "bg-white border-slate-200 hover:border-slate-400"
                }`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <XCircle className="h-24 w-24 text-slate-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${activeFilter === 'baja' ? 'bg-slate-300 text-slate-800' : 'bg-slate-100 text-slate-700'}`}>
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