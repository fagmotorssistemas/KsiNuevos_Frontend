import { Clock, Users, UserCheck, CalendarRange } from "lucide-react";
import { ResumenMarcaciones } from "@/types/marcaciones.types";

interface MarcacionesKpiStatsProps {
    data: ResumenMarcaciones | null;
    loading: boolean;
}

function formatPeriodo(desde?: string, hasta?: string) {
    if (!desde && !hasta) return "Periodo del reporte";
    if (desde && hasta) return `${desde} → ${hasta}`;
    return desde || hasta || "Periodo del reporte";
}

export function MarcacionesKpiStats({ data, loading }: MarcacionesKpiStatsProps) {
    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Users className="h-24 w-24 text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                            Usuarios
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.totalUsuarios}
                    </h3>
                    <p className="text-sm text-blue-700 font-medium mt-2">
                        En el reloj biométrico
                    </p>
                </div>
            </div>

            <div className="p-6 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <UserCheck className="h-24 w-24 text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <UserCheck className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
                            Con marcaciones
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.usuariosConMarcaciones}
                    </h3>
                    <p className="text-sm text-emerald-700 font-medium mt-2">
                        Personas con registros en el periodo
                    </p>
                </div>
            </div>

            <div className="p-6 rounded-xl border border-violet-100 bg-violet-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock className="h-24 w-24 text-violet-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-violet-800 uppercase tracking-wide">
                            Total marcaciones
                        </span>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                        {data.totalMarcaciones}
                    </h3>
                    <p className="text-sm text-violet-700 font-medium mt-2">
                        Entradas y salidas registradas
                    </p>
                </div>
            </div>

            <div className="p-6 rounded-xl border border-amber-100 bg-amber-50/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CalendarRange className="h-24 w-24 text-amber-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                            <CalendarRange className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                            Periodo
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                        {formatPeriodo(data.desde, data.hasta)}
                    </h3>
                    <p className="text-sm text-amber-700 font-medium mt-2">
                        Rango consultado en el backend
                    </p>
                </div>
            </div>
        </div>
    );
}
