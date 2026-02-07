import { LucideIcon } from "lucide-react";

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string; // Ej: "bg-blue-500"
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
}

export function KpiCard({ title, value, icon: Icon, color, subtitle }: KpiCardProps) {
    // Extraemos el color base para el fondo suave del icono (ej: bg-blue-500 -> text-blue-500 bg-blue-50)
    // Nota: Esto asume que pasas clases de Tailwind completas.
    // Para simplificar, usaremos el color pasado para el fondo del icono y texto blanco.

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
            <div className="flex flex-col">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                        {subtitle}
                    </p>
                )}
            </div>
            
            <div className={`p-3 rounded-xl shadow-sm ${color} text-white`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    );
}