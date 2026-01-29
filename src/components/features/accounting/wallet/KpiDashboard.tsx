import { 
    DollarSign, 
    AlertTriangle, 
    CheckCircle2, 
    TrendingDown,
    ArrowRight,
    Filter
} from "lucide-react";
import { KpiCartera } from "@/types/wallet.types";

interface KpiDashboardProps {
    data: KpiCartera | null;
    loading: boolean;
    // Props nuevas para conectar con el filtro
    currentFilter: 'all' | 'vencidos' | 'aldia';
    onFilterChange: (mode: 'all' | 'vencidos' | 'aldia') => void;
}

export function KpiDashboard({ data, loading, currentFilter, onFilterChange }: KpiDashboardProps) {
    // Helper para formatear dinero
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    // Configuración de las tarjetas
    const cards = [
        {
            id: 'all',
            label: "Total en Cartera",
            value: formatMoney(data.totalCartera),
            subtext: `${data.cantidadClientesConDeuda} clientes con saldo`,
            icon: DollarSign,
            color: "text-slate-900",
            bg: "bg-white",
            border: "border-slate-200",
            activeClass: "ring-2 ring-slate-400 bg-slate-50",
            actionText: "Ver todos"
        },
        {
            id: 'vencidos',
            label: "Cartera Vencida",
            value: formatMoney(data.carteraVencida),
            subtext: "Requiere gestión inmediata",
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
            activeClass: "ring-2 ring-red-400 bg-red-100",
            actionText: "Filtrar morosos"
        },
        {
            id: 'aldia',
            label: "Cartera Vigente",
            value: formatMoney(data.carteraVigente),
            subtext: "Dentro del plazo",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            activeClass: "ring-2 ring-emerald-400 bg-emerald-100",
            actionText: "Filtrar al día"
        },
        {
            id: 'stats', // Este no filtra, es informativo
            label: "Índice de Morosidad",
            value: `${data.porcentajeMorosidad}%`,
            subtext: "Del total prestado",
            icon: TrendingDown,
            color: data.porcentajeMorosidad > 10 ? "text-red-600" : "text-slate-600",
            bg: "bg-white",
            border: data.porcentajeMorosidad > 10 ? "border-red-200" : "border-slate-200",
            activeClass: "", // No tiene estado activo seleccionable
            actionText: null
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, idx) => {
                // Verificamos si esta tarjeta es la que está activa actualmente
                // Nota: card.id debe coincidir con los valores de filterMode ('all', 'vencidos', 'aldia')
                const isActive = currentFilter === card.id;
                const isClickable = card.actionText !== null;

                return (
                    <div 
                        key={idx}
                        onClick={() => isClickable && onFilterChange(card.id as any)}
                        className={`
                            relative p-5 rounded-xl border transition-all duration-200
                            ${isActive ? card.activeClass : `${card.bg} ${card.border} hover:shadow-md`}
                            ${isClickable ? 'cursor-pointer hover:-translate-y-1' : ''}
                        `}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 rounded-lg ${card.bg === 'bg-white' ? 'bg-slate-50' : 'bg-white bg-opacity-60'}`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                            
                            {/* Chip decorativo para alerta */}
                            {idx === 1 && (
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            )}

                            {/* Indicador de filtro activo */}
                            {isActive && (
                                <span className="absolute top-5 right-5 h-2 w-2 rounded-full bg-slate-900 ring-4 ring-white/50" />
                            )}
                        </div>
                        
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
                            <h3 className={`text-2xl font-bold tracking-tight ${card.color}`}>
                                {card.value}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2 font-medium">
                                {card.subtext}
                            </p>
                        </div>

                        {/* Botoncito/Acción visual al final */}
                        {isClickable && (
                            <div className={`
                                mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold
                                ${isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}
                            `}>
                                <span className="flex items-center gap-1.5">
                                    <Filter className="h-3 w-3" />
                                    {isActive ? 'Filtro aplicado' : card.actionText}
                                </span>
                                {isActive ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-900" />
                                ) : (
                                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}