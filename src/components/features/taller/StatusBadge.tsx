import { TallerEstadoOrden } from "@/types/taller";

interface StatusBadgeProps {
    status: TallerEstadoOrden;
    className?: string;
}

const STATUS_CONFIG: Record<TallerEstadoOrden, { label: string; color: string }> = {
    recepcion: { label: "Recepción", color: "bg-slate-100 text-slate-600 border-slate-200" },
    presupuesto: { label: "Presupuesto", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    en_cola: { label: "En Cola", color: "bg-orange-50 text-orange-600 border-orange-200" },
    en_proceso: { label: "En Proceso", color: "bg-blue-50 text-blue-600 border-blue-200" },
    control_calidad: { label: "Calidad", color: "bg-purple-50 text-purple-600 border-purple-200" },
    terminado: { label: "Terminado", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    entregado: { label: "Entregado", color: "bg-slate-900 text-white border-slate-900" },
    cancelado: { label: "Cancelado", color: "bg-red-50 text-red-600 border-red-200" },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.recepcion;

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.color} uppercase tracking-wide ${className}`}>
            {config.label}
        </span>
    );
}